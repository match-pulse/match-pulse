# Verification — Three-Role MVP Backend

- **Date:** 2026-11-08
- **Issue:** #128
- **PR:** #136
- **Status:** Verified in CI for the local Supabase/PostgreSQL environment.
- **Related:** [MVP epic #127](https://github.com/match-pulse/match-pulse/issues/127), [invariant registry](../checkpoint-A/02-invariants.md), [authorization ADR](../../architecture/adr/003-authorization-rls.md)

## 1. What was verified

- `profiles.role` accepts `FAN`, `ORGANIZER` and `CLUB`.
- Organizer create/update tournament; create/update match; market auto-creation.
- Organizer ownership: another organizer cannot update or resolve the owner's data.
- Ticket claim: one ticket per user/tournament, allocation respected, points awarded once.
- Reward redemption: points deducted once, unique local code, insufficient-points refusal.
- Organizer registration/ticket projections are owner-only and expose no private rows.
- Club analytics: five-trader aggregate is visible; a one-trader market is suppressed; no identities.
- Club cannot read private `market_trades`; profile reads remain own-row.
- Club time series and export audit work.
- Ownership-aware market resolution: non-owner refused; owner resolves once.
- Existing invariant and authorization suites remain green.

## 2. Environment

- GitHub Actions `ubuntu-latest`; Supabase local; PostgreSQL 17; Bun 1.4.2.
- Migrations replayed from an empty schema (`supabase db reset`).
- Service role used for setup and committed-state reads only.

## 3. Commands and results

| Command / job | Result |
| :--- | :--- |
| `bun run typecheck` | Passed locally. |
| `bun run lint` | Passed locally. |
| `bun run check:architecture` | Passed locally; new mutation RPCs are captured. |
| CI "Lint, typecheck and build" | Passed. |
| CI "Domain invariants" | Passed: 36 tests across 8 files. |
| CI "Delivery and recovery" | Passed. |
| CI "Fault injection" | Passed: 10 observed-red mutations, M-INV2 forced-failure pass, full suite green. |

Final PR CI: [42480124658](https://github.com/match-pulse/match-pulse/actions/runs/42480124658)

## 4. Limits

- Local/CI, one database instance; no multi-instance or production evidence.
- Club analytics is aggregate-only with a threshold of 5; a formal privacy review is still required.
- The organizer UI, fan ticket/reward UI and club UI are not implemented in this backend slice; they are separate issues.
- FND-007 real-user evidence and FND-008 independent review remain open.

## 5. Decision

The three-role backend foundation is accepted for the MVP. The UI and complete test-suite phases may build on it.
