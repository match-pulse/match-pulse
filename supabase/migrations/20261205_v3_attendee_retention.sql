-- v3.0.0 attendee-data retention.
-- ADR-010: attendee identity is event-access data with a retention window.
-- This function is service-role only; the application runtime never calls it.

CREATE OR REPLACE FUNCTION public.cleanup_expired_attendee_data(
    p_older_than INTERVAL DEFAULT '365 days'
) RETURNS INT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_count INT;
BEGIN
    IF p_older_than IS NULL OR p_older_than < INTERVAL '1 day' THEN
        RAISE EXCEPTION 'retention interval must be at least one day';
    END IF;

    WITH event_age AS (
        SELECT t.id,
               COALESCE(max(m.kickoff_time), t.created_at) AS event_at
          FROM public.tournaments t
          LEFT JOIN public.matches m ON m.tournament_id = t.id
         GROUP BY t.id, t.created_at
    )
    UPDATE public.tickets tk
       SET attendee_first_name = NULL,
           attendee_last_name = NULL,
           attendee_date_of_birth = NULL,
           attendee_place_of_birth = NULL,
           attendee_tax_code = NULL,
           attendee_document = NULL,
           fan_card_number = NULL
      FROM event_age e
     WHERE tk.tournament_id = e.id
       AND tk.order_id IS NOT NULL
       AND e.event_at < NOW() - p_older_than
       AND (
           tk.attendee_first_name IS NOT NULL
           OR tk.attendee_last_name IS NOT NULL
           OR tk.attendee_date_of_birth IS NOT NULL
           OR tk.attendee_place_of_birth IS NOT NULL
           OR tk.attendee_tax_code IS NOT NULL
           OR tk.attendee_document IS NOT NULL
           OR tk.fan_card_number IS NOT NULL
       );

    GET DIAGNOSTICS v_count = ROW_COUNT;

    INSERT INTO public.audit_events (actor_id, action, entity_type, metadata)
    VALUES (
        NULL,
        'attendee.retention',
        'ticket',
        jsonb_build_object('cleared', v_count, 'older_than', p_older_than::text)
    );

    RETURN v_count;
END;
$$;

REVOKE ALL ON FUNCTION public.cleanup_expired_attendee_data(INTERVAL)
    FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.cleanup_expired_attendee_data(INTERVAL)
    TO service_role;

GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO service_role;
