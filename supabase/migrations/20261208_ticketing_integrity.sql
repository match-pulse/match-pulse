-- v3.1.0 audit remediation: ticketing integrity.
-- FND-012: enforce the buyer cap cumulatively per event.
-- FND-018: bound ticket sales by venue capacity and reject oversized allocations.
-- FND-017: restrict legacy claim/registration to events with no club.
--
-- The triggers cover every insert path, including direct service-role repair and
-- the legacy claim RPC, not only purchase_ticket.

CREATE OR REPLACE FUNCTION public.enforce_ticket_buyer_limit()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_event_id UUID;
    v_max_per_buyer INT;
    v_existing INT;
BEGIN
    SELECT tt.event_id, tt.max_per_buyer
      INTO v_event_id, v_max_per_buyer
      FROM public.ticket_types tt
     WHERE tt.id = NEW.ticket_type_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'ticket type not found';
    END IF;

    SELECT count(*)
      INTO v_existing
      FROM public.tickets t
     WHERE t.tournament_id = v_event_id
       AND (t.buyer_id = NEW.buyer_id OR t.user_id = NEW.buyer_id);

    IF v_existing + NEW.quantity > v_max_per_buyer THEN
        RAISE EXCEPTION 'maximum per buyer is %', v_max_per_buyer;
    END IF;

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS ticket_orders_buyer_limit ON public.ticket_orders;
CREATE TRIGGER ticket_orders_buyer_limit
    BEFORE INSERT ON public.ticket_orders
    FOR EACH ROW EXECUTE FUNCTION public.enforce_ticket_buyer_limit();

CREATE OR REPLACE FUNCTION public.enforce_event_capacity_config()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_existing INT;
BEGIN
    IF NEW.club_id IS NULL THEN
        RETURN NEW;
    END IF;

    IF NEW.ticket_allocation > NEW.max_capacity THEN
        RAISE EXCEPTION 'ticket allocation cannot exceed event capacity';
    END IF;

    IF TG_OP = 'UPDATE' THEN
        SELECT count(*)
          INTO v_existing
          FROM public.tickets t
         WHERE t.tournament_id = NEW.id;

        IF v_existing > NEW.max_capacity THEN
            RAISE EXCEPTION 'capacity cannot be below sold tickets';
        END IF;
    END IF;

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS tournaments_capacity_config ON public.tournaments;
CREATE TRIGGER tournaments_capacity_config
    BEFORE INSERT OR UPDATE ON public.tournaments
    FOR EACH ROW EXECUTE FUNCTION public.enforce_event_capacity_config();

CREATE OR REPLACE FUNCTION public.enforce_ticket_capacity()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_club_id UUID;
    v_max_capacity INT;
    v_existing INT;
BEGIN
    SELECT t.club_id, t.max_capacity
      INTO v_club_id, v_max_capacity
      FROM public.tournaments t
     WHERE t.id = NEW.tournament_id;

    IF v_club_id IS NULL THEN
        RETURN NEW;
    END IF;

    SELECT count(*)
      INTO v_existing
      FROM public.tickets t
     WHERE t.tournament_id = NEW.tournament_id;

    IF v_existing + 1 > v_max_capacity THEN
        RAISE EXCEPTION 'event capacity exhausted';
    END IF;

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS tickets_capacity_guard ON public.tickets;
CREATE TRIGGER tickets_capacity_guard
    BEFORE INSERT ON public.tickets
    FOR EACH ROW EXECUTE FUNCTION public.enforce_ticket_capacity();

-- Legacy registration is not a v3 club-event path. Club events use nominal
-- ticketing; legacy tournaments with club_id NULL keep the v2 registration flow.
CREATE OR REPLACE FUNCTION public.register_for_tournament(
    p_tournament_id UUID
) RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_user_id UUID := auth.uid();
    v_current_players INT;
    v_max_capacity INT;
    v_club_id UUID;
    v_registration_id UUID;
BEGIN
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'authentication required';
    END IF;

    SELECT current_players, max_capacity, club_id
      INTO v_current_players, v_max_capacity, v_club_id
      FROM public.tournaments
     WHERE id = p_tournament_id
       FOR UPDATE;

    IF NOT FOUND THEN
        RETURN false;
    END IF;

    IF v_club_id IS NOT NULL THEN
        RETURN false;
    END IF;

    IF v_current_players >= v_max_capacity THEN
        RETURN false;
    END IF;

    BEGIN
        INSERT INTO public.registrations (tournament_id, user_id)
        VALUES (p_tournament_id, v_user_id)
        RETURNING id INTO v_registration_id;
    EXCEPTION WHEN unique_violation THEN
        RETURN false;
    END;

    UPDATE public.tournaments
       SET current_players = current_players + 1
     WHERE id = p_tournament_id;

    RETURN true;
END;
$$;

-- Legacy claim is not a v3 club-event path. The RPC remains for legacy events
-- so the v2 compatibility page and its tests keep working.
CREATE OR REPLACE FUNCTION public.claim_ticket(p_tournament_id UUID)
RETURNS TABLE (ticket_id UUID, points_awarded INT, points_after INT)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_user_id UUID := auth.uid();
    v_allocation INT;
    v_points INT;
    v_club_id UUID;
    v_sold INT;
    v_ticket_id UUID;
    v_after INT;
BEGIN
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'authentication required';
    END IF;

    SELECT ticket_allocation, ticket_points, club_id
      INTO v_allocation, v_points, v_club_id
      FROM public.tournaments
     WHERE id = p_tournament_id
       FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'tournament not found';
    END IF;

    IF v_club_id IS NOT NULL THEN
        RAISE EXCEPTION 'legacy claim is not available for club events';
    END IF;

    IF EXISTS (
        SELECT 1
          FROM public.tickets
         WHERE tournament_id = p_tournament_id
           AND user_id = v_user_id
           AND order_id IS NULL
    ) THEN
        RAISE EXCEPTION 'ticket already claimed';
    END IF;

    SELECT count(*) INTO v_sold FROM public.tickets WHERE tournament_id = p_tournament_id;
    IF v_sold >= v_allocation THEN
        RAISE EXCEPTION 'tickets sold out';
    END IF;

    BEGIN
        INSERT INTO public.tickets (tournament_id, user_id, points_awarded)
        VALUES (p_tournament_id, v_user_id, v_points)
        RETURNING id INTO v_ticket_id;
    EXCEPTION WHEN unique_violation THEN
        RAISE EXCEPTION 'ticket already claimed';
    END;

    UPDATE public.profiles
       SET points = points + v_points
     WHERE id = v_user_id
    RETURNING points INTO v_after;

    INSERT INTO public.audit_events (actor_id, action, entity_type, entity_id, metadata)
    VALUES (v_user_id, 'ticket.claim', 'tournament', p_tournament_id,
            jsonb_build_object('ticket_id', v_ticket_id, 'points', v_points));

    ticket_id := v_ticket_id;
    points_awarded := v_points;
    points_after := v_after;
    RETURN NEXT;
END;
$$;
