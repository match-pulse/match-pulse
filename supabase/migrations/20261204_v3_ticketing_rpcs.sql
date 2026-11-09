-- v3.0.0 nominal ticketing, check-in, transfer, box office, analytics and rewards.
-- ADR-010: buyer and attendee are distinct; no financial KYC.

-- ---------------------------------------------------------------------------
-- Internal attendee validation
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.validate_ticket_attendee(
    p_attendee JSONB,
    p_requires_fan_card BOOLEAN,
    p_club_id UUID
) RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_first TEXT := trim(COALESCE(p_attendee->>'first_name', ''));
    v_last TEXT := trim(COALESCE(p_attendee->>'last_name', ''));
    v_dob DATE;
    v_place TEXT := trim(COALESCE(p_attendee->>'place_of_birth', ''));
    v_tax TEXT := trim(COALESCE(p_attendee->>'tax_code', ''));
    v_doc TEXT := trim(COALESCE(p_attendee->>'document', ''));
    v_card TEXT := trim(COALESCE(p_attendee->>'fan_card_number', ''));
BEGIN
    IF p_attendee IS NULL OR jsonb_typeof(p_attendee) <> 'object' THEN
        RAISE EXCEPTION 'attendee data required';
    END IF;

    BEGIN
        v_dob := (p_attendee->>'date_of_birth')::DATE;
    EXCEPTION WHEN others THEN
        RAISE EXCEPTION 'invalid attendee date of birth';
    END;

    IF v_first = '' OR v_last = '' OR v_dob IS NULL OR v_place = ''
       OR (v_tax = '' AND v_doc = '') THEN
        RAISE EXCEPTION 'attendee identity data required';
    END IF;

    IF p_requires_fan_card THEN
        IF v_card = '' THEN
            RAISE EXCEPTION 'fan card required';
        END IF;
        IF NOT EXISTS (
            SELECT 1
              FROM public.club_fan_cards
             WHERE club_id = p_club_id
               AND card_number = v_card
               AND status = 'ACTIVE'
        ) THEN
            RAISE EXCEPTION 'invalid fan card';
        END IF;
    END IF;
END;
$$;

-- ---------------------------------------------------------------------------
-- Ticket types and reads
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.create_ticket_type(
    p_event_id UUID,
    p_name TEXT,
    p_sector TEXT DEFAULT 'GENERAL',
    p_price_cents INT DEFAULT 0,
    p_allocation INT DEFAULT 0,
    p_sales_start TIMESTAMPTZ DEFAULT NULL,
    p_sales_end TIMESTAMPTZ DEFAULT NULL,
    p_transfer_deadline TIMESTAMPTZ DEFAULT NULL,
    p_max_per_buyer INT DEFAULT 4,
    p_requires_fan_card BOOLEAN DEFAULT FALSE,
    p_transferable BOOLEAN DEFAULT TRUE,
    p_away_sector BOOLEAN DEFAULT FALSE
) RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_user_id UUID := public.require_event_role(p_event_id, ARRAY['OWNER', 'ADMIN', 'STAFF']);
    v_club_id UUID;
    v_name TEXT := trim(p_name);
    v_sector TEXT := COALESCE(NULLIF(trim(p_sector), ''), 'GENERAL');
    v_type_id UUID;
BEGIN
    SELECT club_id INTO v_club_id
      FROM public.tournaments
     WHERE id = p_event_id
       FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'event not found';
    END IF;
    IF v_name IS NULL OR length(v_name) = 0 THEN
        RAISE EXCEPTION 'ticket type name required';
    END IF;
    IF p_price_cents IS NULL OR p_price_cents < 0 THEN
        RAISE EXCEPTION 'price must be non-negative';
    END IF;
    IF p_allocation IS NULL OR p_allocation < 0 THEN
        RAISE EXCEPTION 'allocation must be non-negative';
    END IF;
    IF p_max_per_buyer IS NULL OR p_max_per_buyer < 1 OR p_max_per_buyer > 4 THEN
        RAISE EXCEPTION 'max per buyer must be between 1 and 4';
    END IF;
    IF p_sales_start IS NOT NULL AND p_sales_end IS NOT NULL AND p_sales_end <= p_sales_start THEN
        RAISE EXCEPTION 'sales end must be after sales start';
    END IF;
    IF p_transfer_deadline IS NOT NULL AND p_sales_end IS NOT NULL
       AND p_transfer_deadline > p_sales_end THEN
        RAISE EXCEPTION 'transfer deadline cannot be after sales end';
    END IF;

    INSERT INTO public.ticket_types (
        event_id, name, sector, price_cents, allocation,
        sales_start, sales_end, transfer_deadline, max_per_buyer,
        requires_fan_card, transferable, away_sector, created_by
    ) VALUES (
        p_event_id, v_name, v_sector, p_price_cents, p_allocation,
        p_sales_start, p_sales_end, p_transfer_deadline, p_max_per_buyer,
        COALESCE(p_requires_fan_card, FALSE), COALESCE(p_transferable, TRUE),
        COALESCE(p_away_sector, FALSE), v_user_id
    )
    RETURNING id INTO v_type_id;

    INSERT INTO public.audit_events (actor_id, club_id, action, entity_type, entity_id, metadata)
    VALUES (v_user_id, v_club_id, 'ticket_type.create', 'ticket_type', v_type_id,
            jsonb_build_object('event_id', p_event_id, 'name', v_name, 'allocation', p_allocation));

    RETURN v_type_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.list_club_events(p_club_id UUID)
RETURNS TABLE (
    id UUID,
    name TEXT,
    status TEXT,
    max_capacity INT,
    current_players INT,
    ticket_allocation INT,
    ticket_points INT,
    published_at TIMESTAMPTZ,
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
        SELECT t.id, t.name, t.status, t.max_capacity, t.current_players,
               t.ticket_allocation, t.ticket_points, t.published_at, t.created_at
          FROM public.tournaments t
         WHERE t.club_id = p_club_id
         ORDER BY t.created_at DESC;
END;
$$;

CREATE OR REPLACE FUNCTION public.list_club_matches(p_event_id UUID)
RETURNS TABLE (
    match_id UUID,
    home_team TEXT,
    away_team TEXT,
    status TEXT,
    kickoff_time TIMESTAMPTZ,
    home_score INT,
    away_score INT,
    prediction_enabled BOOLEAN,
    market_id UUID,
    market_status TEXT
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
    PERFORM public.require_event_role(p_event_id, ARRAY['OWNER', 'ADMIN', 'STAFF', 'ANALYST']);

    RETURN QUERY
        SELECT m.id, m.home_team, m.away_team, m.status, m.kickoff_time,
               m.home_score, m.away_score, m.prediction_enabled,
               mk.id, mk.status
          FROM public.matches m
          LEFT JOIN public.markets mk ON mk.match_id = m.id
         WHERE m.tournament_id = p_event_id
         ORDER BY m.kickoff_time;
END;
$$;

CREATE OR REPLACE FUNCTION public.list_club_ticket_types(p_event_id UUID)
RETURNS TABLE (
    ticket_type_id UUID,
    name TEXT,
    sector TEXT,
    price_cents INT,
    allocation INT,
    sold_count INT,
    sales_start TIMESTAMPTZ,
    sales_end TIMESTAMPTZ,
    transfer_deadline TIMESTAMPTZ,
    max_per_buyer INT,
    requires_fan_card BOOLEAN,
    transferable BOOLEAN,
    away_sector BOOLEAN,
    active BOOLEAN
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
    PERFORM public.require_event_role(p_event_id, ARRAY['OWNER', 'ADMIN', 'STAFF', 'ANALYST']);

    RETURN QUERY
        SELECT tt.id, tt.name, tt.sector, tt.price_cents, tt.allocation, tt.sold_count,
               tt.sales_start, tt.sales_end, tt.transfer_deadline, tt.max_per_buyer,
               tt.requires_fan_card, tt.transferable, tt.away_sector, tt.active
          FROM public.ticket_types tt
         WHERE tt.event_id = p_event_id
         ORDER BY tt.created_at;
END;
$$;

-- ---------------------------------------------------------------------------
-- Purchase and issuance
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.purchase_ticket(
    p_ticket_type_id UUID,
    p_attendees JSONB,
    p_accept_terms BOOLEAN,
    p_request_id UUID,
    p_channel TEXT DEFAULT 'WEB',
    p_buyer_id UUID DEFAULT NULL
) RETURNS TABLE (
    order_id UUID,
    ticket_ids UUID[],
    ticket_codes TEXT[],
    total_cents INT,
    points_after INT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_user_id UUID := public.require_auth();
    v_channel TEXT := upper(trim(COALESCE(p_channel, 'WEB')));
    v_buyer_id UUID := COALESCE(p_buyer_id, v_user_id);
    v_quantity INT;
    v_event_id UUID;
    v_club_id UUID;
    v_event_status TEXT;
    v_event_allocation INT;
    v_ticket_points INT;
    v_price INT;
    v_allocation INT;
    v_sold_count INT;
    v_sales_start TIMESTAMPTZ;
    v_sales_end TIMESTAMPTZ;
    v_max_per_buyer INT;
    v_requires_fan_card BOOLEAN;
    v_active BOOLEAN;
    v_attendee JSONB;
    v_attendee_first TEXT;
    v_attendee_last TEXT;
    v_attendee_dob DATE;
    v_attendee_place TEXT;
    v_attendee_tax TEXT;
    v_attendee_doc TEXT;
    v_fan_card TEXT;
    v_ticket_id UUID;
    v_ticket_code TEXT;
    v_ticket_ids UUID[] := ARRAY[]::UUID[];
    v_ticket_codes TEXT[] := ARRAY[]::TEXT[];
    v_order_id UUID;
    v_existing_order UUID;
    v_existing_type UUID;
    v_existing_qty INT;
    v_existing_total INT;
    v_sold_total INT;
    v_total INT;
    v_points_after INT;
BEGIN
    IF v_channel NOT IN ('WEB', 'BOX_OFFICE') THEN
        RAISE EXCEPTION 'invalid ticket channel';
    END IF;
    IF p_accept_terms IS NOT TRUE THEN
        RAISE EXCEPTION 'ticket terms must be accepted';
    END IF;
    IF p_request_id IS NULL THEN
        RAISE EXCEPTION 'request id required';
    END IF;
    IF p_attendees IS NULL OR jsonb_typeof(p_attendees) <> 'array' THEN
        RAISE EXCEPTION 'attendee array required';
    END IF;

    v_quantity := jsonb_array_length(p_attendees);
    IF v_quantity < 1 OR v_quantity > 4 THEN
        RAISE EXCEPTION 'between one and four tickets are allowed';
    END IF;

    IF v_channel = 'BOX_OFFICE' THEN
        IF p_buyer_id IS NULL THEN
            RAISE EXCEPTION 'buyer required for box office';
        END IF;
    ELSIF p_buyer_id IS NOT NULL AND p_buyer_id <> v_user_id THEN
        RAISE EXCEPTION 'buyer selection is only allowed at the box office';
    END IF;

    SELECT tt.event_id, tt.price_cents, tt.allocation, tt.sold_count,
           tt.sales_start, tt.sales_end, tt.max_per_buyer,
           tt.requires_fan_card, tt.active
      INTO v_event_id, v_price, v_allocation, v_sold_count,
           v_sales_start, v_sales_end, v_max_per_buyer,
           v_requires_fan_card, v_active
      FROM public.ticket_types tt
     WHERE tt.id = p_ticket_type_id
       FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'ticket type not found';
    END IF;
    IF NOT v_active THEN
        RAISE EXCEPTION 'ticket type is not active';
    END IF;
    IF v_quantity > v_max_per_buyer THEN
        RAISE EXCEPTION 'maximum per buyer is %', v_max_per_buyer;
    END IF;
    IF v_sales_start IS NOT NULL AND NOW() < v_sales_start THEN
        RAISE EXCEPTION 'ticket sales have not started';
    END IF;
    IF v_sales_end IS NOT NULL AND NOW() > v_sales_end THEN
        RAISE EXCEPTION 'ticket sales have ended';
    END IF;

    SELECT t.club_id, t.status, t.ticket_allocation, t.ticket_points
      INTO v_club_id, v_event_status, v_event_allocation, v_ticket_points
      FROM public.tournaments t
     WHERE t.id = v_event_id
       FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'event not found';
    END IF;
    IF v_event_status <> 'PUBLISHED' THEN
        RAISE EXCEPTION 'event is not published';
    END IF;
    IF v_channel = 'BOX_OFFICE'
       AND NOT public.has_club_role(v_club_id, ARRAY['OWNER', 'ADMIN', 'STAFF']) THEN
        RAISE EXCEPTION 'box office authorization required';
    END IF;

    -- Idempotent replay.
    SELECT o.id, o.ticket_type_id, o.quantity, o.total_cents
      INTO v_existing_order, v_existing_type, v_existing_qty, v_existing_total
      FROM public.ticket_orders o
     WHERE o.buyer_id = v_buyer_id
       AND o.request_id = p_request_id;

    IF FOUND THEN
        IF v_existing_type <> p_ticket_type_id OR v_existing_qty <> v_quantity THEN
            RAISE EXCEPTION 'request id reused with a different payload';
        END IF;

        SELECT array_agg(t.id), array_agg(t.ticket_code)
          INTO v_ticket_ids, v_ticket_codes
          FROM public.tickets t
         WHERE t.order_id = v_existing_order;

        SELECT points INTO v_points_after FROM public.profiles WHERE id = v_buyer_id;

        order_id := v_existing_order;
        ticket_ids := COALESCE(v_ticket_ids, ARRAY[]::UUID[]);
        ticket_codes := COALESCE(v_ticket_codes, ARRAY[]::TEXT[]);
        total_cents := v_existing_total;
        points_after := v_points_after;
        RETURN NEXT;
        RETURN;
    END IF;

    SELECT count(*) INTO v_sold_total
      FROM public.tickets
     WHERE tournament_id = v_event_id;

    IF v_sold_total + v_quantity > v_event_allocation THEN
        RAISE EXCEPTION 'tickets sold out';
    END IF;
    IF v_sold_count + v_quantity > v_allocation THEN
        RAISE EXCEPTION 'ticket allocation exhausted';
    END IF;

    v_total := v_price * v_quantity;

    INSERT INTO public.ticket_orders (
        event_id, ticket_type_id, buyer_id, quantity, unit_price_cents,
        total_cents, status, channel, terms_accepted_at, request_id, created_by
    ) VALUES (
        v_event_id, p_ticket_type_id, v_buyer_id, v_quantity, v_price,
        v_total, 'SIMULATED_PAID', v_channel, NOW(), p_request_id, v_user_id
    )
    RETURNING id INTO v_order_id;

    FOR v_attendee IN
        SELECT value FROM jsonb_array_elements(p_attendees)
    LOOP
        PERFORM public.validate_ticket_attendee(v_attendee, v_requires_fan_card, v_club_id);

        v_attendee_first := trim(v_attendee->>'first_name');
        v_attendee_last := trim(v_attendee->>'last_name');
        v_attendee_dob := (v_attendee->>'date_of_birth')::DATE;
        v_attendee_place := trim(v_attendee->>'place_of_birth');
        v_attendee_tax := NULLIF(trim(COALESCE(v_attendee->>'tax_code', '')), '');
        v_attendee_doc := NULLIF(trim(COALESCE(v_attendee->>'document', '')), '');
        v_fan_card := NULLIF(trim(COALESCE(v_attendee->>'fan_card_number', '')), '');
        v_ticket_code := 'MP-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 12));

        INSERT INTO public.tickets (
            tournament_id, user_id, buyer_id, order_id, ticket_type_id,
            attendee_first_name, attendee_last_name, attendee_date_of_birth,
            attendee_place_of_birth, attendee_tax_code, attendee_document,
            fan_card_number, ticket_code, points_awarded, created_at
        ) VALUES (
            v_event_id, v_buyer_id, v_buyer_id, v_order_id, p_ticket_type_id,
            v_attendee_first, v_attendee_last, v_attendee_dob,
            v_attendee_place, v_attendee_tax, v_attendee_doc,
            v_fan_card, v_ticket_code, v_ticket_points, NOW()
        )
        RETURNING id INTO v_ticket_id;

        v_ticket_ids := array_append(v_ticket_ids, v_ticket_id);
        v_ticket_codes := array_append(v_ticket_codes, v_ticket_code);
    END LOOP;

    UPDATE public.ticket_types
       SET sold_count = sold_count + v_quantity
     WHERE id = p_ticket_type_id;

    UPDATE public.profiles
       SET points = points + (v_ticket_points * v_quantity)
     WHERE id = v_buyer_id
    RETURNING points INTO v_points_after;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'buyer profile not found';
    END IF;

    INSERT INTO public.audit_events (actor_id, club_id, action, entity_type, entity_id, metadata)
    VALUES (v_user_id, v_club_id, 'ticket.order', 'ticket_order', v_order_id,
            jsonb_build_object(
                'event_id', v_event_id,
                'ticket_type_id', p_ticket_type_id,
                'quantity', v_quantity,
                'channel', v_channel,
                'total_cents', v_total
            ));

    order_id := v_order_id;
    ticket_ids := v_ticket_ids;
    ticket_codes := v_ticket_codes;
    total_cents := v_total;
    points_after := v_points_after;
    RETURN NEXT;
END;
$$;

CREATE OR REPLACE FUNCTION public.box_office_sell(
    p_ticket_type_id UUID,
    p_buyer_id UUID,
    p_attendees JSONB,
    p_accept_terms BOOLEAN,
    p_request_id UUID
) RETURNS TABLE (
    order_id UUID,
    ticket_ids UUID[],
    ticket_codes TEXT[],
    total_cents INT,
    points_after INT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
    RETURN QUERY
        SELECT *
          FROM public.purchase_ticket(
              p_ticket_type_id, p_attendees, p_accept_terms, p_request_id, 'BOX_OFFICE', p_buyer_id
          );
END;
$$;

-- ---------------------------------------------------------------------------
-- Transfer, check-in and attendee reads
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.transfer_ticket(
    p_ticket_id UUID,
    p_new_attendee JSONB
) RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_user_id UUID := public.require_auth();
    v_ticket public.tickets%ROWTYPE;
    v_club_id UUID;
    v_transferable BOOLEAN;
    v_deadline TIMESTAMPTZ;
    v_requires_fan_card BOOLEAN;
    v_first TEXT;
    v_last TEXT;
    v_dob DATE;
    v_place TEXT;
    v_tax TEXT;
    v_doc TEXT;
    v_card TEXT;
BEGIN
    SELECT * INTO v_ticket
      FROM public.tickets
     WHERE id = p_ticket_id
       FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'ticket not found';
    END IF;
    IF v_ticket.order_id IS NULL THEN
        RAISE EXCEPTION 'legacy ticket cannot be transferred';
    END IF;
    IF v_ticket.buyer_id IS DISTINCT FROM v_user_id AND v_ticket.user_id IS DISTINCT FROM v_user_id THEN
        RAISE EXCEPTION 'only the buyer can transfer this ticket';
    END IF;
    IF v_ticket.checked_in_at IS NOT NULL THEN
        RAISE EXCEPTION 'ticket already checked in';
    END IF;

    SELECT tt.transferable, tt.transfer_deadline, tt.requires_fan_card, t.club_id
      INTO v_transferable, v_deadline, v_requires_fan_card, v_club_id
      FROM public.ticket_types tt
      JOIN public.tournaments t ON t.id = tt.event_id
     WHERE tt.id = v_ticket.ticket_type_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'ticket type not found';
    END IF;
    IF NOT v_transferable THEN
        RAISE EXCEPTION 'ticket is not transferable';
    END IF;
    IF v_deadline IS NOT NULL AND NOW() >= v_deadline THEN
        RAISE EXCEPTION 'transfer deadline has passed';
    END IF;

    PERFORM public.validate_ticket_attendee(p_new_attendee, v_requires_fan_card, v_club_id);

    v_first := trim(p_new_attendee->>'first_name');
    v_last := trim(p_new_attendee->>'last_name');
    v_dob := (p_new_attendee->>'date_of_birth')::DATE;
    v_place := trim(p_new_attendee->>'place_of_birth');
    v_tax := NULLIF(trim(COALESCE(p_new_attendee->>'tax_code', '')), '');
    v_doc := NULLIF(trim(COALESCE(p_new_attendee->>'document', '')), '');
    v_card := NULLIF(trim(COALESCE(p_new_attendee->>'fan_card_number', '')), '');

    INSERT INTO public.ticket_transfers (
        ticket_id, previous_first_name, previous_last_name, previous_date_of_birth,
        previous_place_of_birth, previous_tax_code, new_first_name, new_last_name,
        new_date_of_birth, new_place_of_birth, new_tax_code, requested_by
    ) VALUES (
        p_ticket_id, v_ticket.attendee_first_name, v_ticket.attendee_last_name,
        v_ticket.attendee_date_of_birth, v_ticket.attendee_place_of_birth,
        v_ticket.attendee_tax_code, v_first, v_last, v_dob, v_place, v_tax, v_user_id
    );

    UPDATE public.tickets
       SET attendee_first_name = v_first,
           attendee_last_name = v_last,
           attendee_date_of_birth = v_dob,
           attendee_place_of_birth = v_place,
           attendee_tax_code = v_tax,
           attendee_document = v_doc,
           fan_card_number = v_card
     WHERE id = p_ticket_id;

    INSERT INTO public.audit_events (actor_id, club_id, action, entity_type, entity_id, metadata)
    VALUES (v_user_id, v_club_id, 'ticket.transfer', 'ticket', p_ticket_id,
            jsonb_build_object('order_id', v_ticket.order_id));
END;
$$;

CREATE OR REPLACE FUNCTION public.check_in_ticket(p_ticket_code TEXT)
RETURNS TABLE (
    ticket_id UUID,
    event_id UUID,
    attendee_name TEXT,
    checked_in_at TIMESTAMPTZ,
    already_checked_in BOOLEAN
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_user_id UUID := public.require_auth();
    v_ticket public.tickets%ROWTYPE;
    v_club_id UUID;
    v_already BOOLEAN;
    v_checked_at TIMESTAMPTZ;
BEGIN
    SELECT * INTO v_ticket
      FROM public.tickets
     WHERE ticket_code = upper(trim(p_ticket_code))
       FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'ticket not found';
    END IF;

    SELECT club_id INTO v_club_id
      FROM public.tournaments
     WHERE id = v_ticket.tournament_id;

    IF NOT public.has_club_role(v_club_id, ARRAY['OWNER', 'ADMIN', 'STAFF']) THEN
        RAISE EXCEPTION 'club authorization required';
    END IF;

    v_already := v_ticket.checked_in_at IS NOT NULL;
    v_checked_at := v_ticket.checked_in_at;

    IF NOT v_already THEN
        UPDATE public.tickets
           SET checked_in_at = NOW(),
               checked_in_by = v_user_id
         WHERE id = v_ticket.id
        RETURNING checked_in_at INTO v_checked_at;

        INSERT INTO public.audit_events (actor_id, club_id, action, entity_type, entity_id, metadata)
        VALUES (v_user_id, v_club_id, 'ticket.check_in', 'ticket', v_ticket.id,
                jsonb_build_object('event_id', v_ticket.tournament_id));
    END IF;

    ticket_id := v_ticket.id;
    event_id := v_ticket.tournament_id;
    attendee_name := trim(COALESCE(v_ticket.attendee_first_name, '') || ' ' || COALESCE(v_ticket.attendee_last_name, ''));
    checked_in_at := v_checked_at;
    already_checked_in := v_already;
    RETURN NEXT;
END;
$$;

CREATE OR REPLACE FUNCTION public.list_club_attendees(p_event_id UUID)
RETURNS TABLE (
    ticket_id UUID,
    order_id UUID,
    ticket_type TEXT,
    attendee_first_name TEXT,
    attendee_last_name TEXT,
    attendee_date_of_birth DATE,
    attendee_place_of_birth TEXT,
    attendee_tax_code TEXT,
    attendee_document TEXT,
    fan_card_number TEXT,
    ticket_code TEXT,
    checked_in_at TIMESTAMPTZ,
    buyer_username TEXT
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
    PERFORM public.require_event_role(p_event_id, ARRAY['OWNER', 'ADMIN', 'STAFF']);

    RETURN QUERY
        SELECT t.id, t.order_id, tt.name, t.attendee_first_name, t.attendee_last_name,
               t.attendee_date_of_birth, t.attendee_place_of_birth, t.attendee_tax_code,
               t.attendee_document, t.fan_card_number, t.ticket_code, t.checked_in_at,
               p.username
          FROM public.tickets t
          LEFT JOIN public.ticket_types tt ON tt.id = t.ticket_type_id
          LEFT JOIN public.profiles p ON p.id = t.buyer_id
         WHERE t.tournament_id = p_event_id
           AND t.order_id IS NOT NULL
         ORDER BY t.attendee_last_name, t.attendee_first_name;
END;
$$;

CREATE OR REPLACE FUNCTION public.list_club_orders(p_event_id UUID)
RETURNS TABLE (
    order_id UUID,
    buyer_username TEXT,
    ticket_type TEXT,
    quantity INT,
    total_cents INT,
    status TEXT,
    channel TEXT,
    created_at TIMESTAMPTZ
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
    PERFORM public.require_event_role(p_event_id, ARRAY['OWNER', 'ADMIN', 'STAFF']);

    RETURN QUERY
        SELECT o.id, p.username, tt.name, o.quantity, o.total_cents, o.status, o.channel, o.created_at
          FROM public.ticket_orders o
          JOIN public.ticket_types tt ON tt.id = o.ticket_type_id
          JOIN public.profiles p ON p.id = o.buyer_id
         WHERE o.event_id = p_event_id
         ORDER BY o.created_at DESC;
END;
$$;

CREATE OR REPLACE FUNCTION public.list_my_tickets()
RETURNS TABLE (
    ticket_id UUID,
    order_id UUID,
    event_id UUID,
    event_name TEXT,
    club_name TEXT,
    ticket_type TEXT,
    attendee_first_name TEXT,
    attendee_last_name TEXT,
    ticket_code TEXT,
    checked_in_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
    PERFORM public.require_auth();

    RETURN QUERY
        SELECT t.id, t.order_id, t.tournament_id, tr.name, c.name, tt.name,
               t.attendee_first_name, t.attendee_last_name, t.ticket_code,
               t.checked_in_at, t.created_at
          FROM public.tickets t
          JOIN public.tournaments tr ON tr.id = t.tournament_id
          JOIN public.clubs c ON c.id = tr.club_id
          LEFT JOIN public.ticket_types tt ON tt.id = t.ticket_type_id
         WHERE t.buyer_id = auth.uid() OR t.user_id = auth.uid()
         ORDER BY t.created_at DESC;
END;
$$;

-- ---------------------------------------------------------------------------
-- Analytics
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.club_sales_summary(
    p_club_id UUID,
    p_event_id UUID DEFAULT NULL
) RETURNS TABLE (
    event_id UUID,
    event_name TEXT,
    orders BIGINT,
    tickets_sold BIGINT,
    checked_in BIGINT,
    simulated_revenue_cents BIGINT,
    unique_buyers BIGINT
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
    PERFORM public.require_club_role(p_club_id, ARRAY['OWNER', 'ADMIN', 'STAFF', 'ANALYST']);

    IF p_event_id IS NOT NULL AND NOT EXISTS (
        SELECT 1 FROM public.tournaments WHERE id = p_event_id AND club_id = p_club_id
    ) THEN
        RAISE EXCEPTION 'event not found for club';
    END IF;

    RETURN QUERY
        WITH filtered_events AS (
            SELECT t.id, t.name
              FROM public.tournaments t
             WHERE t.club_id = p_club_id
               AND (p_event_id IS NULL OR t.id = p_event_id)
        ),
        order_stats AS (
            SELECT o.event_id,
                   count(*)::BIGINT AS orders,
                   count(DISTINCT o.buyer_id)::BIGINT AS unique_buyers,
                   COALESCE(sum(o.total_cents), 0)::BIGINT AS revenue
              FROM public.ticket_orders o
              JOIN filtered_events e ON e.id = o.event_id
             GROUP BY o.event_id
        ),
        ticket_stats AS (
            SELECT t.tournament_id AS event_id,
                   count(*)::BIGINT AS tickets_sold,
                   (count(*) FILTER (WHERE t.checked_in_at IS NOT NULL))::BIGINT AS checked_in
              FROM public.tickets t
              JOIN filtered_events e ON e.id = t.tournament_id
             GROUP BY t.tournament_id
        )
        SELECT e.id, e.name,
               COALESCE(os.orders, 0),
               COALESCE(ts.tickets_sold, 0),
               COALESCE(ts.checked_in, 0),
               COALESCE(os.revenue, 0),
               COALESCE(os.unique_buyers, 0)
          FROM filtered_events e
          LEFT JOIN order_stats os ON os.event_id = e.id
          LEFT JOIN ticket_stats ts ON ts.event_id = e.id
         ORDER BY e.name;
END;
$$;

CREATE OR REPLACE FUNCTION public.club_prediction_insights(
    p_club_id UUID,
    p_event_id UUID DEFAULT NULL,
    p_match_id UUID DEFAULT NULL
) RETURNS TABLE (
    match_id UUID,
    home_team TEXT,
    away_team TEXT,
    market_id UUID,
    outcome TEXT,
    unique_predictors BIGINT,
    trades BIGINT,
    shares NUMERIC,
    last_price NUMERIC,
    suppressed BOOLEAN
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
    PERFORM public.require_club_role(p_club_id, ARRAY['OWNER', 'ADMIN', 'STAFF', 'ANALYST']);
    PERFORM public.require_entitlement(p_club_id, 'prediction_insights');

    IF p_event_id IS NOT NULL AND NOT EXISTS (
        SELECT 1 FROM public.tournaments WHERE id = p_event_id AND club_id = p_club_id
    ) THEN
        RAISE EXCEPTION 'event not found for club';
    END IF;
    IF p_match_id IS NOT NULL AND NOT EXISTS (
        SELECT 1
          FROM public.matches m
          JOIN public.tournaments t ON t.id = m.tournament_id
         WHERE m.id = p_match_id AND t.club_id = p_club_id
    ) THEN
        RAISE EXCEPTION 'match not found for club';
    END IF;

    RETURN QUERY
        WITH filtered_markets AS (
            SELECT m.id AS market_id, mt.id AS match_id, mt.home_team, mt.away_team
              FROM public.markets m
              JOIN public.matches mt ON mt.id = m.match_id
              JOIN public.tournaments t ON t.id = mt.tournament_id
             WHERE t.club_id = p_club_id
               AND (p_event_id IS NULL OR mt.tournament_id = p_event_id)
               AND (p_match_id IS NULL OR mt.id = p_match_id)
        ),
        market_traders AS (
            SELECT tr.market_id, count(DISTINCT tr.user_id)::BIGINT AS traders
              FROM public.market_trades tr
              JOIN filtered_markets fm ON fm.market_id = tr.market_id
             GROUP BY tr.market_id
        ),
        outcomes(outcome) AS (
            VALUES ('HOME'), ('DRAW'), ('AWAY')
        ),
        aggregates AS (
            SELECT fm.market_id, fm.match_id, fm.home_team, fm.away_team, o.outcome,
                   count(tr.id)::BIGINT AS trades,
                   COALESCE(sum(tr.shares), 0) AS shares,
                   (array_agg(tr.price_after ORDER BY tr.created_at DESC)
                       FILTER (WHERE tr.id IS NOT NULL))[1] AS last_price
              FROM filtered_markets fm
              CROSS JOIN outcomes o
              LEFT JOIN public.market_trades tr
                ON tr.market_id = fm.market_id
               AND tr.outcome = o.outcome
             GROUP BY fm.market_id, fm.match_id, fm.home_team, fm.away_team, o.outcome
        )
        SELECT a.match_id, a.home_team, a.away_team, a.market_id, a.outcome,
               CASE WHEN COALESCE(mt.traders, 0) >= 5 THEN mt.traders END,
               CASE WHEN COALESCE(mt.traders, 0) >= 5 THEN a.trades END,
               CASE WHEN COALESCE(mt.traders, 0) >= 5 THEN a.shares END,
               CASE WHEN COALESCE(mt.traders, 0) >= 5 THEN a.last_price END,
               COALESCE(mt.traders, 0) < 5
          FROM aggregates a
          LEFT JOIN market_traders mt ON mt.market_id = a.market_id
         ORDER BY a.match_id, a.outcome;
END;
$$;

CREATE OR REPLACE FUNCTION public.club_prediction_timeseries(
    p_club_id UUID,
    p_market_id UUID,
    p_bucket_minutes INT DEFAULT 5
) RETURNS TABLE (
    bucket_start TIMESTAMPTZ,
    outcome TEXT,
    trades BIGINT,
    shares NUMERIC,
    avg_price NUMERIC,
    last_price NUMERIC,
    suppressed BOOLEAN
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_traders BIGINT;
BEGIN
    PERFORM public.require_club_role(p_club_id, ARRAY['OWNER', 'ADMIN', 'STAFF', 'ANALYST']);
    PERFORM public.require_entitlement(p_club_id, 'advanced_analytics');

    IF p_bucket_minutes IS NULL OR p_bucket_minutes < 1 OR p_bucket_minutes > 60 THEN
        RAISE EXCEPTION 'bucket minutes must be between 1 and 60';
    END IF;

    IF NOT EXISTS (
        SELECT 1
          FROM public.markets m
          JOIN public.matches mt ON mt.id = m.match_id
          JOIN public.tournaments t ON t.id = mt.tournament_id
         WHERE m.id = p_market_id AND t.club_id = p_club_id
    ) THEN
        RAISE EXCEPTION 'market not found for club';
    END IF;

    SELECT count(DISTINCT tr.user_id) INTO v_traders
      FROM public.market_trades tr
     WHERE tr.market_id = p_market_id;

    IF COALESCE(v_traders, 0) < 5 THEN
        RETURN;
    END IF;

    RETURN QUERY
        SELECT to_timestamp(
                   floor(extract(epoch FROM tr.created_at) / (p_bucket_minutes * 60))
                   * (p_bucket_minutes * 60)
               ) AS bucket_start,
               tr.outcome,
               count(*)::BIGINT AS trades,
               sum(tr.shares) AS shares,
               avg(tr.price_after) AS avg_price,
               (array_agg(tr.price_after ORDER BY tr.created_at DESC))[1] AS last_price,
               FALSE AS suppressed
          FROM public.market_trades tr
         WHERE tr.market_id = p_market_id
         GROUP BY 1, 2
         ORDER BY 1, 2;
END;
$$;

CREATE OR REPLACE FUNCTION public.record_club_export(
    p_club_id UUID,
    p_resource TEXT,
    p_metadata JSONB DEFAULT '{}'::jsonb
) RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_user_id UUID := public.require_club_role(p_club_id, ARRAY['OWNER', 'ADMIN', 'ANALYST']);
BEGIN
    PERFORM public.require_entitlement(p_club_id, 'data_export');

    INSERT INTO public.audit_events (actor_id, club_id, action, entity_type, metadata)
    VALUES (v_user_id, p_club_id, 'club.export', p_resource, COALESCE(p_metadata, '{}'::jsonb));
END;
$$;

-- ---------------------------------------------------------------------------
-- Rewards and fan cards
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.create_club_reward(
    p_club_id UUID,
    p_name TEXT,
    p_cost_points INT,
    p_discount_percent INT
) RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_user_id UUID := public.require_club_role(p_club_id, ARRAY['OWNER', 'ADMIN']);
    v_name TEXT := trim(p_name);
    v_reward_id UUID;
BEGIN
    PERFORM public.require_entitlement(p_club_id, 'club_rewards');

    IF v_name IS NULL OR length(v_name) = 0 THEN
        RAISE EXCEPTION 'reward name required';
    END IF;
    IF p_cost_points IS NULL OR p_cost_points <= 0 THEN
        RAISE EXCEPTION 'reward cost must be positive';
    END IF;
    IF p_discount_percent IS NULL OR p_discount_percent < 1 OR p_discount_percent > 100 THEN
        RAISE EXCEPTION 'discount must be between 1 and 100';
    END IF;

    INSERT INTO public.rewards (name, cost_points, discount_percent, active, club_id)
    VALUES (v_name, p_cost_points, p_discount_percent, TRUE, p_club_id)
    RETURNING id INTO v_reward_id;

    INSERT INTO public.audit_events (actor_id, club_id, action, entity_type, entity_id, metadata)
    VALUES (v_user_id, p_club_id, 'club.reward.create', 'reward', v_reward_id,
            jsonb_build_object('name', v_name, 'cost_points', p_cost_points));

    RETURN v_reward_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.issue_club_fan_card(
    p_club_id UUID,
    p_card_number TEXT,
    p_profile_id UUID DEFAULT NULL
) RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_user_id UUID := public.require_club_role(p_club_id, ARRAY['OWNER', 'ADMIN']);
    v_card TEXT := trim(p_card_number);
    v_card_id UUID;
BEGIN
    IF v_card IS NULL OR length(v_card) = 0 THEN
        RAISE EXCEPTION 'fan card number required';
    END IF;

    INSERT INTO public.club_fan_cards (club_id, card_number, profile_id, created_by)
    VALUES (p_club_id, v_card, p_profile_id, v_user_id)
    ON CONFLICT (club_id, card_number) DO UPDATE
        SET profile_id = EXCLUDED.profile_id,
            status = 'ACTIVE'
    RETURNING id INTO v_card_id;

    INSERT INTO public.audit_events (actor_id, club_id, action, entity_type, entity_id, metadata)
    VALUES (v_user_id, p_club_id, 'club.fan_card.issue', 'club_fan_card', v_card_id,
            jsonb_build_object('card_number', v_card));

    RETURN v_card_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.list_club_fan_cards(p_club_id UUID)
RETURNS TABLE (
    card_id UUID,
    card_number TEXT,
    profile_id UUID,
    username TEXT,
    status TEXT,
    created_at TIMESTAMPTZ
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
    PERFORM public.require_club_role(p_club_id, ARRAY['OWNER', 'ADMIN', 'STAFF']);

    RETURN QUERY
        SELECT fc.id, fc.card_number, fc.profile_id, p.username, fc.status, fc.created_at
          FROM public.club_fan_cards fc
          LEFT JOIN public.profiles p ON p.id = fc.profile_id
         WHERE fc.club_id = p_club_id
         ORDER BY fc.created_at DESC;
END;
$$;

-- ---------------------------------------------------------------------------
-- Legacy claim replacement (no order conflict target)
-- ---------------------------------------------------------------------------

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
    v_sold INT;
    v_ticket_id UUID;
    v_after INT;
BEGIN
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'authentication required';
    END IF;

    SELECT ticket_allocation, ticket_points
      INTO v_allocation, v_points
      FROM public.tournaments
     WHERE id = p_tournament_id
       FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'tournament not found';
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

-- ---------------------------------------------------------------------------
-- Club-aware market resolution
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.resolve_market(
    p_market_id UUID,
    p_winner TEXT
) RETURNS TABLE (holders INT, total_points INT)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_user_id UUID := auth.uid();
    v_status TEXT;
    v_tournament_id UUID;
    v_club_id UUID;
    v_organizer_id UUID;
    v_holder RECORD;
    v_points INT;
    v_holders INT := 0;
    v_total INT := 0;
BEGIN
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'authentication required';
    END IF;
    IF p_winner NOT IN ('HOME', 'DRAW', 'AWAY') THEN
        RAISE EXCEPTION 'invalid outcome';
    END IF;

    SELECT m.status, mt.tournament_id, t.club_id, t.organizer_id
      INTO v_status, v_tournament_id, v_club_id, v_organizer_id
      FROM public.markets m
      JOIN public.matches mt ON mt.id = m.match_id
      LEFT JOIN public.tournaments t ON t.id = mt.tournament_id
     WHERE m.id = p_market_id
       FOR UPDATE OF m;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'market not found';
    END IF;

    IF v_club_id IS NOT NULL THEN
        IF NOT public.has_club_role(v_club_id, ARRAY['OWNER', 'ADMIN', 'STAFF']) THEN
            RAISE EXCEPTION 'club authorization required';
        END IF;
    ELSIF v_organizer_id IS DISTINCT FROM v_user_id THEN
        RAISE EXCEPTION 'organizer authorization required';
    END IF;

    IF v_status <> 'OPEN' THEN
        RAISE EXCEPTION 'market already resolved';
    END IF;

    FOR v_holder IN
        SELECT user_id, shares
          FROM public.market_positions
         WHERE market_id = p_market_id
           AND outcome = p_winner
           AND shares > 0
         ORDER BY user_id
    LOOP
        v_points := FLOOR(v_holder.shares)::INT;

        INSERT INTO public.market_payouts (market_id, user_id, shares, points)
        VALUES (p_market_id, v_holder.user_id, v_holder.shares, v_points);

        UPDATE public.profiles
           SET points = points + v_points
         WHERE id = v_holder.user_id;

        v_holders := v_holders + 1;
        v_total := v_total + v_points;
    END LOOP;

    UPDATE public.markets
       SET status = 'RESOLVED',
           winning_outcome = p_winner,
           resolved_at = NOW()
     WHERE id = p_market_id;

    INSERT INTO public.audit_events (actor_id, club_id, action, entity_type, entity_id, metadata)
    VALUES (v_user_id, v_club_id, 'market.resolve', 'market', p_market_id,
            jsonb_build_object('winner', p_winner, 'holders', v_holders, 'points', v_total));

    holders := v_holders;
    total_points := v_total;
    RETURN NEXT;
END;
$$;

-- Replace the legacy reward redemption with a club-aware version. Global
-- rewards keep their v2 behaviour; club rewards require a ticket for that club.
CREATE OR REPLACE FUNCTION public.redeem_reward(p_reward_id UUID)
RETURNS TABLE (code TEXT, points_after INT)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_user_id UUID := auth.uid();
    v_cost INT;
    v_active BOOLEAN;
    v_club_id UUID;
    v_points INT;
    v_after INT;
    v_code TEXT;
BEGIN
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'authentication required';
    END IF;

    SELECT cost_points, active, club_id
      INTO v_cost, v_active, v_club_id
      FROM public.rewards
     WHERE id = p_reward_id
       FOR UPDATE;

    IF NOT FOUND OR NOT v_active THEN
        RAISE EXCEPTION 'reward not available';
    END IF;

    IF v_club_id IS NOT NULL AND NOT EXISTS (
        SELECT 1
          FROM public.tickets t
          JOIN public.tournaments tr ON tr.id = t.tournament_id
         WHERE tr.club_id = v_club_id
           AND (t.buyer_id = v_user_id OR t.user_id = v_user_id)
    ) THEN
        RAISE EXCEPTION 'ticket required for this club reward';
    END IF;

    SELECT points INTO v_points
      FROM public.profiles
     WHERE id = v_user_id
       FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'profile not found';
    END IF;
    IF v_points < v_cost THEN
        RAISE EXCEPTION 'insufficient points';
    END IF;

    v_code := 'MP-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 10));

    UPDATE public.profiles
       SET points = points - v_cost
     WHERE id = v_user_id
    RETURNING points INTO v_after;

    INSERT INTO public.reward_redemptions (user_id, reward_id, points_spent, code)
    VALUES (v_user_id, p_reward_id, v_cost, v_code);

    INSERT INTO public.audit_events (actor_id, club_id, action, entity_type, entity_id, metadata)
    VALUES (v_user_id, v_club_id, 'reward.redeem', 'reward', p_reward_id,
            jsonb_build_object('code', v_code, 'points', v_cost));

    code := v_code;
    points_after := v_after;
    RETURN NEXT;
END;
$$;

-- ---------------------------------------------------------------------------
-- Grants
-- ---------------------------------------------------------------------------

REVOKE ALL ON FUNCTION public.validate_ticket_attendee(JSONB, BOOLEAN, UUID) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.create_ticket_type(UUID, TEXT, TEXT, INT, INT, TIMESTAMPTZ, TIMESTAMPTZ, TIMESTAMPTZ, INT, BOOLEAN, BOOLEAN, BOOLEAN) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.list_club_events(UUID) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.list_club_matches(UUID) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.list_club_ticket_types(UUID) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.purchase_ticket(UUID, JSONB, BOOLEAN, UUID, TEXT, UUID) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.box_office_sell(UUID, UUID, JSONB, BOOLEAN, UUID) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.transfer_ticket(UUID, JSONB) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.check_in_ticket(TEXT) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.list_club_attendees(UUID) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.list_club_orders(UUID) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.list_my_tickets() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.club_sales_summary(UUID, UUID) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.club_prediction_insights(UUID, UUID, UUID) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.club_prediction_timeseries(UUID, UUID, INT) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.record_club_export(UUID, TEXT, JSONB) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.create_club_reward(UUID, TEXT, INT, INT) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.issue_club_fan_card(UUID, TEXT, UUID) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.list_club_fan_cards(UUID) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.claim_ticket(UUID) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.redeem_reward(UUID) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.resolve_market(UUID, TEXT) FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.create_ticket_type(UUID, TEXT, TEXT, INT, INT, TIMESTAMPTZ, TIMESTAMPTZ, TIMESTAMPTZ, INT, BOOLEAN, BOOLEAN, BOOLEAN) TO authenticated;
GRANT EXECUTE ON FUNCTION public.list_club_events(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.list_club_matches(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.list_club_ticket_types(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.purchase_ticket(UUID, JSONB, BOOLEAN, UUID, TEXT, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.box_office_sell(UUID, UUID, JSONB, BOOLEAN, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.transfer_ticket(UUID, JSONB) TO authenticated;
GRANT EXECUTE ON FUNCTION public.check_in_ticket(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.list_club_attendees(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.list_club_orders(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.list_my_tickets() TO authenticated;
GRANT EXECUTE ON FUNCTION public.club_sales_summary(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.club_prediction_insights(UUID, UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.club_prediction_timeseries(UUID, UUID, INT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.record_club_export(UUID, TEXT, JSONB) TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_club_reward(UUID, TEXT, INT, INT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.issue_club_fan_card(UUID, TEXT, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.list_club_fan_cards(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.claim_ticket(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.redeem_reward(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.resolve_market(UUID, TEXT) TO authenticated;

GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO service_role;
