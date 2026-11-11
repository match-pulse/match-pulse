# Verification — Required numeric validation (Issue #223 / FND-032)

- **Date:** 2026-11-11
- **Issue:** [#223](https://github.com/match-pulse/match-pulse/issues/223)
- **Finding:** FND-032
- **Branch:** `fix/223-required-number`
- **Environment:** local Fedora; Bun 1.4.2; Next.js 16.4.2
- **Status:** Fixed locally — unit and static checks pass; database regression and CI are pending

## 1. Claim

A required numeric Server Action field must reject a missing, empty or whitespace-only value instead of coercing it to `0`. An explicit `0` and other finite numbers must still pass. Optional numeric fields must keep their existing behavior.

## 2. Method

- Added `tests/unit/form.test.ts` with missing, empty, whitespace, non-numeric, explicit `0`, positive and negative cases.
- Confirmed the missing/empty cases failed against the old helper: two failures, missing and empty returned `0`.
- Updated `requiredNumber` to reject `text() === null` before `Number()`.
- Added a database-boundary regression in `tests/integration/v3-club-tenancy.test.ts` that sends `NULL` scores to `update_club_match` and expects `scores must be non-negative`.

## 3. Evidence

```text
$ bun test tests/unit
 6 pass
 0 fail
 13 expect() calls
Ran 6 tests across 2 files.

$ bun run lint
pass

$ bun run typecheck
pass

$ bun run build
pass — Next.js production build completed

$ bun run check:architecture
pass — all five architecture guards
```

The database regression was **not run locally**: the local Supabase stack failed its health check with `HealthCheckTimeoutError` / HTTP 502 for REST and edge runtime. The test remains in the suite and will run in CI's `Domain invariants` job.

## 4. Result

- Missing required numeric value → validation error, no `0`.
- Empty or whitespace-only value → validation error.
- Non-numeric value → validation error.
- Explicit `0`, positive and negative finite values → accepted unchanged.
- Optional numeric fields unchanged.

## 5. Limits

- The database test has not run locally; CI evidence is pending.
- No independent human review yet.
- The fix changes a shared helper used by match scores, ticket quantity, reward cost/discount and event capacity. The full database suite is the integration check.

## 6. Links

- Issue: [#223](https://github.com/match-pulse/match-pulse/issues/223)
- OpenSpec change: `openspec/changes/fix-required-number-validation/`
- Unit test: `tests/unit/form.test.ts`
- DB test: `tests/integration/v3-club-tenancy.test.ts` — `v3 match update validation`
- Findings register: FND-032
