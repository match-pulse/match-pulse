-- v3.1.0 audit remediation: active-subscription limits and concurrency.
-- FND-019: a missing/inactive subscription must not become an unlimited plan.
-- FND-028: member/event limit checks must serialise with the insert.
--
-- Lock order: club_subscriptions -> club_invites / club_members / tournaments.
-- Invites and accepts both take the subscription lock before the invite row.

CREATE OR REPLACE FUNCTION public.invite_club_member(
    p_club_id UUID,
    p_email TEXT,
    p_role TEXT
) RETURNS TABLE (invite_id UUID, token TEXT)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_user_id UUID := public.require_club_role(p_club_id, ARRAY['OWNER', 'ADMIN']);
    v_role TEXT := upper(trim(p_role));
    v_email TEXT := lower(trim(p_email));
    v_limit INT;
    v_members INT;
    v_pending INT;
    v_token TEXT;
    v_invite_id UUID;
BEGIN
    IF v_role NOT IN ('ADMIN', 'STAFF', 'ANALYST') THEN
        RAISE EXCEPTION 'invalid club role';
    END IF;
    IF v_role = 'ADMIN' AND NOT public.has_club_role(p_club_id, ARRAY['OWNER']) THEN
        RAISE EXCEPTION 'only the owner can invite an admin';
    END IF;
    IF v_email IS NULL OR position('@' in v_email) < 2 THEN
        RAISE EXCEPTION 'valid email required';
    END IF;

    PERFORM 1
      FROM public.club_subscriptions
     WHERE club_id = p_club_id
       AND status = 'ACTIVE'
       FOR UPDATE;
    PERFORM public.require_entitlement(p_club_id, 'max_members');

    v_limit := public.entitlement_limit(p_club_id, 'max_members');
    SELECT count(*) INTO v_members FROM public.club_members WHERE club_id = p_club_id;
    SELECT count(*) INTO v_pending
      FROM public.club_invites
     WHERE club_id = p_club_id
       AND accepted_at IS NULL
       AND expires_at > NOW();

    IF v_limit IS NOT NULL AND v_members + v_pending >= v_limit THEN
        RAISE EXCEPTION 'member limit reached';
    END IF;

    v_token := replace(gen_random_uuid()::text, '-', '');

    UPDATE public.club_invites
       SET role = v_role,
           token = v_token,
           invited_by = v_user_id,
           expires_at = NOW() + INTERVAL '7 days',
           created_at = NOW()
     WHERE club_id = p_club_id
       AND lower(email) = v_email
       AND accepted_at IS NULL
     RETURNING id INTO v_invite_id;

    IF v_invite_id IS NULL THEN
        BEGIN
            INSERT INTO public.club_invites (club_id, email, role, token, invited_by)
            VALUES (p_club_id, v_email, v_role, v_token, v_user_id)
            RETURNING id INTO v_invite_id;
        EXCEPTION WHEN unique_violation THEN
            UPDATE public.club_invites
               SET role = v_role,
                   token = v_token,
                   invited_by = v_user_id,
                   expires_at = NOW() + INTERVAL '7 days',
                   created_at = NOW()
             WHERE club_id = p_club_id
               AND lower(email) = v_email
               AND accepted_at IS NULL
             RETURNING id INTO v_invite_id;
        END;
    END IF;

    INSERT INTO public.audit_events (actor_id, club_id, action, entity_type, entity_id, metadata)
    VALUES (v_user_id, p_club_id, 'club.member.invite', 'club', p_club_id,
            jsonb_build_object('role', v_role));

    invite_id := v_invite_id;
    token := v_token;
    RETURN NEXT;
END;
$$;

CREATE OR REPLACE FUNCTION public.accept_club_invite(p_token TEXT)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_user_id UUID := public.require_auth();
    v_email TEXT := lower(COALESCE(auth.jwt()->>'email', ''));
    v_club_id UUID;
    v_invite public.club_invites%ROWTYPE;
    v_limit INT;
    v_members INT;
BEGIN
    IF v_email = '' THEN
        RAISE EXCEPTION 'authenticated email required';
    END IF;

    SELECT club_id INTO v_club_id
      FROM public.club_invites
     WHERE token = p_token
       AND accepted_at IS NULL
       AND expires_at > NOW()
       AND lower(email) = v_email;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'invitation not found or expired';
    END IF;

    PERFORM 1
      FROM public.club_subscriptions
     WHERE club_id = v_club_id
       AND status = 'ACTIVE'
       FOR UPDATE;
    PERFORM public.require_entitlement(v_club_id, 'max_members');

    SELECT * INTO v_invite
      FROM public.club_invites
     WHERE token = p_token
       AND accepted_at IS NULL
       AND expires_at > NOW()
       AND lower(email) = v_email
       FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'invitation not found or expired';
    END IF;

    v_limit := public.entitlement_limit(v_invite.club_id, 'max_members');
    SELECT count(*) INTO v_members FROM public.club_members WHERE club_id = v_invite.club_id;

    IF v_limit IS NOT NULL AND v_members >= v_limit THEN
        RAISE EXCEPTION 'member limit reached';
    END IF;

    BEGIN
        INSERT INTO public.club_members (club_id, profile_id, role)
        VALUES (v_invite.club_id, v_user_id, v_invite.role);
    EXCEPTION WHEN unique_violation THEN
        RAISE EXCEPTION 'already a club member';
    END;

    UPDATE public.club_invites
       SET accepted_at = NOW()
     WHERE id = v_invite.id;

    INSERT INTO public.audit_events (actor_id, club_id, action, entity_type, entity_id, metadata)
    VALUES (v_user_id, v_invite.club_id, 'club.member.accept', 'club', v_invite.club_id,
            jsonb_build_object('role', v_invite.role));

    RETURN v_invite.club_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.create_club_event(
    p_club_id UUID,
    p_name TEXT,
    p_max_capacity INT,
    p_ticket_allocation INT DEFAULT 100,
    p_ticket_points INT DEFAULT 0
) RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_user_id UUID := public.require_club_role(p_club_id, ARRAY['OWNER', 'ADMIN', 'STAFF']);
    v_name TEXT := trim(p_name);
    v_limit INT;
    v_active INT;
    v_event_id UUID;
BEGIN
    IF v_name IS NULL OR length(v_name) = 0 THEN
        RAISE EXCEPTION 'event name required';
    END IF;
    IF p_max_capacity IS NULL OR p_max_capacity < 1 THEN
        RAISE EXCEPTION 'capacity must be positive';
    END IF;
    IF p_ticket_allocation IS NULL OR p_ticket_allocation < 0 THEN
        RAISE EXCEPTION 'ticket allocation must be non-negative';
    END IF;
    IF p_ticket_points IS NULL OR p_ticket_points < 0 THEN
        RAISE EXCEPTION 'ticket points must be non-negative';
    END IF;

    PERFORM 1
      FROM public.club_subscriptions
     WHERE club_id = p_club_id
       AND status = 'ACTIVE'
       FOR UPDATE;
    PERFORM public.require_entitlement(p_club_id, 'max_active_events');

    v_limit := public.entitlement_limit(p_club_id, 'max_active_events');
    SELECT count(*) INTO v_active
      FROM public.tournaments
     WHERE club_id = p_club_id
       AND status IN ('DRAFT', 'PUBLISHED');

    IF v_limit IS NOT NULL AND v_active >= v_limit THEN
        RAISE EXCEPTION 'active event limit reached';
    END IF;

    INSERT INTO public.tournaments (
        name, max_capacity, current_players, organizer_id, club_id,
        ticket_allocation, ticket_points, status, created_at, updated_at
    ) VALUES (
        v_name, p_max_capacity, 0, v_user_id, p_club_id,
        p_ticket_allocation, p_ticket_points, 'DRAFT', NOW(), NOW()
    )
    RETURNING id INTO v_event_id;

    INSERT INTO public.audit_events (actor_id, club_id, action, entity_type, entity_id, metadata)
    VALUES (v_user_id, p_club_id, 'event.create', 'tournament', v_event_id,
            jsonb_build_object('name', v_name, 'max_capacity', p_max_capacity));

    RETURN v_event_id;
END;
$$;
