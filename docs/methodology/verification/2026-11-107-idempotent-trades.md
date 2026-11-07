# Verification — Idempotent Entry and Exit

- **Date:** 2026-11-08
- **Issue:** #107
- **PR:** #108
- **Status:** Verified in CI for the local Supabase/PostgreSQL environment.
- **Related:** [Execution plan](../exec-plans/107-idempotent-trades.md), [Invariant registry](../checkpoint-A/02-invariants.md), [Checkpoint D change scenario](../checkpoint-D/03-change-scenario-idempotency.md), [FND-003](../findings-register.md)

## 1. What was verified

- Same request key + same entry payload replays the recorded trade; no second debit, position or trade.
- Concurrent duplicate entries with the same key produce one trade.
- Same key + different entry payload is refused with no side effects.
- A retry after the cooldown would have allowed a new entry still replays; a new key is accepted.
- A completed exit replay does not sell twice or credit twice.
- Same exit key with different shares is refused.
- `trade_requests` is owner-only; direct writes are denied.
- Existing capacity, pricing, lifecycle, concurrency and authorization suites still pass.

## 2. Environment

- GitHub Actions `ubuntu-latest`; Supabase local; PostgreSQL 17; Bun 1.4.2.
- Migrations replayed from an empty schema; seed applied.
- Service role used only for test setup/reads; the app uses the cookie-based anon client with request keys.

## 3. Commands and observed results

| Command | Result |
| :--- | :--- |
| `bun run check:architecture` | Passed (local). |
| `bun run typecheck` | Passed (local). |
| `bun run lint` | Passed (local). |
| `bun run build` | Passed (local). |
| CI "Lint, typecheck and build" | Passed. |
| CI "Domain invariants" | Passed. |
| Test summary | **28 pass, 0 fail, 256 expect() calls, 7 files.** |

CI run: [42425131584](https://github.com/match-pulse/match-pulse/actions/runs/42425131584)

### Idempotency suite

```text
(pass) M-INV9 > replays a completed entry without a second debit or trade
(pass) M-INV9 > serialises concurrent duplicate entries into one trade
(pass) M-INV9 > refuses a reused key with a different entry payload
(pass) M-INV9 > replays after the cooldown would have allowed a new entry, and a new key is accepted
(pass) M-INV9 > replays a completed exit without selling twice
(pass) M-INV9 > refuses a reused exit key with different shares
```

### Authorization coverage

The authorization suite now also verifies that `trade_requests` rows are
owner-only and that direct insert/update/delete are denied.

## 4. Limits and unverified claims

- Fault injection (remove the unique constraint or the request check) was **not
  observed locally** because Docker/Postgres is unavailable in this environment.
  CI proves the restored code, not each injected run.
- The legacy null-key path remains non-idempotent. The app always sends a UUID;
  a later contract step can require it.
- No request-key retention/cleanup policy.
- No load/p95, production deployment, observability or recovery evidence.
- No independent human review.

## 5. Findings

- **FND-003** is fixed by this increment; the register records the lifecycle.
- FND-002, FND-004, FND-006, FND-007 and FND-008 remain open.

## 6. Decision

The idempotency increment is accepted for the local course environment. The
remaining residual risks are recorded in the Checkpoint C residual-risk
register; none is implicitly accepted by this verification.
