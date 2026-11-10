-- v3.1.0 audit remediation: privacy retention and outcome-level cohorts.
-- FND-015: redact transfer history, audit card numbers and invitation emails.
-- FND-016: suppress each outcome/time-bucket cohort below five predictors.

ALTER TABLE public.ticket_transfers
    ALTER COLUMN previous_first_name DROP NOT NULL,
    ALTER COLUMN previous_last_name DROP NOT NULL,
    ALTER COLUMN new_first_name DROP NOT NULL,
    ALTER COLUMN new_last_name DROP NOT NULL;

CREATE OR REPLACE FUNCTION public.cleanup_expired_attendee_data(
    p_older_than INTERVAL DEFAULT '365 days'
) RETURNS INT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_count INT;
    v_transfers INT;
    v_audit INT;
    v_invites INT;
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

    WITH event_age AS (
        SELECT t.id,
               COALESCE(max(m.kickoff_time), t.created_at) AS event_at
          FROM public.tournaments t
          LEFT JOIN public.matches m ON m.tournament_id = t.id
         GROUP BY t.id, t.created_at
    )
    UPDATE public.ticket_transfers tt
       SET previous_first_name = NULL,
           previous_last_name = NULL,
           previous_date_of_birth = NULL,
           previous_place_of_birth = NULL,
           previous_tax_code = NULL,
           new_first_name = NULL,
           new_last_name = NULL,
           new_date_of_birth = NULL,
           new_place_of_birth = NULL,
           new_tax_code = NULL
      FROM public.tickets tk, event_age e
     WHERE tt.ticket_id = tk.id
       AND tk.tournament_id = e.id
       AND e.event_at < NOW() - p_older_than
       AND (
           tt.previous_first_name IS NOT NULL
           OR tt.previous_last_name IS NOT NULL
           OR tt.previous_date_of_birth IS NOT NULL
           OR tt.previous_place_of_birth IS NOT NULL
           OR tt.previous_tax_code IS NOT NULL
           OR tt.new_first_name IS NOT NULL
           OR tt.new_last_name IS NOT NULL
           OR tt.new_date_of_birth IS NOT NULL
           OR tt.new_place_of_birth IS NOT NULL
           OR tt.new_tax_code IS NOT NULL
       );

    GET DIAGNOSTICS v_transfers = ROW_COUNT;

    UPDATE public.audit_events
       SET metadata = metadata - 'card_number'
     WHERE action = 'club.fan_card.issue'
       AND created_at < NOW() - p_older_than
       AND metadata ? 'card_number';

    GET DIAGNOSTICS v_audit = ROW_COUNT;

    DELETE FROM public.club_invites
     WHERE (accepted_at IS NOT NULL AND accepted_at < NOW() - p_older_than)
        OR (accepted_at IS NULL AND expires_at < NOW() - p_older_than);

    GET DIAGNOSTICS v_invites = ROW_COUNT;

    INSERT INTO public.audit_events (actor_id, action, entity_type, metadata)
    VALUES (
        NULL,
        'attendee.retention',
        'ticket',
        jsonb_build_object(
            'cleared', v_count,
            'transfers_cleared', v_transfers,
            'audit_events_redacted', v_audit,
            'invites_deleted', v_invites,
            'older_than', p_older_than::text
        )
    );

    RETURN v_count;
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
            jsonb_build_object('card_id', v_card_id));

    RETURN v_card_id;
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
            SELECT tr.market_id, tr.outcome, count(DISTINCT tr.user_id)::BIGINT AS traders
              FROM public.market_trades tr
              JOIN filtered_markets fm ON fm.market_id = tr.market_id
             GROUP BY tr.market_id, tr.outcome
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
          LEFT JOIN market_traders mt
            ON mt.market_id = a.market_id
           AND mt.outcome = a.outcome
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

    RETURN QUERY
        WITH buckets AS (
            SELECT to_timestamp(
                       floor(extract(epoch FROM tr.created_at) / (p_bucket_minutes * 60))
                       * (p_bucket_minutes * 60)
                   ) AS bucket_start,
                   tr.outcome,
                   count(*)::BIGINT AS trades,
                   sum(tr.shares) AS shares,
                   avg(tr.price_after) AS avg_price,
                   (array_agg(tr.price_after ORDER BY tr.created_at DESC))[1] AS last_price,
                   count(DISTINCT tr.user_id)::BIGINT AS predictors
              FROM public.market_trades tr
             WHERE tr.market_id = p_market_id
             GROUP BY 1, 2
        )
        SELECT b.bucket_start, b.outcome,
               CASE WHEN b.predictors >= 5 THEN b.trades END,
               CASE WHEN b.predictors >= 5 THEN b.shares END,
               CASE WHEN b.predictors >= 5 THEN b.avg_price END,
               CASE WHEN b.predictors >= 5 THEN b.last_price END,
               b.predictors < 5
          FROM buckets b
         ORDER BY b.bucket_start, b.outcome;
END;
$$;
