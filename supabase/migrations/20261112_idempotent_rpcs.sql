-- Idempotent entry/exit RPCs.
-- Execution plan: docs/methodology/exec-plans/107-idempotent-trades.md
-- Invariant: M-INV9.
--
-- The request ID is optional for compatibility. The application always sends
-- one. A request row is claimed before the trade work; the request and trade
-- commit or roll back together. A completed request replays the recorded trade.

DROP FUNCTION IF EXISTS public.open_trade(UUID, TEXT, INT);
DROP FUNCTION IF EXISTS public.close_trade(UUID, TEXT, NUMERIC);

CREATE OR REPLACE FUNCTION public.open_trade(
    p_market_id UUID,
    p_outcome TEXT,
    p_budget INT,
    p_request_id UUID DEFAULT NULL
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
    v_trade_id UUID;
    v_claimed_user UUID;
    v_request_done BOOLEAN := false;
    v_claim_attempt INT;
    v_existing_kind TEXT;
    v_existing_market_id UUID;
    v_existing_outcome TEXT;
    v_existing_budget INT;
    v_existing_status TEXT;
    v_existing_trade_id UUID;
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

    IF p_request_id IS NOT NULL THEN
        FOR v_claim_attempt IN 1..5 LOOP
            v_claimed_user := NULL;

            INSERT INTO public.trade_requests (
                user_id, request_id, kind, market_id, outcome, budget
            ) VALUES (
                v_user_id, p_request_id, 'OPEN', p_market_id, p_outcome, p_budget
            )
            ON CONFLICT (user_id, request_id) DO NOTHING
            RETURNING user_id INTO v_claimed_user;

            IF v_claimed_user IS NOT NULL THEN
                v_request_done := true;
                EXIT;
            END IF;

            SELECT kind, market_id, outcome, budget, status, trade_id
              INTO v_existing_kind, v_existing_market_id, v_existing_outcome,
                   v_existing_budget, v_existing_status, v_existing_trade_id
              FROM public.trade_requests
             WHERE user_id = v_user_id
               AND request_id = p_request_id
               FOR UPDATE;

            IF NOT FOUND THEN
                CONTINUE;
            END IF;

            IF v_existing_kind <> 'OPEN'
               OR v_existing_market_id <> p_market_id
               OR v_existing_outcome <> p_outcome
               OR v_existing_budget <> p_budget THEN
                RAISE EXCEPTION 'request id reused with a different payload';
            END IF;

            IF v_existing_status = 'COMPLETED' THEN
                SELECT shares, cost_points, price_before, price_after, points_after
                  INTO v_shares, v_cost, v_price_before, v_price_after, v_points_after
                  FROM public.market_trades
                 WHERE id = v_existing_trade_id;

                IF NOT FOUND THEN
                    RAISE EXCEPTION 'request trade not found';
                END IF;

                RETURN NEXT;
                RETURN;
            END IF;

            RAISE EXCEPTION 'request still in progress';
        END LOOP;

        IF NOT v_request_done THEN
            RAISE EXCEPTION 'request could not be claimed';
        END IF;
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
    )
    RETURNING id INTO v_trade_id;

    IF p_request_id IS NOT NULL THEN
        UPDATE public.trade_requests
           SET status = 'COMPLETED',
               trade_id = v_trade_id,
               completed_at = NOW()
         WHERE user_id = v_user_id
           AND request_id = p_request_id;
    END IF;

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
    p_shares NUMERIC,
    p_request_id UUID DEFAULT NULL
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
    v_trade_id UUID;
    v_claimed_user UUID;
    v_request_done BOOLEAN := false;
    v_claim_attempt INT;
    v_existing_kind TEXT;
    v_existing_market_id UUID;
    v_existing_outcome TEXT;
    v_existing_shares NUMERIC;
    v_existing_status TEXT;
    v_existing_trade_id UUID;
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

    IF p_request_id IS NOT NULL THEN
        FOR v_claim_attempt IN 1..5 LOOP
            v_claimed_user := NULL;

            INSERT INTO public.trade_requests (
                user_id, request_id, kind, market_id, outcome, shares
            ) VALUES (
                v_user_id, p_request_id, 'CLOSE', p_market_id, p_outcome, p_shares
            )
            ON CONFLICT (user_id, request_id) DO NOTHING
            RETURNING user_id INTO v_claimed_user;

            IF v_claimed_user IS NOT NULL THEN
                v_request_done := true;
                EXIT;
            END IF;

            SELECT kind, market_id, outcome, shares, status, trade_id
              INTO v_existing_kind, v_existing_market_id, v_existing_outcome,
                   v_existing_shares, v_existing_status, v_existing_trade_id
              FROM public.trade_requests
             WHERE user_id = v_user_id
               AND request_id = p_request_id
               FOR UPDATE;

            IF NOT FOUND THEN
                CONTINUE;
            END IF;

            IF v_existing_kind <> 'CLOSE'
               OR v_existing_market_id <> p_market_id
               OR v_existing_outcome <> p_outcome
               OR v_existing_shares <> p_shares THEN
                RAISE EXCEPTION 'request id reused with a different payload';
            END IF;

            IF v_existing_status = 'COMPLETED' THEN
                SELECT proceeds_points, price_before, price_after, points_after
                  INTO v_proceeds, v_price_before, v_price_after, v_points_after
                  FROM public.market_trades
                 WHERE id = v_existing_trade_id;

                IF NOT FOUND THEN
                    RAISE EXCEPTION 'request trade not found';
                END IF;

                RETURN NEXT;
                RETURN;
            END IF;

            RAISE EXCEPTION 'request still in progress';
        END LOOP;

        IF NOT v_request_done THEN
            RAISE EXCEPTION 'request could not be claimed';
        END IF;
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
    )
    RETURNING id INTO v_trade_id;

    IF p_request_id IS NOT NULL THEN
        UPDATE public.trade_requests
           SET status = 'COMPLETED',
               trade_id = v_trade_id,
               completed_at = NOW()
         WHERE user_id = v_user_id
           AND request_id = p_request_id;
    END IF;

    proceeds := v_proceeds;
    price_before := v_price_before;
    price_after := v_price_after;
    points_after := v_points_after;
    RETURN NEXT;
END;
$$;

REVOKE ALL ON FUNCTION public.open_trade(UUID, TEXT, INT, UUID) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.open_trade(UUID, TEXT, INT, UUID) TO authenticated;

REVOKE ALL ON FUNCTION public.close_trade(UUID, TEXT, NUMERIC, UUID) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.close_trade(UUID, TEXT, NUMERIC, UUID) TO authenticated;

GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO service_role;
