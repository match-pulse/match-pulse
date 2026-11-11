# Design

## Context

See [`proposal.md`](proposal.md) for the defect and the reason. The current `requiredNumber` reads through `text()`, which returns `null` for a missing or empty field, then calls `Number(null)`, which is `0`. The database RPC already rejects `NULL` scores, but the Server Action converts the absent value before the RPC sees it.

## Goals / Non-Goals

**Goals:**

- Reject missing, empty and whitespace-only values before numeric conversion.
- Preserve explicit `0` and other finite numbers.
- Preserve the existing optional-number behavior.
- Add executable unit evidence and a database-boundary regression test.

**Non-Goals:**

- Changing optional numeric fields, required text or checkboxes.
- Changing the `update_club_match` RPC, schema, UI copy or dependencies.
- Refactoring other action modules.

## Decisions

### Decision: validate the raw text before converting

`requiredNumber` will call `text()`, reject `null` as a required-field error, then convert and check `Number.isFinite`. This keeps the fix local to the shared helper and covers every required numeric field.

**Alternative considered:** check `formData.get()` directly. Rejected because it would duplicate `text()` whitespace handling and diverge from the existing helper pattern.

### Decision: keep `optionalNumber` unchanged

An absent optional field still returns `undefined`; a malformed optional value still fails. The defect is specifically the required-field path.

### Decision: test the helper and the database boundary

The unit test invokes `requiredNumber` with `FormData` values: missing, empty, whitespace, non-numeric, explicit `0`, positive and negative. The database test calls `update_club_match` with `NULL` scores and expects a non-negative-score error. The database test is defence in depth; the unit test is the direct regression for the action-layer defect.

## Risks / Trade-offs

- **Risk:** changing a shared helper affects create/update match, ticket quantity, reward cost/discount and event capacity. → **Mitigation:** run the full unit/integration suite; all call sites require a number, so rejecting an absent value is the intended behavior.
- **Risk:** a caller relied on `requiredNumber` returning `0` for a missing field. → **Mitigation:** no such behavior is documented; an explicit `0` still works.
- **Risk:** the local database is unavailable in some environments. → **Mitigation:** the unit test is independent; the database test runs when Supabase is available and is recorded as unverified otherwise.

## Migration Plan

No schema or data migration. Deploy the helper change with the next application release; rollback is a code revert.

## Open Questions

None.
