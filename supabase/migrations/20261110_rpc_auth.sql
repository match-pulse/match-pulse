-- Authorization for the state-changing RPCs.
-- ADR-003: docs/architecture/adr/003-authorization-rls.md
--
-- The functions are SECURITY DEFINER because direct table writes are revoked.
-- Every function checks auth.uid(); resolve_market also requires the organizer
-- role. The search_path is fixed so a caller cannot shadow the relations or
-- functions the body uses.

DROP FUNCTION IF EXISTS public.register_for_tournament(UUID, UUID);
DROP FUNCTION IF EXISTS public.open_trade(UUID, UUID, TEXT, INT);
DROP FUNCTION IF EXISTS public.close_trade(UUID, UUID, TEXT, NUMERIC);
DROP FUNCTION IF EXISTS public.resolve_market(UUID, TEXT);

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
    v_registration_id UUID;
BEGIN
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'authentication required';
    END IF;

    -- Lock the tournament row for the remainder of this transaction.
    SELECT current_players, max_capacity
      INTO v_current_players, v_max_capacity
      FROM public.tournaments
     WHERE id = p_tournament_id
       FOR UPDATE;

    IF NOT FOUND THEN
        RETURN false;
    END IF;

    IF v_current_players >= v_max_capacity THEN
        RETURN false;
    END IF;

    -- A subtransaction: a duplicate rolls back the insert without aborting the
    -- call, so the caller receives a refusal instead of an exception.
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

CREATE OR REPLACE FUNCTION public.open_trade(
    p_market_id UUID,
    p_outcome TEXT,
    p_budget INT
) RETURNS TABLE (
    shares NUMERIC,
    cost INT,
    price_before NUMERIC,
    price_after NUMERIC,
    points_after INT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_user_id UUID := auth.uid();
    v_b NUMERIC;
    v_qh NUMERIC;
    v_qd NUMERIC;
    v_qa NUMERIC;
    v_status TEXT;
    v_kickoff TIMESTAMPTZ;
    v_points INT;
    v_level INT := 0;
    v_next TIMESTAMPTZ;
    v_effective_level INT;
    v_cost_before NUMERIC;
    v_cost_after NUMERIC;
    v_delta_cap NUMERIC;
    v_low NUMERIC;
    v_high NUMERIC;
    v_mid NUMERIC;
    v_shares NUMERIC;
    v_cost INT;
    v_price_before NUMERIC;
    v_price_after NUMERIC;
    v_points_after INT;
    v_wait INT;
    i INT;
BEGIN
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'authentication required';
    END IF;
    IF p_outcome NOT IN ('HOME', 'DRAW', 'AWAY') THEN
        RAISE EXCEPTION 'invalid outcome';
    END IF;
    IF p_budget IS NULL OR p_budget < 1 THEN
        RAISE EXCEPTION 'invalid budget';
    END IF;

    SELECT m.b, m.q_home, m.q_draw, m.q_away, m.status, mt.kickoff_time
      INTO v_b, v_qh, v_qd, v_qa, v_status, v_kickoff
      FROM public.markets m
      JOIN public.matches mt ON mt.id = m.match_id
     WHERE m.id = p_market_id
       FOR UPDATE OF m;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'market not found';
    END IF;
    IF v_status <> 'OPEN' THEN
        RAISE EXCEPTION 'market is not open';
    END IF;
    IF NOW() < v_kickoff THEN
        RAISE EXCEPTION 'market has not opened';
    END IF;
    IF GREATEST(v_qh, v_qd, v_qa) / v_b > 25 THEN
        RAISE EXCEPTION 'market quantity limit reached';
    END IF;

    SELECT points INTO v_points
      FROM public.profiles
     WHERE id = v_user_id
       FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'profile not found';
    END IF;

    SELECT level, next_entry_at INTO v_level, v_next
      FROM public.market_entry_cooldowns
     WHERE market_id = p_market_id AND user_id = v_user_id
       FOR UPDATE;

    IF v_next IS NOT NULL THEN
        IF NOW() < v_next THEN
            RAISE EXCEPTION 'entry cooldown active';
        END IF;
        v_effective_level := GREATEST(
            0,
            v_level - FLOOR(EXTRACT(EPOCH FROM (NOW() - v_next)) / 300)::INT
        );
    ELSE
        v_effective_level := 0;
    END IF;

    v_cost_before := public.market_cost(v_b, v_qh, v_qd, v_qa);

    CASE p_outcome
        WHEN 'HOME' THEN v_price_before := public.market_price(v_qh, v_b, v_qh, v_qd, v_qa);
        WHEN 'DRAW' THEN v_price_before := public.market_price(v_qd, v_b, v_qh, v_qd, v_qa);
        WHEN 'AWAY' THEN v_price_before := public.market_price(v_qa, v_b, v_qh, v_qd, v_qa);
    END CASE;

    v_delta_cap := 25 * v_b
        - CASE p_outcome WHEN 'HOME' THEN v_qh WHEN 'DRAW' THEN v_qd ELSE v_qa END;

    IF v_delta_cap <= 0 THEN
        RAISE EXCEPTION 'market quantity limit reached';
    END IF;

    IF public.market_cost(
           v_b,
           v_qh + CASE WHEN p_outcome = 'HOME' THEN v_delta_cap ELSE 0 END,
           v_qd + CASE WHEN p_outcome = 'DRAW' THEN v_delta_cap ELSE 0 END,
           v_qa + CASE WHEN p_outcome = 'AWAY' THEN v_delta_cap ELSE 0 END
       ) - v_cost_before <= p_budget THEN
        v_shares := v_delta_cap;
    ELSE
        v_low := 0;
        v_high := v_delta_cap;
        FOR i IN 1..60 LOOP
            v_mid := (v_low + v_high) / 2;
            IF public.market_cost(
                   v_b,
                   v_qh + CASE WHEN p_outcome = 'HOME' THEN v_mid ELSE 0 END,
                   v_qd + CASE WHEN p_outcome = 'DRAW' THEN v_mid ELSE 0 END,
                   v_qa + CASE WHEN p_outcome = 'AWAY' THEN v_mid ELSE 0 END
               ) - v_cost_before <= p_budget THEN
                v_low := v_mid;
            ELSE
                v_high := v_mid;
            END IF;
        END LOOP;
        v_shares := TRUNC(v_low * 100000000) / 100000000;
    END IF;

    IF v_shares <= 0 THEN
        RAISE EXCEPTION 'budget too small';
    END IF;

    v_cost_after := public.market_cost(
        v_b,
        v_qh + CASE WHEN p_outcome = 'HOME' THEN v_shares ELSE 0 END,
        v_qd + CASE WHEN p_outcome = 'DRAW' THEN v_shares ELSE 0 END,
        v_qa + CASE WHEN p_outcome = 'AWAY' THEN v_shares ELSE 0 END
    );
    v_cost := CEIL(v_cost_after - v_cost_before)::INT;

    -- Shrink by one share unit if rounding pushed the debit above the budget.
    i := 0;
    WHILE v_cost > p_budget AND v_shares > 0 AND i < 100 LOOP
        v_shares := TRUNC(v_shares * 100000000 - 1) / 100000000;
        v_cost_after := public.market_cost(
            v_b,
            v_qh + CASE WHEN p_outcome = 'HOME' THEN v_shares ELSE 0 END,
            v_qd + CASE WHEN p_outcome = 'DRAW' THEN v_shares ELSE 0 END,
            v_qa + CASE WHEN p_outcome = 'AWAY' THEN v_shares ELSE 0 END
        );
        v_cost := CEIL(v_cost_after - v_cost_before)::INT;
        i := i + 1;
    END LOOP;

    IF v_cost > p_budget OR v_shares <= 0 THEN
        RAISE EXCEPTION 'budget too small';
    END IF;
    IF v_cost > v_points THEN
        RAISE EXCEPTION 'insufficient points';
    END IF;

    CASE p_outcome
        WHEN 'HOME' THEN v_qh := v_qh + v_shares;
        WHEN 'DRAW' THEN v_qd := v_qd + v_shares;
        WHEN 'AWAY' THEN v_qa := v_qa + v_shares;
    END CASE;

    CASE p_outcome
        WHEN 'HOME' THEN v_price_after := public.market_price(v_qh, v_b, v_qh, v_qd, v_qa);
        WHEN 'DRAW' THEN v_price_after := public.market_price(v_qd, v_b, v_qh, v_qd, v_qa);
        WHEN 'AWAY' THEN v_price_after := public.market_price(v_qa, v_b, v_qh, v_qd, v_qa);
    END CASE;

    UPDATE public.profiles
       SET points = points - v_cost
     WHERE id = v_user_id
       AND points >= v_cost
    RETURNING points INTO v_points_after;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'insufficient points';
    END IF;

    INSERT INTO public.market_positions (market_id, user_id, outcome, shares, cost_basis)
    VALUES (p_market_id, v_user_id, p_outcome, v_shares, v_cost)
    ON CONFLICT (market_id, user_id, outcome) DO UPDATE
        SET shares = public.market_positions.shares + EXCLUDED.shares,
            cost_basis = public.market_positions.cost_basis + EXCLUDED.cost_basis,
            updated_at = NOW();

    UPDATE public.markets
       SET q_home = v_qh,
           q_draw = v_qd,
           q_away = v_qa
     WHERE id = p_market_id;

    INSERT INTO public.market_trades (
        market_id, user_id, outcome, kind, shares,
        cost_points, proceeds_points, price_before, price_after, points_after
    ) VALUES (
        p_market_id, v_user_id, p_outcome, 'BUY', v_shares,
        v_cost, 0, v_price_before, v_price_after, v_points_after
    );

    v_wait := public.market_cooldown_seconds(v_effective_level);

    INSERT INTO public.market_entry_cooldowns (market_id, user_id, level, next_entry_at)
    VALUES (p_market_id, v_user_id, LEAST(v_effective_level + 1, 40),
            NOW() + MAKE_INTERVAL(secs => v_wait))
    ON CONFLICT (market_id, user_id) DO UPDATE
        SET level = LEAST(v_effective_level + 1, 40),
            next_entry_at = EXCLUDED.next_entry_at,
            updated_at = NOW();

    shares := v_shares;
    cost := v_cost;
    price_before := v_price_before;
    price_after := v_price_after;
    points_after := v_points_after;
    RETURN NEXT;
END;
$$;

CREATE OR REPLACE FUNCTION public.close_trade(
    p_market_id UUID,
    p_outcome TEXT,
    p_shares NUMERIC
) RETURNS TABLE (
    proceeds INT,
    price_before NUMERIC,
    price_after NUMERIC,
    points_after INT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_user_id UUID := auth.uid();
    v_b NUMERIC;
    v_qh NUMERIC;
    v_qd NUMERIC;
    v_qa NUMERIC;
    v_status TEXT;
    v_kickoff TIMESTAMPTZ;
    v_held NUMERIC;
    v_basis NUMERIC;
    v_remaining NUMERIC;
    v_new_basis NUMERIC;
    v_cost_before NUMERIC;
    v_cost_after NUMERIC;
    v_proceeds INT;
    v_price_before NUMERIC;
    v_price_after NUMERIC;
    v_points_after INT;
BEGIN
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'authentication required';
    END IF;
    IF p_outcome NOT IN ('HOME', 'DRAW', 'AWAY') THEN
        RAISE EXCEPTION 'invalid outcome';
    END IF;
    IF p_shares IS NULL OR p_shares <= 0 THEN
        RAISE EXCEPTION 'invalid shares';
    END IF;

    SELECT m.b, m.q_home, m.q_draw, m.q_away, m.status, mt.kickoff_time
      INTO v_b, v_qh, v_qd, v_qa, v_status, v_kickoff
      FROM public.markets m
      JOIN public.matches mt ON mt.id = m.match_id
     WHERE m.id = p_market_id
       FOR UPDATE OF m;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'market not found';
    END IF;
    IF v_status <> 'OPEN' THEN
        RAISE EXCEPTION 'market is not open';
    END IF;
    IF NOW() < v_kickoff THEN
        RAISE EXCEPTION 'market has not opened';
    END IF;

    SELECT points INTO v_points_after
      FROM public.profiles
     WHERE id = v_user_id
       FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'profile not found';
    END IF;

    SELECT shares, cost_basis INTO v_held, v_basis
      FROM public.market_positions
     WHERE market_id = p_market_id
       AND user_id = v_user_id
       AND outcome = p_outcome
       FOR UPDATE;

    IF NOT FOUND OR v_held < p_shares THEN
        RAISE EXCEPTION 'insufficient shares';
    END IF;

    CASE p_outcome
        WHEN 'HOME' THEN v_price_before := public.market_price(v_qh, v_b, v_qh, v_qd, v_qa);
        WHEN 'DRAW' THEN v_price_before := public.market_price(v_qd, v_b, v_qh, v_qd, v_qa);
        WHEN 'AWAY' THEN v_price_before := public.market_price(v_qa, v_b, v_qh, v_qd, v_qa);
    END CASE;

    v_cost_before := public.market_cost(v_b, v_qh, v_qd, v_qa);

    CASE p_outcome
        WHEN 'HOME' THEN v_qh := v_qh - p_shares;
        WHEN 'DRAW' THEN v_qd := v_qd - p_shares;
        WHEN 'AWAY' THEN v_qa := v_qa - p_shares;
    END CASE;

    v_cost_after := public.market_cost(v_b, v_qh, v_qd, v_qa);
    v_proceeds := GREATEST(0, FLOOR(v_cost_before - v_cost_after))::INT;

    CASE p_outcome
        WHEN 'HOME' THEN v_price_after := public.market_price(v_qh, v_b, v_qh, v_qd, v_qa);
        WHEN 'DRAW' THEN v_price_after := public.market_price(v_qd, v_b, v_qh, v_qd, v_qa);
        WHEN 'AWAY' THEN v_price_after := public.market_price(v_qa, v_b, v_qh, v_qd, v_qa);
    END CASE;

    v_remaining := v_held - p_shares;
    v_new_basis := CASE
        WHEN v_held = 0 THEN 0
        ELSE ROUND(v_basis * v_remaining / v_held, 8)
    END;

    UPDATE public.market_positions
       SET shares = v_remaining,
           cost_basis = v_new_basis,
           updated_at = NOW()
     WHERE market_id = p_market_id
       AND user_id = v_user_id
       AND outcome = p_outcome;

    UPDATE public.markets
       SET q_home = v_qh,
           q_draw = v_qd,
           q_away = v_qa
     WHERE id = p_market_id;

    UPDATE public.profiles
       SET points = points + v_proceeds
     WHERE id = v_user_id
    RETURNING points INTO v_points_after;

    INSERT INTO public.market_trades (
        market_id, user_id, outcome, kind, shares,
        cost_points, proceeds_points, price_before, price_after, points_after
    ) VALUES (
        p_market_id, v_user_id, p_outcome, 'SELL', p_shares,
        0, v_proceeds, v_price_before, v_price_after, v_points_after
    );

    proceeds := v_proceeds;
    price_before := v_price_before;
    price_after := v_price_after;
    points_after := v_points_after;
    RETURN NEXT;
END;
$$;

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

    SELECT status INTO v_status
      FROM public.markets
     WHERE id = p_market_id
       FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'market not found';
    END IF;
    IF v_status <> 'OPEN' THEN
        RAISE EXCEPTION 'market already resolved';
    END IF;

    -- Deterministic profile lock order; the market lock already excludes
    -- concurrent trades in this market.
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

    holders := v_holders;
    total_points := v_total;
    RETURN NEXT;
END;
$$;

-- Mutations are authenticated-only. resolve_market grants execute to every
-- authenticated user, then checks the organizer role inside the function.
REVOKE ALL ON FUNCTION public.register_for_tournament(UUID) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.register_for_tournament(UUID) TO authenticated;

REVOKE ALL ON FUNCTION public.open_trade(UUID, TEXT, INT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.open_trade(UUID, TEXT, INT) TO authenticated;

REVOKE ALL ON FUNCTION public.close_trade(UUID, TEXT, NUMERIC) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.close_trade(UUID, TEXT, NUMERIC) TO authenticated;

REVOKE ALL ON FUNCTION public.resolve_market(UUID, TEXT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.resolve_market(UUID, TEXT) TO authenticated;
