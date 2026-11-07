# Execution Plan — Idempotent Entry and Exit

- **Status:** Proposed — implementation is blocked until the human owner approves this plan.
- **Issue:** #107
- **Branch:** `feat/107-idempotent-trades`
- **Decision owner:** Human developer
- **Risk level:** High — schema, RPC contract, client retry behavior and money-like points
- **Related:** [FND-003](../findings-register.md), [Checkpoint D change scenario](../checkpoint-D/03-change-scenario-idempotency.md), [ADR-002](../../architecture/adr/002-live-prediction-market.md), [ADR-003](../../architecture/adr/003-authorization-rls.md), [invariant registry](../checkpoint-A/02-invariants.md)

## 1. Intent and affected users

A retried `open_trade` or `close_trade` must not charge, pay, create a position or write a second trade. The same request key with the same payload returns the original result; the same key with a different payload is refused.

Affected users:

- **Fan:** a lost response or manual retry no longer creates a second entry or exit.
- **Organizer/business:** the points ledger and market state remain consistent under retries.
- **Developer:** the RPC contract has an explicit retry key and testable semantics.

## 2. Current state and evidence

- `open_trade(p_market_id, p_outcome, p_budget)` and
  `close_trade(p_market_id, p_outcome, p_shares)` have no request key.
- The entry cooldown limits churn but is not an idempotency key. A retry after
  cooldown is accepted as a new entry.
- The trade, position, balance and cooldown writes are already in one
  transaction.
- The authorization boundary is in place: `auth.uid()`, `SECURITY DEFINER`,
  direct writes revoked.
- FND-003 records the gap; the Checkpoint D change scenario proposes this
  increment.
- Evidence: `market-concurrency.test.ts`, `market-lifecycle.test.ts`,
  authorization suite, ADR-003, verification record.

## 3. Prior records reviewed

- FND-003 and the findings register.
- Checkpoint D change scenario (idempotency).
- ADR-002 (market transaction) and ADR-003 (authorization).
- Invariant registry M-INV1–M-INV8 and A-INV1–A-INV5.
- `open_trade` / `close_trade` migrations, Server Actions, market UI and tests.
- Release workflow and v1.1.0 release notes.

## 4. Scope

### Included

- New `trade_requests` table with request identity, payload and status.
- Unique `(user_id, request_id)`.
- Request status `IN_PROGRESS` → `COMPLETED`, with `trade_id` set on success.
- `p_request_id UUID DEFAULT NULL` on `open_trade` and `close_trade`.
- Idempotent claim/replay/refusal logic inside the RPC transaction.
- Client-generated request IDs in `MarketTrader`, reused on retry and rotated
  after success.
- Server Action validation and error translation.
- RLS/grants for `trade_requests` (owner-only read; no direct writes).
- Idempotency tests, authorization test update, fault injection.
- Invariant registry, domain model, code map, ADR addendum, README, AI log,
  release note.
- Release `v1.2.0` if the additive path is kept.

### Non-goals

- Registration idempotency.
- Pricing, outcome set, cooldown or settlement changes.
- UI redesign or organizer management UI.
- Request-key retention/cleanup automation.
- Load/p95, deployment, observability or recovery.
- Club analytics or rewards.

## 5. Key decisions requiring approval

| ID | Decision | Why | Consequence |
| --- | --- | --- | --- |
| **D1** | Separate `trade_requests` table, not a column on `market_trades`. | Keeps request identity separate from trade records; supports both entry and exit; can store in-progress state. | New table, RLS/grants, retention question. |
| **D2** | Request key is a client-generated UUID, one per user action, reused on retry. | Server-generated keys cannot distinguish a retry from a new request. | Client component must keep the key until success; direct API callers must supply one for idempotency. |
| **D3** | `p_request_id UUID DEFAULT NULL` on both RPCs; null keeps the legacy non-idempotent path. | Additive compatibility for old callers. | The app always sends a key; a later contract step can require it. |
| **D4** | Claim the request row before doing trade work; same transaction; replay returns the recorded trade. | Prevents concurrent duplicates and partial side effects. | More complex function logic and a request-state check. |
| **D5** | Payload mismatch (`kind`, market, outcome, budget/shares) is refused. | A request key must identify one request, not a class of requests. | Client must generate a new key for a new payload. |
| **D6** | `trade_requests` is owner-only read; direct writes revoked. | Request history is private; mutations stay in RPCs. | Authorization suite must cover the new table. |
| **D7** | Release as MINOR (`v1.2.0`) with an additive request-key path. | No external clients; old path preserved. | If the DB contract is treated as public, this would be MAJOR. |
| **D8** | No automatic request-key cleanup in this increment. | Avoid a retention policy decision that is not required now. | Document growth and revisit if volume warrants it. |

## 6. RPC contract

```text
open_trade(
  p_market_id UUID,
  p_outcome TEXT,
  p_budget INT,
  p_request_id UUID DEFAULT NULL
) RETURNS TABLE (shares, cost, price_before, price_after, points_after)

close_trade(
  p_market_id UUID,
  p_outcome TEXT,
  p_shares NUMERIC,
  p_request_id UUID DEFAULT NULL
) RETURNS TABLE (proceeds, price_before, price_after, points_after)
```

The return shape is unchanged. A null request ID uses the legacy path; the app
always supplies a key.

## 7. Schema

```sql
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
```

RLS: enable; revoke direct writes; grant `SELECT` to `authenticated`; policy
`user_id = auth.uid()`; service-role grants for local tests/admin only.

## 8. RPC algorithm

```text
validate auth, outcome, budget/shares

if p_request_id is not null:
  loop:
    try to insert trade_requests IN_PROGRESS for (user, request)
      if inserted: this transaction owns the request; continue to trade
      if conflict:
        select the existing request for update
        if no row: retry insert (the other transaction rolled back)
        if payload mismatch: raise "request id reused with a different payload"
        if status COMPLETED: return the recorded trade row
        if still IN_PROGRESS: raise a retryable "request still in progress"

execute the existing trade transaction
update trade_requests set status=COMPLETED, trade_id=..., completed_at=now()
return the trade
```

The request row and trade commit or roll back together. A business refusal
(insufficient points, cooldown, over-sell) rolls the request row back, so a
legitimate retry can execute again. A committed success is replayed.

## 9. Application flow

- `MarketTrader` generates a UUID when the form is ready and keeps it stable
  until a successful response; after success, rotate it for the next action.
- For exits, keep a per-position request ID so a retry of the same exit reuses it.
- The hidden form field is `requestId`; the Server Action validates the UUID and
  passes `p_request_id`.
- The Server Action translates:
  - `request id reused with a different payload` → "This request was already used for a different trade."
  - `request still in progress` → "This trade is still being processed. Retry in a moment."
- A missing/invalid request ID returns a validation error from the app; direct
  API callers may still use null for the legacy path.

## 10. Acceptance criteria

| ID | Criterion | Verification |
| --- | --- | --- |
| AC-1 | Sequential same key + same payload returns the same trade and debits/credits once. | Idempotency suite |
| AC-2 | Concurrent same key produces one trade; no double debit/credit. | Concurrency test |
| AC-3 | Same key + different payload is refused with no side effects. | Idempotency suite |
| AC-4 | Retry after cooldown with the same key does not create a new entry. | Lifecycle/idempotency test |
| AC-5 | Exit replay does not sell twice or credit twice. | Idempotency suite |
| AC-6 | Request row status/trade_id are consistent; request and trade commit together. | Constraint + rollback test |
| AC-7 | `trade_requests` is owner-only; direct writes denied. | Authorization suite |
| AC-8 | Removing the unique constraint or request check turns a test red. | Fault injection |
| AC-9 | Existing capacity, pricing, lifecycle, concurrency and authorization suites pass. | CI |
| AC-10 | Lint, typecheck, build, architecture guard and link checks pass. | Local + CI |

## 11. Work breakdown

| Slice | Work | Paths |
| --- | --- | --- |
| **I1** | Migration: `trade_requests`, RLS, grants. | `supabase/migrations/20261111_trade_requests.sql` |
| **I2** | RPC: new signatures, claim/replay logic, grants. | `supabase/migrations/20261112_idempotent_rpcs.sql` |
| **I3** | App: request IDs, hidden fields, action validation/errors. | `src/components/MarketTrader.tsx`, `src/app/actions/market.ts` |
| **I4** | Tests: new idempotency suite; update auth suite; fault injection. | `tests/invariants/idempotency.test.ts`, `tests/invariants/authorization.test.ts` |
| **I5** | Docs/evidence: invariant registry, domain model, code map, ADR addendum, README, AI log, release note. | `docs/`, `README.md`, `CHANGELOG.md` |

## 12. Verification

- `bun run check:architecture`
- `bun run lint`
- `bun run typecheck`
- `bun run build`
- `bun run test` against local Supabase (CI replay)
- New idempotency suite; existing invariant and authorization suites
- Fault injection: remove the unique constraint / request claim and observe red;
  restore and observe green
- Manual smoke: entry, retry same key, exit, retry same key; verify one trade
  each and unchanged balance
- Link scan and `git diff --check`
- Verification record `docs/methodology/verification/2026-11-107-idempotent-trades.md`

## 13. Risks and recovery

| Risk | Mitigation |
| --- | --- |
| Duplicate concurrent request | Unique `(user_id, request_id)` + claim-before-work + row lock. |
| Request key reused with different payload | Payload comparison; explicit refusal. |
| Request row remains IN_PROGRESS after a crash | Same transaction; on rollback it disappears. A committed crash cannot leave an in-progress row; if observed, add a recovery job. |
| Client rotates the key on retry | Keep the key until success; test the UI behavior. |
| RPC signature breaks callers | Optional parameter first; app/tests update; later contract step. |
| Table growth | No cleanup in this increment; document retention and revisit. |
| Deadlock/contention | Claim is short; market/profile lock order unchanged; test concurrency. |
| Legacy null-key path remains unsafe | App always sends a key; document the legacy path; later require it. |

**Rollback:** revert the branch, drop `trade_requests`, restore the 3-arg RPCs,
revert the app and tests, reset locally. No production data exists.

## 14. Stop conditions

Stop and request direction if:

- the claim-before-work pattern cannot be made safe without a larger redesign;
- the RPC signature change cannot preserve the old path;
- the UI cannot keep a stable request key across retries without a larger state
  redesign;
- the test suite cannot distinguish replay from a new trade;
- a new domain rule or schema change becomes necessary beyond this plan.

## 15. Approval requested

The human owner is asked to approve:

1. The scope and non-goals.
2. `trade_requests` as a separate table with status/payload checks.
3. The optional `p_request_id` compatibility path.
4. Client-generated request IDs and the retry/rotation behavior.
5. The `v1.2.0` MINOR release with a migration note.
6. The test and fault-injection plan.

No implementation begins until this plan is approved.
