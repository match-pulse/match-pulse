-- Idempotency request keys for entry and exit.
-- Execution plan: docs/methodology/exec-plans/107-idempotent-trades.md
-- Invariant: M-INV9.
--
-- A request row is claimed before the trade work starts. The request and the
-- trade commit or roll back together. A completed request replays the recorded
-- trade; the same key with a different payload is refused.

CREATE TABLE public.trade_requests (
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    request_id UUID NOT NULL,
    kind TEXT NOT NULL CHECK (kind IN ('OPEN', 'CLOSE')),
    market_id UUID NOT NULL REFERENCES public.markets(id) ON DELETE CASCADE,
    outcome TEXT NOT NULL CHECK (outcome IN ('HOME', 'DRAW', 'AWAY')),
    budget INT,
    shares NUMERIC(30,8),
    status TEXT NOT NULL DEFAULT 'IN_PROGRESS'
        CHECK (status IN ('IN_PROGRESS', 'COMPLETED')),
    trade_id UUID UNIQUE REFERENCES public.market_trades(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    completed_at TIMESTAMPTZ,
    PRIMARY KEY (user_id, request_id),
    CONSTRAINT trade_requests_payload CHECK (
        (kind = 'OPEN' AND budget IS NOT NULL AND budget > 0 AND shares IS NULL)
        OR
        (kind = 'CLOSE' AND budget IS NULL AND shares IS NOT NULL AND shares > 0)
    ),
    CONSTRAINT trade_requests_completion CHECK (
        (status = 'IN_PROGRESS' AND trade_id IS NULL AND completed_at IS NULL)
        OR
        (status = 'COMPLETED' AND trade_id IS NOT NULL AND completed_at IS NOT NULL)
    )
);

ALTER TABLE public.trade_requests ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.trade_requests FROM anon, authenticated;
GRANT SELECT ON TABLE public.trade_requests TO authenticated;
GRANT ALL ON TABLE public.trade_requests TO service_role;

CREATE POLICY trade_requests_select_own
    ON public.trade_requests
    FOR SELECT
    TO authenticated
    USING (user_id = auth.uid());
