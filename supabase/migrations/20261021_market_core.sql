-- Live prediction market: schema and LMSR trade engine.
-- Decisions and alternatives: docs/architecture/adr/002-live-prediction-market.md.
-- Invariants: M-INV1-M-INV8 in docs/methodology/checkpoint-A/02-invariants.md.

CREATE TABLE public.markets (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    match_id UUID NOT NULL UNIQUE REFERENCES public.matches(id) ON DELETE CASCADE,
    b NUMERIC(12,4) NOT NULL DEFAULT 100 CHECK (b > 0),
    q_home NUMERIC(30,8) NOT NULL DEFAULT 0,
    q_draw NUMERIC(30,8) NOT NULL DEFAULT 0,
    q_away NUMERIC(30,8) NOT NULL DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'OPEN' CHECK (status IN ('OPEN', 'RESOLVED')),
    winning_outcome TEXT CHECK (winning_outcome IN ('HOME', 'DRAW', 'AWAY')),
    resolved_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT markets_resolution_state CHECK (
        (status = 'OPEN' AND winning_outcome IS NULL AND resolved_at IS NULL)
        OR
        (status = 'RESOLVED' AND winning_outcome IS NOT NULL AND resolved_at IS NOT NULL)
    )
);

CREATE TABLE public.market_positions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    market_id UUID NOT NULL REFERENCES public.markets(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    outcome TEXT NOT NULL CHECK (outcome IN ('HOME', 'DRAW', 'AWAY')),
    shares NUMERIC(30,8) NOT NULL DEFAULT 0 CHECK (shares >= 0),
    cost_basis NUMERIC(20,8) NOT NULL DEFAULT 0 CHECK (cost_basis >= 0),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (market_id, user_id, outcome)
);

-- Analytics of record: time, outcome, size, implied odds before and after.
CREATE TABLE public.market_trades (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    market_id UUID NOT NULL REFERENCES public.markets(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    outcome TEXT NOT NULL CHECK (outcome IN ('HOME', 'DRAW', 'AWAY')),
    kind TEXT NOT NULL CHECK (kind IN ('BUY', 'SELL')),
    shares NUMERIC(30,8) NOT NULL CHECK (shares > 0),
    cost_points INT NOT NULL DEFAULT 0 CHECK (cost_points >= 0),
    proceeds_points INT NOT NULL DEFAULT 0 CHECK (proceeds_points >= 0),
    price_before NUMERIC(18,12) NOT NULL CHECK (price_before BETWEEN 0 AND 1),
    price_after NUMERIC(18,12) NOT NULL CHECK (price_after BETWEEN 0 AND 1),
    points_after INT NOT NULL CHECK (points_after >= 0),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT market_trades_flow CHECK (
        (kind = 'BUY' AND cost_points > 0 AND proceeds_points = 0)
        OR
        (kind = 'SELL' AND cost_points = 0 AND proceeds_points >= 0)
    )
);

CREATE INDEX market_trades_market_created_idx
    ON public.market_trades (market_id, created_at);

CREATE TABLE public.market_entry_cooldowns (
    market_id UUID NOT NULL REFERENCES public.markets(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    level INT NOT NULL DEFAULT 0 CHECK (level BETWEEN 0 AND 40),
    next_entry_at TIMESTAMPTZ NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (market_id, user_id)
);

-- 5 s for the first re-entry, then +15 s per accepted entry, capped at 600 s.
CREATE OR REPLACE FUNCTION public.market_cooldown_seconds(p_level INT)
RETURNS INT
LANGUAGE sql
IMMUTABLE
AS $$
    SELECT LEAST(600, CASE WHEN p_level <= 0 THEN 5 ELSE 15 + (p_level - 1) * 15 END);
$$;

CREATE OR REPLACE FUNCTION public.market_cost(
    p_b NUMERIC,
    p_q_home NUMERIC,
    p_q_draw NUMERIC,
    p_q_away NUMERIC
) RETURNS NUMERIC
LANGUAGE sql
IMMUTABLE
AS $$
    SELECT p_b * LN(EXP(p_q_home / p_b) + EXP(p_q_draw / p_b) + EXP(p_q_away / p_b));
$$;

CREATE OR REPLACE FUNCTION public.market_price(
    p_q NUMERIC,
    p_b NUMERIC,
    p_q_home NUMERIC,
    p_q_draw NUMERIC,
    p_q_away NUMERIC
) RETURNS NUMERIC
LANGUAGE sql
IMMUTABLE
AS $$
    SELECT EXP(p_q / p_b)
         / (EXP(p_q_home / p_b) + EXP(p_q_draw / p_b) + EXP(p_q_away / p_b));
$$;

-- Enter a position with a point budget. The largest share quantity whose cost
-- fits the budget is solved from the cost curve and debited with ceil.
CREATE OR REPLACE FUNCTION public.open_trade(
    p_market_id UUID,
    p_user_id UUID,
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
SECURITY INVOKER
AS $$
DECLARE
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
     WHERE id = p_user_id
       FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'profile not found';
    END IF;

    SELECT level, next_entry_at INTO v_level, v_next
      FROM public.market_entry_cooldowns
     WHERE market_id = p_market_id AND user_id = p_user_id
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
     WHERE id = p_user_id
       AND points >= v_cost
    RETURNING points INTO v_points_after;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'insufficient points';
    END IF;

    INSERT INTO public.market_positions (market_id, user_id, outcome, shares, cost_basis)
    VALUES (p_market_id, p_user_id, p_outcome, v_shares, v_cost)
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
        p_market_id, p_user_id, p_outcome, 'BUY', v_shares,
        v_cost, 0, v_price_before, v_price_after, v_points_after
    );

    v_wait := public.market_cooldown_seconds(v_effective_level);

    INSERT INTO public.market_entry_cooldowns (market_id, user_id, level, next_entry_at)
    VALUES (p_market_id, p_user_id, LEAST(v_effective_level + 1, 40),
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

-- Exit a position at the current curve price. No cooldown, no fee.
CREATE OR REPLACE FUNCTION public.close_trade(
    p_market_id UUID,
    p_user_id UUID,
    p_outcome TEXT,
    p_shares NUMERIC
) RETURNS TABLE (
    proceeds INT,
    price_before NUMERIC,
    price_after NUMERIC,
    points_after INT
)
LANGUAGE plpgsql
SECURITY INVOKER
AS $$
DECLARE
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
     WHERE id = p_user_id
       FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'profile not found';
    END IF;

    SELECT shares, cost_basis INTO v_held, v_basis
      FROM public.market_positions
     WHERE market_id = p_market_id
       AND user_id = p_user_id
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
       AND user_id = p_user_id
       AND outcome = p_outcome;

    UPDATE public.markets
       SET q_home = v_qh,
           q_draw = v_qd,
           q_away = v_qa
     WHERE id = p_market_id;

    UPDATE public.profiles
       SET points = points + v_proceeds
     WHERE id = p_user_id
    RETURNING points INTO v_points_after;

    INSERT INTO public.market_trades (
        market_id, user_id, outcome, kind, shares,
        cost_points, proceeds_points, price_before, price_after, points_after
    ) VALUES (
        p_market_id, p_user_id, p_outcome, 'SELL', p_shares,
        0, v_proceeds, v_price_before, v_price_after, v_points_after
    );

    proceeds := v_proceeds;
    price_before := v_price_before;
    price_after := v_price_after;
    points_after := v_points_after;
    RETURN NEXT;
END;
$$;
