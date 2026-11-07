-- Row Level Security and least-privilege grants.
-- ADR-003: docs/architecture/adr/003-authorization-rls.md
--
-- Public read: tournaments, matches, markets and the public trade feed.
-- Private read: a user's own profile, registration, positions, trades,
-- payouts and cooldown. Direct writes are revoked; mutations go through the
-- authorized RPCs in 20261110_rpc_auth.sql.

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tournaments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.registrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.matches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.markets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.market_positions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.market_trades ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.market_entry_cooldowns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.market_payouts ENABLE ROW LEVEL SECURITY;

-- Remove the default Data API privileges. The grants below are the complete
-- read surface; there are deliberately no insert/update/delete grants.
REVOKE ALL ON TABLE
    public.profiles,
    public.tournaments,
    public.registrations,
    public.matches,
    public.markets,
    public.market_positions,
    public.market_trades,
    public.market_entry_cooldowns,
    public.market_payouts
FROM anon, authenticated;

REVOKE ALL ON ALL FUNCTIONS IN SCHEMA public FROM PUBLIC, anon, authenticated;
REVOKE ALL ON ALL SEQUENCES IN SCHEMA public FROM anon, authenticated;

-- Public read surface.
GRANT SELECT ON public.tournaments, public.matches, public.markets
TO anon, authenticated;

-- Private read surface; RLS below restricts each row to its owner.
GRANT SELECT ON
    public.profiles,
    public.registrations,
    public.market_positions,
    public.market_trades,
    public.market_payouts,
    public.market_entry_cooldowns
TO authenticated;

CREATE POLICY profiles_select_own
    ON public.profiles
    FOR SELECT
    TO authenticated
    USING (id = auth.uid());

CREATE POLICY registrations_select_own
    ON public.registrations
    FOR SELECT
    TO authenticated
    USING (user_id = auth.uid());

CREATE POLICY market_positions_select_own
    ON public.market_positions
    FOR SELECT
    TO authenticated
    USING (user_id = auth.uid());

CREATE POLICY market_trades_select_own
    ON public.market_trades
    FOR SELECT
    TO authenticated
    USING (user_id = auth.uid());

CREATE POLICY market_payouts_select_own
    ON public.market_payouts
    FOR SELECT
    TO authenticated
    USING (user_id = auth.uid());

CREATE POLICY market_entry_cooldowns_select_own
    ON public.market_entry_cooldowns
    FOR SELECT
    TO authenticated
    USING (user_id = auth.uid());

CREATE POLICY tournaments_select_public
    ON public.tournaments
    FOR SELECT
    TO anon, authenticated
    USING (true);

CREATE POLICY matches_select_public
    ON public.matches
    FOR SELECT
    TO anon, authenticated
    USING (true);

CREATE POLICY markets_select_public
    ON public.markets
    FOR SELECT
    TO anon, authenticated
    USING (true);

-- Public trade feed: recent trades for one market, without identity or
-- per-user balance. The function is intentionally SECURITY DEFINER because the
-- underlying market_trades table is owner-only; it returns only safe columns.
CREATE OR REPLACE FUNCTION public.market_public_trades(p_market_id UUID)
RETURNS TABLE (
    id UUID,
    market_id UUID,
    outcome TEXT,
    kind TEXT,
    shares NUMERIC,
    cost_points INT,
    proceeds_points INT,
    price_before NUMERIC,
    price_after NUMERIC,
    created_at TIMESTAMPTZ
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
    SELECT t.id,
           t.market_id,
           t.outcome,
           t.kind,
           t.shares,
           t.cost_points,
           t.proceeds_points,
           t.price_before,
           t.price_after,
           t.created_at
      FROM public.market_trades t
     WHERE t.market_id = p_market_id
     ORDER BY t.created_at DESC
     LIMIT 20;
$$;

REVOKE ALL ON FUNCTION public.market_public_trades(UUID) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.market_public_trades(UUID) TO anon, authenticated;

-- Pricing helpers are pure reads and safe to expose.
GRANT EXECUTE ON FUNCTION public.market_cost(NUMERIC, NUMERIC, NUMERIC, NUMERIC)
TO anon, authenticated;

GRANT EXECUTE ON FUNCTION public.market_price(NUMERIC, NUMERIC, NUMERIC, NUMERIC, NUMERIC)
TO anon, authenticated;
