# Verification Record — Fault-Injection Evidence and Invariant Corrections

- **Issue:** [#181](https://github.com/match-pulse/match-pulse/issues/181)
- **PR:** Pending
- **Date:** 2026-11-10
- **Environment:** Local Fedora 44; Node 22.23.1; Bun 1.4.2; Docker CE 29.9.3; local Supabase PostgreSQL 17.11
- **Status:** Partially verified — observed-red matrix passed; independent verification pending
- **Verifier:** Implementation Agent / Test Engineer (evidence only; independent verifier required)

## 1. Claim or Acceptance Criterion

FND-020: every “Verified” or enforced invariant claim names the test and failure mode it catches; the fault-injection matrix covers the v3.1.0 guards; the registry and audit closure reflect observed evidence.

## 2. Method

- Extended `scripts/fault-injection/mutations.ts` and `scripts/fault-injection/sql.ts` with the security, market, ticketing, reward, subscription, privacy and ticket-payload migrations.
- Added observed-red mutations that remove or weaken one guard each, run the targeted test, and compare the exit code with the declared expectation.
- Ran the full matrix against a disposable local database, which resets the schema before every mutation and after the last one.
- Corrected the invariant registry to distinguish enforced, fault-injected and independently verified claims.
- The matrix uses the real local PostgreSQL boundary; it is not mocked.

## 3. Command or Evidence

```text
bun run fault:inject
```

All 27 entries reported `status: ok`:

| Mutation | Invariant | Observed |
| :--- | :--- | :--- |
| `m-inv1-window` | M-INV1 | targeted test fails (exit 1) |
| `m-inv2-rollback` | M-INV2 | forced-failure test passes (exit 0) |
| `m-inv3-oversell` | M-INV3 | targeted test fails (exit 1) |
| `m-inv5-bookkeeping` | M-INV5 | targeted test fails (exit 1) |
| `m-inv8-floor` | M-INV8 | targeted test fails (exit 1) |
| `m-inv7-ladder` | M-INV7 | targeted test fails (exit 1) |
| `m-inv7-cap` | M-INV7 | targeted test fails (exit 1) |
| `m-inv7-decay` | M-INV7 | targeted test fails (exit 1) |
| `m-inv7-scope` | M-INV7 | targeted test fails (exit 1) |
| `m-inv7-no-escalation` | M-INV7 | targeted test fails (exit 1) |
| `m-inv7-exit-exemption` | M-INV7 | targeted test fails (exit 1) |
| `m-inv1-finished-window` | M-INV1 | targeted test fails (exit 1) |
| `m-inv1-disable-exit` | M-INV1 | targeted test fails (exit 1) |
| `m-inv6-score-binding` | M-INV6 | targeted test fails (exit 1) |
| `m-inv6-premature-finish` | M-INV6 | targeted test fails (exit 1) |
| `m-inv6-post-resolution-score` | M-INV6 | targeted test fails (exit 1) |
| `t-inv4-buyer-cap` | T-INV4 | targeted test fails (exit 1) |
| `t-inv5-capacity-config` | T-INV5 | targeted test fails (exit 1) |
| `t-inv11-legacy-claim` | T-INV11 | targeted test fails (exit 1) |
| `t-inv11-legacy-registration` | T-INV11 | targeted test fails (exit 1) |
| `t-inv12-reward-replay` | T-INV12 | targeted test fails (exit 1) |
| `t-inv3-entitlement` | T-INV3 | targeted test fails (exit 1) |
| `t-inv10-transfer-retention` | T-INV10 | targeted test fails (exit 1) |
| `t-inv10-audit-retention` | T-INV10 | targeted test fails (exit 1) |
| `t-inv10-invite-retention` | T-INV10 | targeted test fails (exit 1) |
| `t-inv8-cohort-suppression` | T-INV8 | targeted test fails (exit 1) |
| `t-inv13-ticket-payload` | T-INV13 | targeted test fails (exit 1) |

Restored suite and supporting checks after the final reset:

```text
bun run test
57 pass / 0 fail, 469 expect() calls

bun run test:agent
2 pass / 0 fail, 30 expect() calls

bun run test:e2e
11 passed

bun run lint / typecheck / check:architecture
passed

bun run build (local .env.local)
passed
```

## 4. Result

- All 27 fault-injection entries matched their declared expectation.
- The v3.1.0 market, ticketing, entitlement, reward, retention, cohort and payload guards are covered by observed-red evidence.
- FND-020 is implementation-complete and the registry no longer claims more than the recorded evidence.
- No finding is marked Verified by the implementer; the separate independent verification pass is still required.

## 5. Limitations

- The automatic post-matrix full suite failed locally because the final `supabase db reset` recreated Kong with the Docker 29 / Kong 2.8.1 DNS issue. The documented local workaround (rewrite Kong upstreams to container IPs and reload) was applied, and the suite then passed 57/57. This is an environment limitation, not an application failure; CI uses its own stack and the PR checks provide the CI evidence.
- M-INV2 remains a forced-failure rollback check, not observed red.
- The sales-path capacity trigger is defence in depth and is not separately mutated.
- The subscription-lock concurrency path is exercised by the concurrent STARTER test but is not separately mutated because the failure is timing-dependent.
- The matrix runs against a single local PostgreSQL instance and does not prove production behaviour.

## 6. Links

- Issue: [#181](https://github.com/match-pulse/match-pulse/issues/181)
- PR: Pending
- Execution plan / audit: [v3 audit](../audits/2026-11-10-171-v3-audit.md), [execution plan](../exec-plans/173-audit-remediation.md)
- Findings register: FND-020
- AI transparency entry: Entry 59
- Changelog row: pending release section

## 7. Addenda

2026-11-10: The first CI run of this matrix exposed a weak assertion: `t-inv8-cohort-suppression` did not fail the test because the cohort test checked only the `suppressed` flag while the mutation still returned the metrics. The test now also asserts that suppressed rows have null `trades`, `shares`, `last_price` and `unique_predictors`, and that the allowed cohort has non-null metrics. With the mutation applied the strengthened test failed locally; after restoring the schema it passed. The matrix was rerun and the result is recorded below.
