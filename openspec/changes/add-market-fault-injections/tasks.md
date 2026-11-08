# Tasks

## 1. Mutation catalog and runner

- [ ] 1.1 Add `scripts/fault-injection/sql.ts` and `scripts/fault-injection/mutations.ts` with one typed mutation per row in the design catalog; verify each mutation extracts its target and would fail loudly if the target text is missing.
- [ ] 1.2 Add `scripts/fault-injection.ts` with `psql` execution through the Supabase database container, targeted `bun test` execution, declared `pass`/`fail` expectations, `bun x supabase db reset` restore, and JSON result output; verify it reports a deliberate maintenance error when a target text is missing.
- [ ] 1.3 Add a `bun run fault:inject` script entry and verify the command prints one result line per mutation.

## 2. Missing test scenarios

- [ ] 2.1 Add an atomic-rollback scenario for M-INV2 that forces a failure after a partial write and asserts no trade, position or balance survives; verify it passes on the restored schema.
- [ ] 2.2 Verify the existing M-INV7 tests cover ladder, cap, decay, scope, no-escalation and exit exemption; add or rename only where a detail is not separately observable.

## 3. Observation and records

- [ ] 3.1 Run the full mutation matrix and verify every observed-red mutation produces a non-zero targeted test exit and the M-INV2 forced-failure test passes; record the exact command, environment, runtimes and results.
- [ ] 3.2 Restore the schema after the matrix and verify the invariant suite returns to 28 pass / 0 fail.
- [ ] 3.3 Update the invariant registry status for M-INV1, M-INV2, M-INV3, M-INV5, M-INV8 and the M-INV7 details, and verify the new statuses match the observed results, including the M-INV2 forced-failure limit.
- [ ] 3.4 Add a dated verification record and update the FND-002 lifecycle; verify the record links every mutation to its test and observed failure.
- [ ] 3.5 Add the dedicated CI job or documented manual command, and verify it is reproducible from a clean checkout.
- [ ] 3.6 Update the AI transparency log and the methodology report with the new evidence and its limits.

## Workflow follow-up

- Archive the OpenSpec change after the tasks and the project review requirements are complete.
- Verify the archived spec and the resulting records.
