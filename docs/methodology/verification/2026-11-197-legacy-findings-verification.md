# Verification Record — Legacy Findings FND-001, FND-003 and FND-005

- **Issue:** [#197](https://github.com/match-pulse/match-pulse/issues/197)
- **PR:** Pending
- **Date:** 2026-11-10
- **Environment:** Local Fedora 44; Bun 1.4.2; local Supabase PostgreSQL 17.11
- **Status:** Verified — human decision owner confirmed the campaign; targeted evidence re-run
- **Verifier:** Implementation Agent / Test Engineer (evidence); Human developer (final verification, 2026-11-10)

## 1. Claim or Acceptance Criterion

FND-001: authentication, RLS and grants prevent anonymous and cross-user private reads/mutations.
FND-003: trade entry/exit retries are idempotent and a reused request key with a different payload is refused.
FND-005: the capacity and registration-uniqueness tests are self-contained and do not depend on earlier tests.

## 2. Method

- Re-ran the authorization and v3 tenancy suites against the real local Supabase/PostgreSQL boundary.
- Re-ran the idempotency suite.
- Re-ran the capacity and registration-uniqueness suites together, after the earlier remediation changes.
- No code was changed for this record.

## 3. Command or Evidence

```text
bun test --env-file=.env.local tests/invariants/authorization.test.ts tests/integration/v3-club-tenancy.test.ts
20 pass / 0 fail, 186 expect() calls

bun test --env-file=.env.local tests/invariants/idempotency.test.ts
6 pass / 0 fail, 42 expect() calls

bun test --env-file=.env.local tests/invariants/tournament-capacity.test.ts tests/invariants/registration-uniqueness.test.ts
3 pass / 0 fail, 18 expect() calls
```

The capacity burst recorded p95 755.77 ms for 100 concurrent requests.

## 4. Result

- FND-001: the authorization and v3 tenancy suites pass, including removed-member attendee denial and platform-admin direct-read denial.
- FND-003: replay, concurrent duplicate, payload-mismatch and exit-retry tests pass.
- FND-005: the capacity and uniqueness tests pass independently; each creates its own fixture.
- The findings are Verified.

## 5. Limitations

- Local/CI environment only; no hosted production evidence.
- The full suite and CI run remain the final campaign evidence.
- The human decision owner confirmed the overall campaign on 2026-11-10.

## 6. Links

- Issue: [#197](https://github.com/match-pulse/match-pulse/issues/197)
- PR: Pending
- Findings register: FND-001, FND-003, FND-005
- AI transparency entry: Entry 62
- Related: [final campaign verification](2026-11-173-audit-remediation.md)

## 7. Addenda

Pending PR link.
