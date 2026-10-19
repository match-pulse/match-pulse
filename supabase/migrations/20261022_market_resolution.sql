-- Market resolution: terminal payout, recorded once per holder.
-- Invariants: M-INV1 (window closes), M-INV6 (exactly one point per winning
-- share, once). The market row is locked for the whole operation, so entries
-- and exits either complete before resolution or see RESOLVED and refuse.

CREATE TABLE public.market_payouts (
    market_id UUID NOT NULL REFERENCES public.markets(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    shares NUMERIC(30,8) NOT NULL CHECK (shares >= 0),
    points INT NOT NULL CHECK (points >= 0),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (market_id, user_id)
);

-- Winning shares pay one point each, rounded down to whole points, once per
-- holder. Losing shares pay nothing. No commission is deducted.
CREATE OR REPLACE FUNCTION public.resolve_market(
    p_market_id UUID,
    p_winner TEXT
) RETURNS TABLE (
    holders INT,
    total_points INT
)
LANGUAGE plpgsql
SECURITY INVOKER
AS $$
DECLARE
    v_status TEXT;
    v_holder RECORD;
    v_points INT;
    v_holders INT := 0;
    v_total INT := 0;
BEGIN
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
