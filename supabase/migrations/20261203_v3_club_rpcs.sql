-- v3.0.0 club, membership, plan, event and match RPCs.
-- All functions are SECURITY DEFINER with explicit membership/entitlement checks.

-- ---------------------------------------------------------------------------
-- Club onboarding and context
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.create_club(
    p_name TEXT,
    p_slug TEXT DEFAULT NULL,
    p_plan_code TEXT DEFAULT 'STARTER'
) RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_user_id UUID := public.require_auth();
    v_name TEXT := trim(p_name);
    v_slug TEXT;
    v_base TEXT;
    v_club_id UUID;
    v_plan TEXT := upper(trim(p_plan_code));
    v_attempt INT;
BEGIN
    IF v_name IS NULL OR length(v_name) = 0 THEN
        RAISE EXCEPTION 'club name required';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM public.plans WHERE code = v_plan AND active) THEN
        RAISE EXCEPTION 'invalid or inactive plan';
    END IF;

    IF p_slug IS NOT NULL AND length(trim(p_slug)) > 0 THEN
        v_slug := lower(trim(p_slug));
        IF v_slug !~ '^[a-z0-9]+(-[a-z0-9]+)*$' THEN
            RAISE EXCEPTION 'invalid club slug';
        END IF;

        BEGIN
            INSERT INTO public.clubs (name, slug, created_by)
            VALUES (v_name, v_slug, v_user_id)
            RETURNING id INTO v_club_id;
        EXCEPTION WHEN unique_violation THEN
            RAISE EXCEPTION 'club slug already exists';
        END;
    ELSE
        v_base := lower(regexp_replace(v_name, '[^a-zA-Z0-9]+', '-', 'g'));
        v_base := trim(both '-' from v_base);
        IF length(v_base) = 0 THEN
            v_base := 'club';
        END IF;
        v_base := left(v_base, 40);

        FOR v_attempt IN 1..10 LOOP
            v_slug := v_base || '-' || substr(replace(gen_random_uuid()::text, '-', ''), 1, 6);

            BEGIN
                INSERT INTO public.clubs (name, slug, created_by)
                VALUES (v_name, v_slug, v_user_id)
                RETURNING id INTO v_club_id;
                EXIT;
            EXCEPTION WHEN unique_violation THEN
                v_club_id := NULL;
            END;
        END LOOP;

        IF v_club_id IS NULL THEN
            RAISE EXCEPTION 'could not allocate a club slug';
        END IF;
    END IF;

    INSERT INTO public.club_members (club_id, profile_id, role)
    VALUES (v_club_id, v_user_id, 'OWNER');

    INSERT INTO public.club_subscriptions (club_id, plan_code, status, current_period_end)
    VALUES (v_club_id, v_plan, 'ACTIVE', NOW() + INTERVAL '30 days');

    INSERT INTO public.audit_events (actor_id, club_id, action, entity_type, entity_id, metadata)
    VALUES (v_user_id, v_club_id, 'club.create', 'club', v_club_id,
            jsonb_build_object('name', v_name, 'slug', v_slug, 'plan', v_plan));

    RETURN v_club_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.update_club(
    p_club_id UUID,
    p_name TEXT,
    p_slug TEXT DEFAULT NULL
) RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_user_id UUID := public.require_club_role(p_club_id, ARRAY['OWNER', 'ADMIN']);
    v_name TEXT := trim(p_name);
    v_slug TEXT;
BEGIN
    IF v_name IS NULL OR length(v_name) = 0 THEN
        RAISE EXCEPTION 'club name required';
    END IF;

    IF p_slug IS NOT NULL AND length(trim(p_slug)) > 0 THEN
        v_slug := lower(trim(p_slug));
        IF v_slug !~ '^[a-z0-9]+(-[a-z0-9]+)*$' THEN
            RAISE EXCEPTION 'invalid club slug';
        END IF;

        BEGIN
            UPDATE public.clubs
               SET name = v_name, slug = v_slug, updated_at = NOW()
             WHERE id = p_club_id;
        EXCEPTION WHEN unique_violation THEN
            RAISE EXCEPTION 'club slug already exists';
        END;
    ELSE
        UPDATE public.clubs
           SET name = v_name, updated_at = NOW()
         WHERE id = p_club_id;
    END IF;

    INSERT INTO public.audit_events (actor_id, club_id, action, entity_type, entity_id, metadata)
    VALUES (v_user_id, p_club_id, 'club.update', 'club', p_club_id,
            jsonb_build_object('name', v_name));
END;
$$;

CREATE OR REPLACE FUNCTION public.list_my_clubs()
RETURNS TABLE (
    club_id UUID,
    name TEXT,
    slug TEXT,
    role TEXT,
    plan_code TEXT,
    subscription_status TEXT
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
    SELECT c.id,
           c.name,
           c.slug,
           cm.role,
           cs.plan_code,
           cs.status
      FROM public.club_members cm
      JOIN public.clubs c ON c.id = cm.club_id
      LEFT JOIN public.club_subscriptions cs ON cs.club_id = c.id
     WHERE cm.profile_id = auth.uid()
     ORDER BY c.name;
$$;

CREATE OR REPLACE FUNCTION public.get_club_context(p_club_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_role TEXT;
    v_name TEXT;
    v_slug TEXT;
    v_plan TEXT;
    v_status TEXT;
    v_entitlements JSONB;
BEGIN
    SELECT cm.role INTO v_role
      FROM public.club_members cm
     WHERE cm.club_id = p_club_id
       AND cm.profile_id = auth.uid();

    IF NOT FOUND THEN
        RAISE EXCEPTION 'club authorization required';
    END IF;

    SELECT c.name, c.slug, cs.plan_code, cs.status
      INTO v_name, v_slug, v_plan, v_status
      FROM public.clubs c
      LEFT JOIN public.club_subscriptions cs ON cs.club_id = c.id
     WHERE c.id = p_club_id;

    SELECT COALESCE(
               jsonb_object_agg(
                   pe.feature,
                   jsonb_build_object('enabled', pe.enabled, 'limit', pe.limit_value)
               ),
               '{}'::jsonb
           )
      INTO v_entitlements
      FROM public.club_subscriptions cs
      JOIN public.plan_entitlements pe ON pe.plan_code = cs.plan_code
     WHERE cs.club_id = p_club_id
       AND cs.status = 'ACTIVE';

    RETURN jsonb_build_object(
        'club', jsonb_build_object('id', p_club_id, 'name', v_name, 'slug', v_slug),
        'role', v_role,
        'plan', v_plan,
        'subscription_status', v_status,
        'entitlements', v_entitlements
    );
END;
$$;

CREATE OR REPLACE FUNCTION public.request_plan_change(
    p_club_id UUID,
    p_plan_code TEXT
) RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_user_id UUID := public.require_club_role(p_club_id, ARRAY['OWNER']);
    v_plan TEXT := upper(trim(p_plan_code));
    v_request_id UUID;
BEGIN
    IF NOT EXISTS (SELECT 1 FROM public.plans WHERE code = v_plan AND active) THEN
        RAISE EXCEPTION 'invalid or inactive plan';
    END IF;

    INSERT INTO public.club_plan_requests (club_id, requested_plan, requested_by)
    VALUES (p_club_id, v_plan, v_user_id)
    ON CONFLICT (club_id) WHERE status = 'PENDING'
    DO UPDATE SET requested_plan = EXCLUDED.requested_plan,
                  requested_by = EXCLUDED.requested_by,
                  created_at = NOW()
    RETURNING id INTO v_request_id;

    INSERT INTO public.audit_events (actor_id, club_id, action, entity_type, entity_id, metadata)
    VALUES (v_user_id, p_club_id, 'club.plan_request', 'club', p_club_id,
            jsonb_build_object('plan', v_plan, 'request_id', v_request_id));

    RETURN v_request_id;
END;
$$;

-- ---------------------------------------------------------------------------
-- Platform admin
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.admin_assign_plan(
    p_club_id UUID,
    p_plan_code TEXT,
    p_status TEXT DEFAULT 'ACTIVE'
) RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_user_id UUID := public.require_auth();
    v_plan TEXT := upper(trim(p_plan_code));
    v_status TEXT := upper(trim(p_status));
BEGIN
    IF NOT public.is_platform_admin() THEN
        RAISE EXCEPTION 'platform admin authorization required';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM public.plans WHERE code = v_plan AND active) THEN
        RAISE EXCEPTION 'invalid or inactive plan';
    END IF;
    IF v_status NOT IN ('ACTIVE', 'PAST_DUE', 'CANCELED') THEN
        RAISE EXCEPTION 'invalid subscription status';
    END IF;

    INSERT INTO public.club_subscriptions (
        club_id, plan_code, status, started_at, current_period_end, updated_at
    ) VALUES (
        p_club_id, v_plan, v_status, NOW(), NOW() + INTERVAL '30 days', NOW()
    )
    ON CONFLICT (club_id) DO UPDATE
        SET plan_code = EXCLUDED.plan_code,
            status = EXCLUDED.status,
            current_period_end = EXCLUDED.current_period_end,
            updated_at = NOW();

    UPDATE public.club_plan_requests
       SET status = 'APPROVED',
           resolved_by = v_user_id,
           resolved_at = NOW()
     WHERE club_id = p_club_id
       AND status = 'PENDING';

    INSERT INTO public.audit_events (actor_id, club_id, action, entity_type, entity_id, metadata)
    VALUES (v_user_id, p_club_id, 'admin.plan.assign', 'club', p_club_id,
            jsonb_build_object('plan', v_plan, 'status', v_status));
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_set_subscription_status(
    p_club_id UUID,
    p_status TEXT
) RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_user_id UUID := public.require_auth();
    v_status TEXT := upper(trim(p_status));
BEGIN
    IF NOT public.is_platform_admin() THEN
        RAISE EXCEPTION 'platform admin authorization required';
    END IF;
    IF v_status NOT IN ('ACTIVE', 'PAST_DUE', 'CANCELED') THEN
        RAISE EXCEPTION 'invalid subscription status';
    END IF;

    UPDATE public.club_subscriptions
       SET status = v_status, updated_at = NOW()
     WHERE club_id = p_club_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'club subscription not found';
    END IF;

    INSERT INTO public.audit_events (actor_id, club_id, action, entity_type, entity_id, metadata)
    VALUES (v_user_id, p_club_id, 'admin.subscription.status', 'club', p_club_id,
            jsonb_build_object('status', v_status));
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_list_clubs()
RETURNS TABLE (
    club_id UUID,
    name TEXT,
    slug TEXT,
    plan_code TEXT,
    subscription_status TEXT,
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
        SELECT c.id, c.name, c.slug, cs.plan_code, cs.status, c.created_at
          FROM public.clubs c
          LEFT JOIN public.club_subscriptions cs ON cs.club_id = c.id
         ORDER BY c.created_at DESC;
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_list_audit(p_limit INT DEFAULT 100)
RETURNS TABLE (
    id UUID,
    actor_username TEXT,
    action TEXT,
    entity_type TEXT,
    entity_id UUID,
    club_id UUID,
    metadata JSONB,
    created_at TIMESTAMPTZ
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_limit INT := GREATEST(1, LEAST(COALESCE(p_limit, 100), 500));
BEGIN
    IF NOT public.is_platform_admin() THEN
        RAISE EXCEPTION 'platform admin authorization required';
    END IF;

    RETURN QUERY
        SELECT a.id, p.username, a.action, a.entity_type, a.entity_id, a.club_id, a.metadata, a.created_at
          FROM public.audit_events a
          LEFT JOIN public.profiles p ON p.id = a.actor_id
         ORDER BY a.created_at DESC
         LIMIT v_limit;
END;
$$;

-- ---------------------------------------------------------------------------
-- Membership
-- ---------------------------------------------------------------------------

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

    v_token := encode(gen_random_bytes(16), 'hex');

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
    v_invite public.club_invites%ROWTYPE;
    v_limit INT;
    v_members INT;
BEGIN
    IF v_email = '' THEN
        RAISE EXCEPTION 'authenticated email required';
    END IF;

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

CREATE OR REPLACE FUNCTION public.list_club_members(p_club_id UUID)
RETURNS TABLE (
    profile_id UUID,
    username TEXT,
    role TEXT,
    created_at TIMESTAMPTZ
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
    PERFORM public.require_club_role(p_club_id, ARRAY['OWNER', 'ADMIN', 'STAFF', 'ANALYST']);

    RETURN QUERY
        SELECT cm.profile_id, p.username, cm.role, cm.created_at
          FROM public.club_members cm
          JOIN public.profiles p ON p.id = cm.profile_id
         WHERE cm.club_id = p_club_id
         ORDER BY cm.created_at;
END;
$$;

CREATE OR REPLACE FUNCTION public.set_club_member_role(
    p_club_id UUID,
    p_profile_id UUID,
    p_role TEXT
) RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_user_id UUID := public.require_club_role(p_club_id, ARRAY['OWNER', 'ADMIN']);
    v_role TEXT := upper(trim(p_role));
    v_target_role TEXT;
    v_caller_is_owner BOOLEAN := public.has_club_role(p_club_id, ARRAY['OWNER']);
BEGIN
    IF v_role NOT IN ('ADMIN', 'STAFF', 'ANALYST') THEN
        RAISE EXCEPTION 'invalid club role';
    END IF;

    SELECT role INTO v_target_role
      FROM public.club_members
     WHERE club_id = p_club_id AND profile_id = p_profile_id
       FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'club member not found';
    END IF;
    IF v_target_role = 'OWNER' THEN
        RAISE EXCEPTION 'cannot change the owner role';
    END IF;
    IF NOT v_caller_is_owner AND (v_target_role = 'ADMIN' OR v_role = 'ADMIN') THEN
        RAISE EXCEPTION 'only the owner can manage admins';
    END IF;

    UPDATE public.club_members
       SET role = v_role
     WHERE club_id = p_club_id AND profile_id = p_profile_id;

    INSERT INTO public.audit_events (actor_id, club_id, action, entity_type, entity_id, metadata)
    VALUES (v_user_id, p_club_id, 'club.member.role', 'profile', p_profile_id,
            jsonb_build_object('role', v_role));
END;
$$;

CREATE OR REPLACE FUNCTION public.remove_club_member(
    p_club_id UUID,
    p_profile_id UUID
) RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_user_id UUID := public.require_club_role(p_club_id, ARRAY['OWNER', 'ADMIN']);
    v_target_role TEXT;
    v_caller_is_owner BOOLEAN := public.has_club_role(p_club_id, ARRAY['OWNER']);
BEGIN
    SELECT role INTO v_target_role
      FROM public.club_members
     WHERE club_id = p_club_id AND profile_id = p_profile_id
       FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'club member not found';
    END IF;
    IF v_target_role = 'OWNER' THEN
        RAISE EXCEPTION 'cannot remove the owner';
    END IF;
    IF NOT v_caller_is_owner AND v_target_role = 'ADMIN' THEN
        RAISE EXCEPTION 'only the owner can remove an admin';
    END IF;

    DELETE FROM public.club_members
     WHERE club_id = p_club_id AND profile_id = p_profile_id;

    INSERT INTO public.audit_events (actor_id, club_id, action, entity_type, entity_id, metadata)
    VALUES (v_user_id, p_club_id, 'club.member.remove', 'profile', p_profile_id, '{}'::jsonb);
END;
$$;

-- ---------------------------------------------------------------------------
-- Events and matches
-- ---------------------------------------------------------------------------

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

CREATE OR REPLACE FUNCTION public.update_club_event(
    p_event_id UUID,
    p_name TEXT,
    p_max_capacity INT,
    p_ticket_allocation INT,
    p_ticket_points INT
) RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_user_id UUID := public.require_event_role(p_event_id, ARRAY['OWNER', 'ADMIN', 'STAFF']);
    v_club_id UUID;
    v_players INT;
    v_tickets INT;
    v_name TEXT := trim(p_name);
BEGIN
    SELECT club_id, current_players INTO v_club_id, v_players
      FROM public.tournaments
     WHERE id = p_event_id
       FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'event not found';
    END IF;
    IF v_name IS NULL OR length(v_name) = 0 THEN
        RAISE EXCEPTION 'event name required';
    END IF;
    IF p_max_capacity IS NULL OR p_max_capacity < v_players THEN
        RAISE EXCEPTION 'capacity cannot be below current players';
    END IF;
    IF p_ticket_allocation IS NULL OR p_ticket_allocation < 0
       OR p_ticket_points IS NULL OR p_ticket_points < 0 THEN
        RAISE EXCEPTION 'invalid ticket settings';
    END IF;

    SELECT count(*) INTO v_tickets FROM public.tickets WHERE tournament_id = p_event_id;
    IF p_ticket_allocation < v_tickets THEN
        RAISE EXCEPTION 'ticket allocation cannot be below sold tickets';
    END IF;

    UPDATE public.tournaments
       SET name = v_name,
           max_capacity = p_max_capacity,
           ticket_allocation = p_ticket_allocation,
           ticket_points = p_ticket_points,
           updated_at = NOW()
     WHERE id = p_event_id;

    INSERT INTO public.audit_events (actor_id, club_id, action, entity_type, entity_id, metadata)
    VALUES (v_user_id, v_club_id, 'event.update', 'tournament', p_event_id,
            jsonb_build_object('name', v_name, 'max_capacity', p_max_capacity));
END;
$$;

CREATE OR REPLACE FUNCTION public.publish_club_event(p_event_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_user_id UUID := public.require_event_role(p_event_id, ARRAY['OWNER', 'ADMIN', 'STAFF']);
    v_club_id UUID;
    v_status TEXT;
    v_types INT;
BEGIN
    SELECT club_id, status INTO v_club_id, v_status
      FROM public.tournaments
     WHERE id = p_event_id
       FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'event not found';
    END IF;
    IF v_status = 'CANCELLED' THEN
        RAISE EXCEPTION 'cannot publish a cancelled event';
    END IF;

    SELECT count(*) INTO v_types
      FROM public.ticket_types
     WHERE event_id = p_event_id
       AND active
       AND allocation > 0;

    IF v_types = 0 THEN
        RAISE EXCEPTION 'at least one active ticket type is required';
    END IF;

    UPDATE public.tournaments
       SET status = 'PUBLISHED',
           published_at = COALESCE(published_at, NOW()),
           updated_at = NOW()
     WHERE id = p_event_id;

    INSERT INTO public.audit_events (actor_id, club_id, action, entity_type, entity_id, metadata)
    VALUES (v_user_id, v_club_id, 'event.publish', 'tournament', p_event_id, '{}'::jsonb);
END;
$$;

CREATE OR REPLACE FUNCTION public.create_club_match(
    p_event_id UUID,
    p_home_team TEXT,
    p_away_team TEXT,
    p_kickoff TIMESTAMPTZ,
    p_prediction_enabled BOOLEAN DEFAULT FALSE
) RETURNS TABLE (match_id UUID, market_id UUID)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_user_id UUID := public.require_event_role(p_event_id, ARRAY['OWNER', 'ADMIN', 'STAFF']);
    v_club_id UUID;
    v_status TEXT;
    v_match_id UUID;
    v_market_id UUID;
BEGIN
    SELECT club_id, status INTO v_club_id, v_status
      FROM public.tournaments
     WHERE id = p_event_id
       FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'event not found';
    END IF;
    IF v_status IN ('FINISHED', 'CANCELLED') THEN
        RAISE EXCEPTION 'event is closed';
    END IF;
    IF p_home_team IS NULL OR length(trim(p_home_team)) = 0
       OR p_away_team IS NULL OR length(trim(p_away_team)) = 0 THEN
        RAISE EXCEPTION 'both teams are required';
    END IF;
    IF p_kickoff IS NULL THEN
        RAISE EXCEPTION 'kickoff time required';
    END IF;

    IF p_prediction_enabled THEN
        PERFORM public.require_entitlement(v_club_id, 'prediction_markets');
    END IF;

    INSERT INTO public.matches (
        tournament_id, home_team, away_team, status, kickoff_time,
        home_score, away_score, prediction_enabled
    ) VALUES (
        p_event_id, trim(p_home_team), trim(p_away_team), 'SCHEDULED', p_kickoff,
        0, 0, COALESCE(p_prediction_enabled, FALSE)
    )
    RETURNING id INTO v_match_id;

    IF p_prediction_enabled THEN
        INSERT INTO public.markets (match_id, b)
        VALUES (v_match_id, 100)
        RETURNING id INTO v_market_id;
    END IF;

    INSERT INTO public.audit_events (actor_id, club_id, action, entity_type, entity_id, metadata)
    VALUES (v_user_id, v_club_id, 'match.create', 'match', v_match_id,
            jsonb_build_object('event_id', p_event_id, 'market_id', v_market_id));

    match_id := v_match_id;
    market_id := v_market_id;
    RETURN NEXT;
END;
$$;

CREATE OR REPLACE FUNCTION public.update_club_match(
    p_match_id UUID,
    p_home_score INT,
    p_away_score INT,
    p_status TEXT
) RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_user_id UUID := public.require_auth();
    v_event_id UUID;
    v_club_id UUID;
BEGIN
    SELECT mt.tournament_id, t.club_id INTO v_event_id, v_club_id
      FROM public.matches mt
      JOIN public.tournaments t ON t.id = mt.tournament_id
     WHERE mt.id = p_match_id
       FOR UPDATE OF mt;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'match not found';
    END IF;
    IF NOT public.has_club_role(v_club_id, ARRAY['OWNER', 'ADMIN', 'STAFF']) THEN
        RAISE EXCEPTION 'club authorization required';
    END IF;
    IF p_home_score IS NULL OR p_home_score < 0
       OR p_away_score IS NULL OR p_away_score < 0 THEN
        RAISE EXCEPTION 'scores must be non-negative';
    END IF;
    IF p_status NOT IN ('SCHEDULED', 'LIVE', 'FINISHED') THEN
        RAISE EXCEPTION 'invalid match status';
    END IF;

    UPDATE public.matches
       SET home_score = p_home_score,
           away_score = p_away_score,
           status = p_status
     WHERE id = p_match_id;

    INSERT INTO public.audit_events (actor_id, club_id, action, entity_type, entity_id, metadata)
    VALUES (v_user_id, v_club_id, 'match.update', 'match', p_match_id,
            jsonb_build_object('home_score', p_home_score, 'away_score', p_away_score, 'status', p_status));
END;
$$;

CREATE OR REPLACE FUNCTION public.set_prediction_enabled(
    p_match_id UUID,
    p_enabled BOOLEAN
) RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_user_id UUID := public.require_auth();
    v_event_id UUID;
    v_club_id UUID;
    v_market_id UUID;
BEGIN
    SELECT mt.tournament_id, t.club_id INTO v_event_id, v_club_id
      FROM public.matches mt
      JOIN public.tournaments t ON t.id = mt.tournament_id
     WHERE mt.id = p_match_id
       FOR UPDATE OF mt;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'match not found';
    END IF;
    IF NOT public.has_club_role(v_club_id, ARRAY['OWNER', 'ADMIN']) THEN
        RAISE EXCEPTION 'club authorization required';
    END IF;

    IF p_enabled THEN
        PERFORM public.require_entitlement(v_club_id, 'prediction_markets');

        SELECT id INTO v_market_id FROM public.markets WHERE match_id = p_match_id;
        IF v_market_id IS NULL THEN
            INSERT INTO public.markets (match_id, b)
            VALUES (p_match_id, 100)
            RETURNING id INTO v_market_id;
        END IF;
    END IF;

    UPDATE public.matches
       SET prediction_enabled = COALESCE(p_enabled, FALSE)
     WHERE id = p_match_id;

    INSERT INTO public.audit_events (actor_id, club_id, action, entity_type, entity_id, metadata)
    VALUES (v_user_id, v_club_id, 'match.prediction_enabled', 'match', p_match_id,
            jsonb_build_object('enabled', COALESCE(p_enabled, FALSE)));
END;
$$;

-- ---------------------------------------------------------------------------
-- Grants
-- ---------------------------------------------------------------------------

REVOKE ALL ON FUNCTION public.create_club(TEXT, TEXT, TEXT) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.update_club(UUID, TEXT, TEXT) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.list_my_clubs() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.get_club_context(UUID) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.request_plan_change(UUID, TEXT) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.admin_assign_plan(UUID, TEXT, TEXT) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.admin_set_subscription_status(UUID, TEXT) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.admin_list_clubs() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.admin_list_audit(INT) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.invite_club_member(UUID, TEXT, TEXT) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.accept_club_invite(TEXT) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.list_club_members(UUID) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.set_club_member_role(UUID, UUID, TEXT) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.remove_club_member(UUID, UUID) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.create_club_event(UUID, TEXT, INT, INT, INT) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.update_club_event(UUID, TEXT, INT, INT, INT) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.publish_club_event(UUID) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.create_club_match(UUID, TEXT, TEXT, TIMESTAMPTZ, BOOLEAN) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.update_club_match(UUID, INT, INT, TEXT) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.set_prediction_enabled(UUID, BOOLEAN) FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.create_club(TEXT, TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.update_club(UUID, TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.list_my_clubs() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_club_context(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.request_plan_change(UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_assign_plan(UUID, TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_set_subscription_status(UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_list_clubs() TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_list_audit(INT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.invite_club_member(UUID, TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.accept_club_invite(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.list_club_members(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.set_club_member_role(UUID, UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.remove_club_member(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_club_event(UUID, TEXT, INT, INT, INT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.update_club_event(UUID, TEXT, INT, INT, INT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.publish_club_event(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_club_match(UUID, TEXT, TEXT, TIMESTAMPTZ, BOOLEAN) TO authenticated;
GRANT EXECUTE ON FUNCTION public.update_club_match(UUID, INT, INT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.set_prediction_enabled(UUID, BOOLEAN) TO authenticated;

GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO service_role;
