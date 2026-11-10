-- v3.1.0 audit remediation: payload-aware ticket idempotency.
-- FND-025: the same request key replays only when the attendee payload,
-- channel, buyer, ticket type and quantity match.

ALTER TABLE public.ticket_orders
    ADD COLUMN payload_hash TEXT;

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
    v_existing_payload TEXT;
    v_payload_hash TEXT;
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

    v_payload_hash := md5(p_attendees::text || '|' || v_channel || '|' || v_buyer_id::text);

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
    SELECT o.id, o.ticket_type_id, o.quantity, o.total_cents, o.payload_hash
      INTO v_existing_order, v_existing_type, v_existing_qty, v_existing_total, v_existing_payload
      FROM public.ticket_orders o
     WHERE o.buyer_id = v_buyer_id
       AND o.request_id = p_request_id;

    IF FOUND THEN
        IF v_existing_type <> p_ticket_type_id
           OR v_existing_qty <> v_quantity
           OR (v_existing_payload IS NOT NULL AND v_existing_payload <> v_payload_hash) THEN
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
        total_cents, status, channel, terms_accepted_at, request_id, created_by,
        payload_hash
    ) VALUES (
        v_event_id, p_ticket_type_id, v_buyer_id, v_quantity, v_price,
        v_total, 'SIMULATED_PAID', v_channel, NOW(), p_request_id, v_user_id,
        v_payload_hash
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
