-- FND-027: enforce subscription current_period_end with a 7-day grace.
--
-- At period end the subscription moves to PAST_DUE. Entitlements remain
-- available for 7 days after current_period_end, then are denied. A daily
-- pg_cron job moves ACTIVE subscriptions past their period end to PAST_DUE.

CREATE EXTENSION IF NOT EXISTS pg_cron;

CREATE OR REPLACE FUNCTION public.has_entitlement(p_club_id UUID, p_feature TEXT)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
    SELECT EXISTS (
        SELECT 1
          FROM public.club_subscriptions cs
          JOIN public.plan_entitlements pe ON pe.plan_code = cs.plan_code
         WHERE cs.club_id = p_club_id
           AND (
               cs.status = 'ACTIVE'
               OR (
                   cs.status = 'PAST_DUE'
                   AND cs.current_period_end IS NOT NULL
                   AND cs.current_period_end > NOW() - INTERVAL '7 days'
               )
           )
           AND pe.feature = p_feature
           AND pe.enabled
    );
$$;

CREATE OR REPLACE FUNCTION public.entitlement_limit(p_club_id UUID, p_feature TEXT)
RETURNS INT
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
    SELECT pe.limit_value
      FROM public.club_subscriptions cs
      JOIN public.plan_entitlements pe ON pe.plan_code = cs.plan_code
     WHERE cs.club_id = p_club_id
       AND (
           cs.status = 'ACTIVE'
           OR (
               cs.status = 'PAST_DUE'
               AND cs.current_period_end IS NOT NULL
               AND cs.current_period_end > NOW() - INTERVAL '7 days'
           )
       )
       AND pe.feature = p_feature
       AND pe.enabled;
$$;

CREATE OR REPLACE FUNCTION public.expire_subscriptions()
RETURNS INT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_count INT;
BEGIN
    WITH expired AS (
        UPDATE public.club_subscriptions
           SET status = 'PAST_DUE',
               updated_at = NOW()
         WHERE status = 'ACTIVE'
           AND current_period_end IS NOT NULL
           AND current_period_end <= NOW()
        RETURNING club_id
    )
    INSERT INTO public.audit_events (actor_id, club_id, action, entity_type, entity_id, metadata)
    SELECT NULL, club_id, 'subscription.expire', 'club', club_id,
           jsonb_build_object('status', 'PAST_DUE')
      FROM expired;

    GET DIAGNOSTICS v_count = ROW_COUNT;
    RETURN v_count;
END;
$$;

REVOKE ALL ON FUNCTION public.expire_subscriptions() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.expire_subscriptions() TO service_role;

DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'expire-subscriptions') THEN
        PERFORM cron.unschedule('expire-subscriptions');
    END IF;

    PERFORM cron.schedule(
        'expire-subscriptions',
        '0 3 * * *',
        'SELECT public.expire_subscriptions();'
    );
END;
$$;

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
    IF p_ticket_points > 500 THEN
        RAISE EXCEPTION 'ticket points cannot exceed 500 per ticket';
    END IF;
    IF p_ticket_points::BIGINT * p_ticket_allocation::BIGINT > 10000 THEN
        RAISE EXCEPTION 'ticket points cannot exceed 10000 per event';
    END IF;

    PERFORM 1
      FROM public.club_subscriptions
     WHERE club_id = p_club_id
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

DROP FUNCTION IF EXISTS public.admin_list_clubs();

CREATE OR REPLACE FUNCTION public.admin_list_clubs()
RETURNS TABLE (
    club_id UUID,
    name TEXT,
    slug TEXT,
    plan_code TEXT,
    subscription_status TEXT,
    current_period_end TIMESTAMPTZ,
    created_at TIMESTAMPTZ
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
    IF NOT public.is_platform_admin() THEN
        RAISE EXCEPTION 'platform admin authorization required';
    END IF;

    RETURN QUERY
        SELECT c.id, c.name, c.slug, cs.plan_code, cs.status, cs.current_period_end, c.created_at
          FROM public.clubs c
          LEFT JOIN public.club_subscriptions cs ON cs.club_id = c.id
         ORDER BY c.created_at DESC;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_list_clubs() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.admin_list_clubs() TO authenticated;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO service_role;
