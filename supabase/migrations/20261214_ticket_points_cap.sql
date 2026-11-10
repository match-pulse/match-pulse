-- FND-026: bound club-issued ticket points.
-- Per ticket: 0..500. Per event at full allocation: at most 10,000.
-- The constraints protect every write path; the RPC checks provide clear errors.

ALTER TABLE public.tournaments
    ADD CONSTRAINT tournaments_ticket_points_per_ticket_check
    CHECK (club_id IS NULL OR ticket_points BETWEEN 0 AND 500);

ALTER TABLE public.tournaments
    ADD CONSTRAINT tournaments_ticket_points_total_check
    CHECK (club_id IS NULL OR ticket_points::BIGINT * ticket_allocation::BIGINT <= 10000);

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
    IF p_ticket_points > 500 THEN
        RAISE EXCEPTION 'ticket points cannot exceed 500 per ticket';
    END IF;
    IF p_ticket_points::BIGINT * p_ticket_allocation::BIGINT > 10000 THEN
        RAISE EXCEPTION 'ticket points cannot exceed 10000 per event';
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
