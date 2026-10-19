# Live prediction market — execution plan

- **Status:** Approved (owner, 2026-10-19)
- **Issues:** #64 (documents), #65 (engine), #66 (lifecycle), #67 (UI), #68 (evidence)
- **Decision owner:** human developer (all decisions below are theirs, dated 2026-10-19)

## 1. Intent

Replace the pre-kickoff fixed-score prediction feature with a live, credit-only prediction market. Spectators enter and exit positions while a match is running; PnL is proportional to how the market moved. The aggregated position over time is the dataset MatchPulse sells to clubs. Correctness (no double-spend, no negative balance, no over-sell, one payout) must hold under concurrency.

## 2. Current state

- Registration is implemented and verified (INV-01, INV-02; fault-injected, CI).
- The fixed-score prediction path exists but is flawed: no kickoff enforcement (INV-03 was never implemented), no atomic balance/ledger write (INV-04), and `retractPrediction` trusts a caller-supplied user id.
- The trade engine, market tables, resolution and market UI do not exist.
- Authentication/RLS remain unimplemented (INV-05); the system is not a security boundary.
- CI replays migrations and runs the invariant suite on every pull request; `main` is green.
- Audit remediation for the previous cycle is merged (#63 / PR #69).

## 3. Scope

**Included:** market + position + trade + cooldown schema; LMSR pricing; open/close/resolve RPCs; window, cooldown and double-spend enforcement; pricing and concurrency tests with fault injection; market UI; retirement of the fixed-score feature; documentation and evidence.

**Non-goals:** authentication and RLS (INV-05), club analytics export and privacy rules, ticket purchasing and rewards redemption, deployment, real-time push, order book, cash or any monetary value.

## 4. Assumptions and uncertainty

- Point balances are integer credits on the seeded demo profile; no auth seam change.
- Outcome set is fixed at `HOME`, `DRAW`, `AWAY`; no other markets.
- Resolution is an organizer action; no automatic result feed.
- `b = 100` is the default liquidity; `q/b ≤ 25` keeps the exponential numerically safe.
- Cooldown timing uses authoritative database time; a clock jump is out of scope.
- Concurrency tests run against the local database through a direct client. Docker interop may fail, so a TCP client fallback is used; CI migration replay is the authoritative proof.
- p95 latency and container serving remain unmeasured unless observed.

## 5. Decisions (owner-approved)

| ID | Decision |
| :--- | :--- |
| **D1** | The market window is `[kickoff_time, resolution)`, evaluated on authoritative database time. The pre-kickoff fixed-score deadline is withdrawn; the market opens at kickoff. |
| **D2** | Each match has one three-outcome market: `HOME`, `DRAW`, `AWAY`. |
| **D3** | Fixed-score predictions are retired completely (tables, actions, components, tests). |
| **D4** | Pricing is LMSR: `C(q) = b·ln(Σ e^{q_i/b})`, `p_i = e^{q_i/b}/Σ e^{q_j/b}`. |
| **D5** | The trade log (time × price × size) is the analytics-of-record dataset; club export remains a non-goal. |
| **D6** | Entries choose a budget; the engine solves shares from the cost curve. Debit `ceil(cost)`, credit `floor(proceeds)`; shares exact. Default `b = 100`. |
| **D7** | Zero commission of any kind on entry, exit or settlement. Rounding dust belongs to no account. |
| **D8** | Entry cooldown per user × market: 5 s first rung, then linear `+15 s` (5, 15, 30, 45, 60, …), capped at 600 s; decays one level per five quiet minutes; refused attempts do not escalate; exits are never restricted or charged. |
| **D9** | Every market rule is enforced inside the database transaction, never by the UI. Lock order: market → profile → cooldown → position. |

## 6. Acceptance criteria

1. Entries are refused before kickoff and after resolution; exits are free and always allowed while open.
2. No path charges a commission; entry cost is ceiled, exit proceeds floored.
3. A user cannot spend more than their balance across concurrent markets; the balance never goes negative.
4. Holdings never go negative; position shares and market quantity stay consistent.
5. Resolution pays exactly one point per winning share, once, terminally.
6. The cooldown ladder, cap, decay, scope and no-escalation-on-refusal behavior hold; exits ignore it.
7. The market UI supports enter/exit and shows PnL; the fixed-score feature is gone.
8. Documentation, invariants and CI evidence agree; every claim is labeled with its actual status.

## 7. Work breakdown

| Slice | Issue | Branch | Main paths | Roles |
| :--- | :--- | :--- | :--- | :--- |
| **I2 documents** | #64 | `docs/sa-pivot-prediction-market` | `docs/architecture/kata.md`, `01-system-overview.md`, `adr/002-live-prediction-market.md`, `02-architecture-characteristics.md`, `docs/methodology/checkpoint-A/02-invariants.md`, `AGENTS.md`, this plan, AI log entry 10 | architect, implementer |
| **I3 engine** | #65 | `feat/live-market-engine` | `supabase/migrations/20261021_market_core.sql`, `tests/invariants/market-pricing.test.ts` | implementer, test engineer |
| **I4 lifecycle** | #66 | `feat/live-market-lifecycle` | `supabase/migrations/20261022_market_resolution.sql`, `tests/invariants/market-lifecycle.test.ts`, `tests/invariants/market-concurrency.test.ts` | implementer, test engineer, reviewer |
| **I5 UI + retirement** | #67 | `feat/live-market-ui` | `src/app/market/[id]/page.tsx`, `src/app/actions/market.ts`, `src/components/MarketTrader.tsx`, `supabase/seed.sql`, deletion of prediction feature, `README.md` | implementer, test engineer |
| **I6 evidence wrap** | #68 | `docs/market-evidence-wrap` | this plan (Executed/Verified), AI log entries 11–13, contradiction sweep | orchestrator, reviewer |

Each slice: commit → push → brief PR (`Closes #issue`, claim type) → green CI → squash merge. No slice claims a later slice's evidence.

## 8. Verification

Environment: local Supabase via Docker when available; otherwise the TCP SQL client fallback. CI job "Domain invariants" replays all migrations onto an empty schema and runs the suites. Rows marked `Specified` are planned checks, not results.

| ID | Check | Slice |
| :--- | :--- | :--- |
| V1 | `bun run lint` clean | I2–I6 |
| V2 | `bun run typecheck` exit 0 | I2–I6 |
| V3 | `bun run test` all suites pass | I3–I5 |
| V4 | `bun run build` succeeds | I2–I5 |
| V5 | Both CI jobs green on every slice PR | I2–I6 |
| V6 | Docs state agrees with D1–D9 across kata, overview, ADR-002, invariants, AGENTS | I2, I6 |
| V7 | Sweep finds no stale pre-kickoff deadline or fixed-score claims | I2, I6 |
| V8 | No commission/fee path in migrations, RPCs or actions | I3, I6 |
| V9 | Entry before kickoff refused with no writes | I4 |
| V10 | Entry at or after resolution refused with no writes | I4 |
| V11 | Exit while open succeeds, including during cooldown | I3/I4 |
| V12 | Prices lie in `[0,1]` and sum to 1 | I3 |
| V13 | Cost is monotonic in shares and never exceeds the budget | I3 |
| V14 | Entry debits `ceil(cost)`; exit credits `floor(proceeds)` | I3 |
| V15 | Insufficient balance refused; balance never negative | I3 |
| V16 | Enter near 50%, exit after price rises near 80% → proportional profit | I3 |
| V17 | Enter high, exit after price falls → proportional loss, not the whole stake | I3 |
| V18 | Shares exact and never negative | I3 |
| V19 | Over-sell refused | I3 |
| V20 | Σ position shares equals `q` after every trade | I3 |
| V21 | Cross-market racing spends: exactly one succeeds, balance ≥ 0 | I4 |
| V22 | Same-market burst: exactly one entry accepted, others cooldown-refused | I4 |
| V23 | First re-entry waits 5 s | I3/I4 |
| V24 | Ladder is 5, 15, 30, 45, 60, … capped at 600 s | I3/I4 |
| V25 | Cooldown decays one level per five quiet minutes | I4 |
| V26 | Refused attempts do not escalate | I4 |
| V27 | Cooldown is per user × market; other user/market unaffected | I4 |
| V28 | Resolution pays one point per winning share once; losers get nothing | I4 |
| V29 | Duplicate resolution refused with no second payout | I4 |
| V30 | Resolved market is terminal for entries and exits | I4 |
| V31 | Fault injection 1 (remove profile lock/points guard) turns negative-balance test red; restored by replay | I4 |
| V32 | Fault injection 2 (repeatable resolution) turns double-payout test red; restored by replay | I4 |
| V33 | Fault injection 3 (remove cooldown gate) turns rapid re-entry test red; restored by replay | I4 |
| V34 | Prediction feature removed (route, action, components, test, imports) | I5 |
| V35 | UI enter/exit works end to end with server-side identity only | I5 |
| V36 | Seed provides a `b = 100` market and balance 200; README matches | I5 |
| V37 | Final contradiction sweep: every doc claim matches code/CI evidence; gaps listed honestly | I6 |

**Evidence rule:** a check is recorded as passed only after its command/observation. Fault injections are reverted by replaying migrations, and the suite must return green. Unrun checks are recorded as unverified, never inferred.

## 9. Risks and recovery

- **Numeric growth** — clamp `q/b ≤ 25`; refuse oversized trades. Recovery: no data loss; the guard is a constraint.
- **Rounding dust** — accepted; dust is never credited. Recovery: none needed; documented.
- **Lock contention** — market → profile ordering is fixed to avoid deadlock; bursts serialise on the profile row. Recovery: shorten transactions; revisit only with measured need.
- **Migration safety** — new tables and functions only; no destructive change to registration data. Recovery: replay migrations on an empty schema (CI already does).
- **Feature retirement** — deleting prediction code can break imports; build/typecheck gate the slice. Recovery: revert the slice branch.
- **Environment** — Docker interop may fail; TCP fallback for local checks, CI replay for authority. Container serving stays unverified if never observed.
- **Residual risk** — INV-05 (no auth/RLS) remains open; the market is not a security boundary. Club export/privacy remains unimplemented.

## 10. Stop conditions

Stop and request direction if: a documented rule conflicts with these decisions; a change needs a new business rule or schema beyond this plan; a fault injection cannot turn a test red without redesign; a migration would risk existing registration data; CI cannot run; or a secret would be exposed.
