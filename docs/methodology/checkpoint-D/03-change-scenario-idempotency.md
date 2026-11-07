# Checkpoint D — Change Scenario: Idempotent Trades

- **Status:** Proposed change scenario for Checkpoint D. **Not implemented.** It closes FND-003 and exercises the architecture's changeability.
- **Execution plan:** [107-idempotent-trades.md](../exec-plans/107-idempotent-trades.md) — proposed; awaiting plan approval.
- **Scope:** `open_trade` / `close_trade` retry safety; no pricing, outcome or settlement change.
- **Related:** [FND-003](../findings-register.md), [Risk R-03](../checkpoint-C/01-risk-control-map.md), [ADR-002](../../architecture/adr/002-live-prediction-market.md), [ADR-003](../../architecture/adr/003-authorization-rls.md)

## 1. Why this change

The entry cooldown limits churn, but it is not an idempotency key. A client can retry after the cooldown expires and be accepted as a new entry. The same risk exists for exits: a lost response can cause a retry that sells again. The current system cannot distinguish “the same request repeated” from “a new request.”

This is the top remaining product risk in the Checkpoint C current state (FND-003). It is also a good D scenario because it crosses schema, RPC contract, Server Actions, tests, documentation and release compatibility without changing the market's economic rules.

## 2. Current behaviour

- `open_trade(p_market_id, p_outcome, p_budget)` inserts a position/trade and debits points.
- `close_trade(p_market_id, p_outcome, p_shares)` reduces a position and credits points.
- There is no request identifier. A retry after the cooldown is a new entry.
- The cooldown is a churn control, not a retry key.

## 3. Design options

| Option | Design | Pros | Cons |
| :--- | :--- | :--- | :--- |
| **A. Request ID on `market_trades`** | Add `request_id UUID` to `market_trades`; unique `(user_id, request_id)`; on conflict return the existing trade. | Smallest schema change; reuses the trade log. | A trade row is a response record, not a request record; failed requests need handling; payload mismatch handling is awkward. |
| **B. Separate `trade_requests` table** | `trade_requests(user_id, request_id, kind, payload_hash, trade_id, created_at)` with unique `(user_id, request_id)`. On retry, verify the payload hash and return the recorded trade. | Separates request identity from trade records; handles failed/duplicate requests; supports both entry and exit. | New table, new RPC logic, cleanup/retention policy. |
| **C. General idempotency table** | Store request key, response body and status for any mutation. | Reusable across features. | Over-engineered for the current scope; response serialization and privacy complexity. |

**Recommendation:** Option B. It is explicit, testable and does not overload the trade log.

## 4. Proposed contract

Add a request identifier to the mutation RPCs. To preserve compatibility during the change:

- add `p_request_id UUID DEFAULT NULL` to `open_trade` and `close_trade`;
- a null request ID keeps the current behaviour for old clients;
- the application and tests always send a generated request ID;
- after a deprecation window, make the parameter required and reject null (a future MAJOR/contract change).

This is an **expand → migrate → contract** path. It avoids breaking the current app and tests while making the new path idempotent.

### On retry

1. Lock the request key; if it exists for the same user:
   - if `kind` and `payload_hash` match, return the recorded trade response;
   - if they differ, refuse with a clear error (request ID reuse with a different payload).
2. If it does not exist, execute the existing trade transaction.
3. Record the request key and the resulting trade in the same transaction.

The request key and trade must commit or roll back together.

## 5. Impact map

| Area | Change | Evidence |
| :--- | :--- | :--- |
| Schema | New `trade_requests` table; unique `(user_id, request_id)`; FK to `market_trades` | Migration replay, constraint tests |
| RPC | `open_trade` / `close_trade` accept optional request ID; idempotent replay/mismatch logic | SQL tests, concurrency tests |
| RLS/grants | Request rows are owner-only; direct writes denied; RPCs remain definer with auth checks | Authorization suite |
| Application | Server Actions generate/propagate request IDs; retry message | Typecheck/build; action tests or manual smoke |
| UI | No visible change except a stable retry message if a request is replayed | Manual smoke |
| Tests | Duplicate sequential/concurrent, payload mismatch, retry after cooldown, balance/position unchanged | New invariant suite; fault injection |
| Docs | Invariant registry, domain model, code map, ADR addendum, release note | Link check/review |
| Release | MINOR if additive; MAJOR if the request ID becomes required and old clients break | Changelog release section |

## 6. Acceptance criteria

| ID | Criterion | Verification |
| :--- | :--- | :--- |
| AC-1 | Two sequential calls with the same request ID and payload produce one trade and the same response. | Integration test |
| AC-2 | Two concurrent calls with the same request ID produce one trade. | Concurrency test |
| AC-3 | The same request ID with a different payload is refused; no new trade. | Integration test |
| AC-4 | A retry after cooldown with the same request ID does not create a new entry. | Lifecycle test |
| AC-5 | Balance, position and trade state are unchanged on replay. | Committed-state assertions |
| AC-6 | A request key and its trade commit or roll back together. | Failure/rollback test |
| AC-7 | Removing the unique constraint or request check turns a test red. | Fault injection |
| AC-8 | The authorization suite still passes; request rows are owner-only. | CI |

## 7. Risks and recovery

| Risk | Mitigation |
| :--- | :--- |
| Request ID reuse with different payload | Store a payload hash and refuse a mismatch. |
| Client generates a new ID on every retry | Generate once per user action; document the contract; test. |
| Table growth | Retention policy; request IDs are not personal data; partition/cleanup later if needed. |
| RPC signature change breaks old clients | Optional parameter first; app updates; later contract step with release note. |
| Request key and trade diverge | Same transaction; unique constraint; failure test. |
| Replay returns stale response | Return the recorded trade; state is immutable once committed; document the replay semantics. |
| Lock contention | Request key lock is short; measure later if needed. |

**Rollback:** drop the request table and parameter, revert the app actions; local reset. No production data exists.

## 8. What this scenario proves about changeability

- The architecture can absorb a new cross-cutting concern without moving domain rules out of the database.
- The RPC boundary is the right place for idempotency: it has the transaction, the auth identity and the trade state.
- The change uses an expand/contract path rather than a flag day.
- The tests and guards tell the team when the change breaks a contract.

## 9. Decision requested

- Approve Option B as the change scenario.
- Confirm the compatibility path: optional request ID first, required later.
- Confirm whether to implement it as the next increment (`v1.2.0`) or keep it as a D design-only scenario until L13–L16 arrive.
