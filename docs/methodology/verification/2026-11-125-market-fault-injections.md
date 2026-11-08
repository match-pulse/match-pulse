# Verification — Market Fault-Injection Matrix

- **Date:** 2026-11-08
- **Issue:** #125
- **PR:** #126
- **Status:** Verified in CI for the local Supabase/PostgreSQL environment. M-INV2 has a stated forced-failure limit.
- **Related:** [OpenSpec change](../../../openspec/changes/archive/2026-11-08-add-market-fault-injections/proposal.md), [Invariant registry](../checkpoint-A/02-invariants.md), [FND-002](../findings-register.md), [Fault-injection runner](../../../scripts/fault-injection.ts)

## 1. What was verified

- M-INV1: removing the market-window guard makes the pre-kickoff/post-resolution test fail.
- M-INV3: removing the position guard and non-negative constraints makes the over-sell test fail.
- M-INV5: advancing `q` without the matching position update makes the bookkeeping test fail.
- M-INV8: replacing `ceil` with `floor` makes the debit assertion fail.
- M-INV7 ladder: disabling the `+15 s` increment makes the ladder assertion fail.
- M-INV7 cap: lowering the cap to 60 s makes the cap assertion fail.
- M-INV7 decay: disabling the five-minute decay makes the decay assertion fail.
- M-INV7 scope: ignoring the market id makes the scope test fail.
- M-INV7 no-escalation: committing the cooldown escalation on a refused attempt makes the no-escalation test fail.
- M-INV7 exit exemption: making `close_trade` read the cooldown makes the exit-during-cooldown test fail.
- M-INV2: forcing the trade insert to fail leaves no partial balance, position, market update or trade. This is a forced-failure rollback test, not an observed-red mutation.
- The full invariant suite returns to 28 pass / 0 fail after the matrix.

## 2. Environment

- GitHub Actions `ubuntu-latest`; Supabase local; PostgreSQL 17; Bun 1.4.2.
- The runner uses the Supabase database container, `psql`, and a disposable local database.
- Each mutation is applied to a clean `supabase db reset` state and removed by the next reset.
- CI run: [42474762811](https://github.com/match-pulse/match-pulse/actions/runs/42474762811)

## 3. Matrix results

| Mutation | Invariant | Kind | Target test | Expected | Observed | Duration |
| :--- | :--- | :--- | :--- | :--- | :--- | ---: |
| `m-inv1-window` | M-INV1 | observed-red | `market-lifecycle.test.ts` | fails | exit 1 | 31.9 s |
| `m-inv2-rollback` | M-INV2 | forced-failure | `atomic-rollback.fault.ts` | passes | exit 0 | 30.6 s |
| `m-inv3-oversell` | M-INV3 | observed-red | `market-pricing.test.ts` | fails | exit 1 | 32.2 s |
| `m-inv5-bookkeeping` | M-INV5 | observed-red | `market-pricing.test.ts` | fails | exit 1 | 32.2 s |
| `m-inv8-floor` | M-INV8 | observed-red | `market-pricing.test.ts` | fails | exit 1 | 32.2 s |
| `m-inv7-ladder` | M-INV7 | observed-red | `market-lifecycle.test.ts` | fails | exit 1 | 32.1 s |
| `m-inv7-cap` | M-INV7 | observed-red | `market-lifecycle.test.ts` | fails | exit 1 | 32.0 s |
| `m-inv7-decay` | M-INV7 | observed-red | `market-lifecycle.test.ts` | fails | exit 1 | 32.1 s |
| `m-inv7-scope` | M-INV7 | observed-red | `market-lifecycle.test.ts` | fails | exit 1 | 32.2 s |
| `m-inv7-no-escalation` | M-INV7 | observed-red | `market-lifecycle.test.ts` | fails | exit 1 | 32.1 s |
| `m-inv7-exit-exemption` | M-INV7 | observed-red | `market-lifecycle.test.ts` | fails | exit 1 | 31.6 s |

The full suite after the matrix:

```text
28 pass
0 fail
256 expect() calls
Ran 28 tests across 7 files.
```

## 4. Commands

```bash
supabase start
supabase db reset
bun run fault:inject
```

The runner discovers the Supabase database container, applies each mutation with
`psql`, runs the targeted test, compares the exit code with the declared
expectation, resets the database and prints one JSON line per mutation. It exits
non-zero if any mutation produces the wrong result or the full suite fails.

## 5. M-INV2 limit

M-INV2 is about the atomicity of a single RPC invocation. PostgreSQL function
invocation is already atomic: a raised exception rolls back every write in the
function. The project cannot break that atomicity from inside the same function
without a second connection (for example `dblink`), and adding a second
connection just to make a test fail would add an artificial failure mode.

The forced-failure test therefore proves the **positive** property: when the
trade insert fails, the profile debit, position update and market update do not
survive. It does not prove that the suite would detect a deliberately
non-atomic implementation. The invariant registry labels M-INV2 **Verified by
forced-failure rollback**, not observed-red. FND-002 remains **partly fixed** for
that reason.

## 6. Limits

- Local/CI, one database instance; no production or multi-instance evidence.
- Mutations are text-level transforms of the current migration source. A
  migration change that removes a target makes the runner fail loudly; it does
  not silently pass.
- The matrix runs on a dedicated CI job; runtime is about 8–9 minutes.
- No independent human review (FND-008).
- No load, performance or production recovery evidence (FND-004, FND-006).

## 7. Findings

- **FND-002** — partly fixed: 10 observed-red mutations pass; M-INV2 is verified
  by forced-failure rollback but is not observed-red.
- FND-004 and FND-006 remain partly fixed; FND-007 and FND-008 remain open.

## 8. Decision

The fault-injection matrix is accepted for the local course environment. The
M-INV2 atomicity limit is explicit and is not counted as an observed-red result.
No production risk is accepted by this record.
