# Proposal

## Why

A required numeric form field can be submitted missing or empty and still pass validation. `requiredNumber` converts `null` to `0`, so a missing match score can become a valid 0–0 result. This is a domain-integrity defect: an absent value must be rejected, not silently replaced.

## What Changes

- Reject a missing or empty value in `requiredNumber` before numeric conversion.
- Keep the existing rejection for non-numeric values.
- Keep valid numbers unchanged, including `0` when it was explicitly supplied.
- Add a unit test for missing, empty, non-numeric and valid values.
- Add a database-backed `update_club_match` regression test if the local environment is available.
- Update `FND-032` and the AI transparency record.

No optional numeric field changes. No schema, RPC, UI or dependency change.

## Capabilities

### New Capabilities

- `form-validation`: server-side validation of Server Action form inputs, including required text, required numbers, optional numbers and checkboxes.

### Modified Capabilities

None.

## Impact

- `src/app/actions/form.ts`
- `tests/unit/form.test.ts`
- `tests/integration/v3-club-tenancy.test.ts` (database-backed regression only)
- `docs/methodology/findings-register.md`
- `docs/methodology/ai-transparency-log.md`
