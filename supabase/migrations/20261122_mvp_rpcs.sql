-- MVP RPCs: organizer management, tickets, rewards, club analytics and
-- ownership-aware market resolution. All mutations are SECURITY DEFINER with
-- an explicit auth.uid()/role check and least-privilege grants.

CREATE OR REPLACE FUNCTION public.require_role(p_role TEXT)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_user_id UUID := auth.uid();
    v_role TEXT;
BEGIN
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'authentication required';
    END IF;

    SELECT role INTO v_role FROM public.profiles WHERE id = v_user_id;

    IF v_role IS DISTINCT FROM p_role THEN
        RAISE EXCEPTION '% authorization required', lower(p_role);
    END IF;

    RETURN v_user_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.create_tournament(
    p_name TEXT,
    p_max_capacity INT,
    p_ticket_allocation INT DEFAULT 100,
    p_ticket_points INT DEFAULT 100
) RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_user_id UUID;
    v_id UUID;
BEGIN
    v_user_id := public.require_role('ORGANIZER');

    IF p_name IS NULL OR length(trim(p_name)) = 0 THEN
        RAISE EXCEPTION 'tournament name required';
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

    INSERT INTO public.tournaments (
        name, max_capacity, current_players, organizer_id,
        ticket_allocation, ticket_points
    ) VALUES (
        trim(p_name), p_max_capacity, 0, v_user_id,
        p_ticket_allocation, p_ticket_points
    )
    RETURNING id INTO v_id;

    INSERT INTO public.audit_events (actor_id, action, entity_type, entity_id, metadata)
    VALUES (v_user_id, 'tournament.create', 'tournament', v_id,
            jsonb_build_object('name', trim(p_name), 'max_capacity', p_max_capacity));

    RETURN v_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.update_tournament(
    p_id UUID,
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
    v_user_id UUID;
    v_owner UUID;
    v_players INT;
    v_tickets INT;
BEGIN
    v_user_id := public.require_role('ORGANIZER');

    SELECT organizer_id, current_players
      INTO v_owner, v_players
      FROM public.tournaments
     WHERE id = p_id
       FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'tournament not found';
    END IF;
    IF v_owner IS DISTINCT FROM v_user_id THEN
        RAISE EXCEPTION 'organizer does not own this tournament';
    END IF;
    IF p_name IS NULL OR length(trim(p_name)) = 0 THEN
        RAISE EXCEPTION 'tournament name required';
    END IF;
    IF p_max_capacity IS NULL OR p_max_capacity < v_players THEN
        RAISE EXCEPTION 'capacity cannot be below current players';
    END IF;
    IF p_ticket_allocation IS NULL OR p_ticket_allocation < 0
       OR p_ticket_points IS NULL OR p_ticket_points < 0 THEN
        RAISE EXCEPTION 'invalid ticket settings';
    END IF;

    SELECT count(*) INTO v_tickets FROM public.tickets WHERE tournament_id = p_id;
    IF p_ticket_allocation < v_tickets THEN
        RAISE EXCEPTION 'ticket allocation cannot be below sold tickets';
    END IF;

    UPDATE public.tournaments
       SET name = trim(p_name),
           max_capacity = p_max_capacity,
           ticket_allocation = p_ticket_allocation,
           ticket_points = p_ticket_points
     WHERE id = p_id;

    INSERT INTO public.audit_events (actor_id, action, entity_type, entity_id, metadata)
    VALUES (v_user_id, 'tournament.update', 'tournament', p_id,
            jsonb_build_object('name', trim(p_name), 'max_capacity', p_max_capacity));
END;
$$;

CREATE OR REPLACE FUNCTION public.create_match(
    p_tournament_id UUID,
    p_home_team TEXT,
    p_away_team TEXT,
    p_kickoff TIMESTAMPTZ
) RETURNS TABLE (match_id UUID, market_id UUID)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_user_id UUID;
    v_owner UUID;
    v_match_id UUID;
    v_market_id UUID;
BEGIN
    v_user_id := public.require_role('ORGANIZER');

    IF p_home_team IS NULL OR length(trim(p_home_team)) = 0
       OR p_away_team IS NULL OR length(trim(p_away_team)) = 0 THEN
        RAISE EXCEPTION 'both teams are required';
    END IF;
    IF p_kickoff IS NULL THEN
        RAISE EXCEPTION 'kickoff time required';
    END IF;

    SELECT organizer_id INTO v_owner
      FROM public.tournaments
     WHERE id = p_tournament_id
       FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'tournament not found';
    END IF;
    IF v_owner IS DISTINCT FROM v_user_id THEN
        RAISE EXCEPTION 'organizer does not own this tournament';
    END IF;

    INSERT INTO public.matches (
        tournament_id, home_team, away_team, status, kickoff_time,
        home_score, away_score
    ) VALUES (
        p_tournament_id, trim(p_home_team), trim(p_away_team), 'SCHEDULED', p_kickoff,
        0, 0
    )
    RETURNING id INTO v_match_id;

    INSERT INTO public.markets (match_id, b)
    VALUES (v_match_id, 100)
    RETURNING id INTO v_market_id;

    INSERT INTO public.audit_events (actor_id, action, entity_type, entity_id, metadata)
    VALUES (v_user_id, 'match.create', 'match', v_match_id,
            jsonb_build_object('tournament_id', p_tournament_id, 'market_id', v_market_id));

    match_id := v_match_id;
    market_id := v_market_id;
    RETURN NEXT;
END;
$$;

CREATE OR REPLACE FUNCTION public.update_match(
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
    v_user_id UUID;
    v_tournament_id UUID;
    v_owner UUID;
BEGIN
    v_user_id := public.require_role('ORGANIZER');

    SELECT m.tournament_id, t.organizer_id
      INTO v_tournament_id, v_owner
      FROM public.matches m
      LEFT JOIN public.tournaments t ON t.id = m.tournament_id
     WHERE m.id = p_match_id
       FOR UPDATE OF m;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'match not found';
    END IF;
    IF v_tournament_id IS NULL THEN
        RAISE EXCEPTION 'match is not linked to a tournament';
    END IF;
    IF v_owner IS DISTINCT FROM v_user_id THEN
        RAISE EXCEPTION 'organizer does not own this match';
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

    INSERT INTO public.audit_events (actor_id, action, entity_type, entity_id, metadata)
    VALUES (v_user_id, 'match.update', 'match', p_match_id,
            jsonb_build_object('home_score', p_home_score, 'away_score', p_away_score, 'status', p_status));
END;
$$;

CREATE OR REPLACE FUNCTION public.organizer_tournament_registrations(p_tournament_id UUID)
RETURNS TABLE (username TEXT, registered_at TIMESTAMPTZ)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_user_id UUID;
    v_owner UUID;
BEGIN
    v_user_id := public.require_role('ORGANIZER');

    SELECT organizer_id INTO v_owner
      FROM public.tournaments
     WHERE id = p_tournament_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'tournament not found';
    END IF;
    IF v_owner IS DISTINCT FROM v_user_id THEN
        RAISE EXCEPTION 'organizer does not own this tournament';
    END IF;

    RETURN QUERY
        SELECT p.username, r.created_at
          FROM public.registrations r
          JOIN public.profiles p ON p.id = r.user_id
         WHERE r.tournament_id = p_tournament_id
         ORDER BY r.created_at;
END;
$$;

CREATE OR REPLACE FUNCTION public.organizer_tournament_tickets(p_tournament_id UUID)
RETURNS TABLE (username TEXT, points_awarded INT, created_at TIMESTAMPTZ)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_user_id UUID;
    v_owner UUID;
BEGIN
    v_user_id := public.require_role('ORGANIZER');

    SELECT organizer_id INTO v_owner
      FROM public.tournaments
     WHERE id = p_tournament_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'tournament not found';
    END IF;
    IF v_owner IS DISTINCT FROM v_user_id THEN
        RAISE EXCEPTION 'organizer does not own this tournament';
    END IF;

    RETURN QUERY
        SELECT p.username, t.points_awarded, t.created_at
          FROM public.tickets t
          JOIN public.profiles p ON p.id = t.user_id
         WHERE t.tournament_id = p_tournament_id
         ORDER BY t.created_at;
END;
$$;

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
    ) THEN
        RAISE EXCEPTION 'ticket already claimed';
    END IF;

    SELECT count(*) INTO v_sold FROM public.tickets WHERE tournament_id = p_tournament_id;
    IF v_sold >= v_allocation THEN
        RAISE EXCEPTION 'tickets sold out';
    END IF;

    INSERT INTO public.tickets (tournament_id, user_id, points_awarded)
    VALUES (p_tournament_id, v_user_id, v_points)
    ON CONFLICT (tournament_id, user_id) DO NOTHING
    RETURNING id INTO v_ticket_id;

    IF v_ticket_id IS NULL THEN
        RAISE EXCEPTION 'ticket already claimed';
    END IF;

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
    v_points INT;
    v_after INT;
    v_code TEXT;
BEGIN
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'authentication required';
    END IF;

    SELECT cost_points, active
      INTO v_cost, v_active
      FROM public.rewards
     WHERE id = p_reward_id
       FOR UPDATE;

    IF NOT FOUND OR NOT v_active THEN
        RAISE EXCEPTION 'reward not available';
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

    INSERT INTO public.audit_events (actor_id, action, entity_type, entity_id, metadata)
    VALUES (v_user_id, 'reward.redeem', 'reward', p_reward_id,
            jsonb_build_object('code', v_code, 'points', v_cost));

    code := v_code;
    points_after := v_after;
    RETURN NEXT;
END;
$$;

CREATE OR REPLACE FUNCTION public.club_analytics_summary(
    p_tournament_id UUID DEFAULT NULL,
    p_match_id UUID DEFAULT NULL
) RETURNS TABLE (
    match_id UUID,
    home_team TEXT,
    away_team TEXT,
    market_id UUID,
    outcome TEXT,
    unique_traders BIGINT,
    trades BIGINT,
    shares NUMERIC,
    last_price NUMERIC,
    suppressed BOOLEAN
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
    PERFORM public.require_role('CLUB');

    RETURN QUERY
        WITH filtered_markets AS (
            SELECT m.id AS market_id, mt.id AS match_id, mt.home_team, mt.away_team
              FROM public.markets m
              JOIN public.matches mt ON mt.id = m.match_id
             WHERE (p_match_id IS NULL OR mt.id = p_match_id)
               AND (p_tournament_id IS NULL OR mt.tournament_id = p_tournament_id)
        ),
        market_traders AS (
            SELECT t.market_id, count(DISTINCT t.user_id)::BIGINT AS traders
              FROM public.market_trades t
              JOIN filtered_markets fm ON fm.market_id = t.market_id
             GROUP BY t.market_id
        ),
        outcomes(outcome) AS (
            VALUES ('HOME'), ('DRAW'), ('AWAY')
        ),
        aggregates AS (
            SELECT fm.market_id, fm.match_id, fm.home_team, fm.away_team, o.outcome,
                   count(t.id)::BIGINT AS trades,
                   coalesce(sum(t.shares), 0) AS shares,
                   (array_agg(t.price_after ORDER BY t.created_at DESC)
                       FILTER (WHERE t.id IS NOT NULL))[1] AS last_price
              FROM filtered_markets fm
              CROSS JOIN outcomes o
              LEFT JOIN public.market_trades t
                ON t.market_id = fm.market_id
               AND t.outcome = o.outcome
             GROUP BY fm.market_id, fm.match_id, fm.home_team, fm.away_team, o.outcome
        )
        SELECT a.match_id, a.home_team, a.away_team, a.market_id, a.outcome,
               CASE WHEN coalesce(mt.traders, 0) >= 5 THEN mt.traders END,
               CASE WHEN coalesce(mt.traders, 0) >= 5 THEN a.trades END,
               CASE WHEN coalesce(mt.traders, 0) >= 5 THEN a.shares END,
               CASE WHEN coalesce(mt.traders, 0) >= 5 THEN a.last_price END,
               coalesce(mt.traders, 0) < 5
          FROM aggregates a
          LEFT JOIN market_traders mt ON mt.market_id = a.market_id
         ORDER BY a.match_id, a.outcome;
END;
$$;

CREATE OR REPLACE FUNCTION public.club_analytics_timeseries(
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
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_traders BIGINT;
BEGIN
    PERFORM public.require_role('CLUB');

    IF p_bucket_minutes IS NULL OR p_bucket_minutes < 1 OR p_bucket_minutes > 60 THEN
        RAISE EXCEPTION 'bucket minutes must be between 1 and 60';
    END IF;

    SELECT count(DISTINCT t.user_id) INTO v_traders
      FROM public.market_trades t
     WHERE t.market_id = p_market_id;

    IF coalesce(v_traders, 0) < 5 THEN
        RETURN;
    END IF;

    RETURN QUERY
        SELECT to_timestamp(
                   floor(extract(epoch FROM t.created_at) / (p_bucket_minutes * 60))
                   * (p_bucket_minutes * 60)
               ) AS bucket_start,
               t.outcome,
               count(*)::BIGINT AS trades,
               sum(t.shares) AS shares,
               avg(t.price_after) AS avg_price,
               (array_agg(t.price_after ORDER BY t.created_at DESC))[1] AS last_price,
               false AS suppressed
          FROM public.market_trades t
         WHERE t.market_id = p_market_id
         GROUP BY 1, 2
         ORDER BY 1, 2;
END;
$$;

CREATE OR REPLACE FUNCTION public.record_club_export(
    p_resource TEXT,
    p_metadata JSONB DEFAULT '{}'::jsonb
) RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_user_id UUID;
BEGIN
    v_user_id := public.require_role('CLUB');

    INSERT INTO public.audit_events (actor_id, action, entity_type, metadata)
    VALUES (v_user_id, 'club.export', p_resource, p_metadata);
END;
$$;

-- Ownership-aware replacement for resolve_market. Legacy markets without a
-- tournament link remain resolvable by any organizer; organizer-created
-- matches are restricted to their owner.
CREATE OR REPLACE FUNCTION public.resolve_market(
    p_market_id UUID,
    p_winner TEXT
) RETURNS TABLE (
    holders INT,
    total_points INT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_user_id UUID := auth.uid();
    v_status TEXT;
    v_tournament_id UUID;
    v_organizer_id UUID;
    v_holder RECORD;
    v_points INT;
    v_holders INT := 0;
    v_total INT := 0;
BEGIN
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'authentication required';
    END IF;

    IF NOT EXISTS (
        SELECT 1
          FROM public.profiles
         WHERE id = v_user_id
           AND role = 'ORGANIZER'
    ) THEN
        RAISE EXCEPTION 'organizer authorization required';
    END IF;
    IF p_winner NOT IN ('HOME', 'DRAW', 'AWAY') THEN
        RAISE EXCEPTION 'invalid outcome';
    END IF;

    SELECT m.status, mt.tournament_id, t.organizer_id
      INTO v_status, v_tournament_id, v_organizer_id
      FROM public.markets m
      JOIN public.matches mt ON mt.id = m.match_id
      LEFT JOIN public.tournaments t ON t.id = mt.tournament_id
     WHERE m.id = p_market_id
       FOR UPDATE OF m;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'market not found';
    END IF;
    IF v_tournament_id IS NOT NULL AND v_organizer_id IS DISTINCT FROM v_user_id THEN
        RAISE EXCEPTION 'organizer does not own this market';
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

    INSERT INTO public.audit_events (actor_id, action, entity_type, entity_id, metadata)
    VALUES (v_user_id, 'market.resolve', 'market', p_market_id,
            jsonb_build_object('winner', p_winner, 'holders', v_holders, 'points', v_total));

    holders := v_holders;
    total_points := v_total;
    RETURN NEXT;
END;
$$;

REVOKE ALL ON FUNCTION public.require_role(TEXT) FROM PUBLIC, anon, authenticated;

REVOKE ALL ON FUNCTION public.create_tournament(TEXT, INT, INT, INT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.create_tournament(TEXT, INT, INT, INT) TO authenticated;

REVOKE ALL ON FUNCTION public.update_tournament(UUID, TEXT, INT, INT, INT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.update_tournament(UUID, TEXT, INT, INT, INT) TO authenticated;

REVOKE ALL ON FUNCTION public.create_match(UUID, TEXT, TEXT, TIMESTAMPTZ) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.create_match(UUID, TEXT, TEXT, TIMESTAMPTZ) TO authenticated;

REVOKE ALL ON FUNCTION public.update_match(UUID, INT, INT, TEXT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.update_match(UUID, INT, INT, TEXT) TO authenticated;

REVOKE ALL ON FUNCTION public.organizer_tournament_registrations(UUID) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.organizer_tournament_registrations(UUID) TO authenticated;

REVOKE ALL ON FUNCTION public.organizer_tournament_tickets(UUID) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.organizer_tournament_tickets(UUID) TO authenticated;

REVOKE ALL ON FUNCTION public.claim_ticket(UUID) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.claim_ticket(UUID) TO authenticated;

REVOKE ALL ON FUNCTION public.redeem_reward(UUID) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.redeem_reward(UUID) TO authenticated;

REVOKE ALL ON FUNCTION public.club_analytics_summary(UUID, UUID) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.club_analytics_summary(UUID, UUID) TO authenticated;

REVOKE ALL ON FUNCTION public.club_analytics_timeseries(UUID, INT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.club_analytics_timeseries(UUID, INT) TO authenticated;

REVOKE ALL ON FUNCTION public.record_club_export(TEXT, JSONB) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.record_club_export(TEXT, JSONB) TO authenticated;

REVOKE ALL ON FUNCTION public.resolve_market(UUID, TEXT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.resolve_market(UUID, TEXT) TO authenticated;

GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO service_role;
