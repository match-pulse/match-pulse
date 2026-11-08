# Proposal

## Why

FND-002 records that five market invariants and the M-INV7 detail set have
passing tests but no observed-red fault injection. The project's own definition
of "verified" requires the test to fail when the enforcing mechanism is
deliberately weakened. Without that observation, the invariant registry would
overstate what the suite proves.

## What Changes

- Add a repeatable fault-injection runner for the remaining market invariants:
  M-INV1, M-INV2, M-INV3, M-INV5, M-INV8 and the M-INV7 ladder, cap, decay,
  scope, no-escalation and exit-exemption details.
- Add a mutation catalog: one small SQL mutation per invariant, applied to the
  local Supabase database, followed by the targeted test.
- The runner must expect a non-zero test exit for each mutation, restore the
  database to a clean migration state, and record the observed result.
- Add any missing test scenario needed to expose the mutation, especially an
  atomic-rollback scenario for M-INV2 and separate M-INV7 detail scenarios.
- Record the observed-red evidence in the invariant registry and a dated
  verification record.
- Update the FND-002 lifecycle only after the observations exist.
- No product behavior, schema, pricing, authorization or UI change is intended.
  The mutations are temporary and are restored before the next run.

## Capabilities

No spec-level behavior changes. The requirements are already recorded in the
invariant registry and domain model; this change adds verification evidence, not
new system behavior. `skip_specs: true` is set in `.openspec.yaml`.

### New Capabilities

None.

### Modified Capabilities

None.

## Impact

- `scripts/` or `tests/fault-injection/` for the runner and mutation catalog.
- `tests/invariants/` for any missing scenario.
- `docs/methodology/checkpoint-A/02-invariants.md` for status changes.
- `docs/methodology/findings-register.md` for the FND-002 lifecycle.
- `docs/methodology/verification/` for the dated observation record.
- CI may gain a dedicated fault-injection job; it does not change the
  application runtime.
