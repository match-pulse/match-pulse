# Tasks

## 1. Reproduce the defect

- [x] 1.1 Add `tests/unit/form.test.ts` covering missing, empty, whitespace, non-numeric, explicit `0`, positive and negative required numbers; verify the missing/empty cases fail against the current helper.

## 2. Fix the required-number helper

- [x] 2.1 Update `requiredNumber` in `src/app/actions/form.ts` to reject a missing or empty value before `Number()`; verify `tests/unit/form.test.ts` passes and explicit `0` still returns `0`.

## 3. Cover the database boundary

- [x] 3.1 Add an `update_club_match` regression case in `tests/integration/v3-club-tenancy.test.ts` that sends `NULL` scores and expects the non-negative-score error; run the targeted test when Supabase is available, otherwise record the reason.

## 4. Record the evidence

- [x] 4.1 Update `FND-032` in `docs/methodology/findings-register.md` with the verification link and status; verify the register links resolve.
- [x] 4.2 Append the AI transparency entry for issue #223; verify the entry links to the verification evidence.

## 5. Integration checks

- [x] 5.1 Run `bun run lint`, `bun run typecheck`, `bun run build` and `bun run check:architecture`; record the observed results.
- [x] 5.2 Run the unit suite and the targeted database tests; record any environment limitation rather than claiming an unrun check.

## Workflow follow-up

- Archive the OpenSpec change after the PR is reviewed and merged.
- Verify the archived delta appears in the main `form-validation` spec.
