# Tasks

## 1. Mutation catalog and runner

- [ ] 1.1 Add `tests/fault-injection/mutations/` with one SQL mutation per row in the design catalog, and verify each file applies to a clean local database.
- [ ] 1.2 Add `scripts/fault-injection.ts` with a typed catalog, `psql` execution through the Supabase database container, targeted `bun test` execution, expected non-zero exit, `supabase db reset` restore, and JSON result output; verify it reports a deliberate maintenance error when a target text is missing.
- [ ] 1.3 Add a `bun run fault:inject` script entry and verify the command prints one result line per mutation.

## 2. Missing test scenarios

- [ ] 2.1 Add an atomic-rollback scenario for M-INV2 that forces a failure after a partial write and asserts no trade, position or balance survives; verify it passes on the restored schema.
- [ ] 2.2 Split or add M-INV7 detail assertions for ladder, cap, decay, scope, no-escalation and exit exemption; verify each scenario is independently named and passes on the restored schema.

## 3. Observation and records

- [ ] 3.1 Run the full mutation matrix and verify every mutation produces a non-zero targeted test exit; record the exact command, environment, runtimes and results.
- [ ] 3.2 Restore the schema after the matrix and verify the invariant suite returns to 28 pass / 0 fail.
- [ ] 3.3 Update the invariant registry status for M-INV1, M-INV2, M-INV3, M-INV5, M-INV8 and the M-INV7 details, and verify the new statuses match the observed results.
- [ ] 3.4 Add a dated verification record and update the FND-002 lifecycle; verify the record links every mutation to its test and observed failure.
- [ ] 3.5 Add the dedicated CI job or documented manual command, and verify it is reproducible from a clean checkout.
- [ ] 3.6 Update the AI transparency log and the methodology report with the new evidence and its limits.

## Workflow follow-up

- Archive the OpenSpec change after the tasks and the project review requirements are complete.
- Verify the archived spec and the resulting records.
