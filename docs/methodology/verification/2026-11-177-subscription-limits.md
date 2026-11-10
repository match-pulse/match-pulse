# Verification Record — Subscription Limits and Concurrency

- **Issue:** [#177](https://github.com/match-pulse/match-pulse/issues/177)
- **PR:** Pending
- **Date:** 2026-11-10
- **Environment:** Local Fedora 44; Node 22.23.1; Bun 1.4.2; Docker CE 29.9.3; local Supabase PostgreSQL 17.11
- **Status:** Partially verified — targeted implementer evidence; full suite and independent verification pending
- **Verifier:** Implementation Agent (evidence only; independent verifier required)

## 1. Claim or Acceptance Criterion

FND-019: a missing or inactive subscription cannot create events or invite members; it is not treated as unlimited.
FND-028: concurrent member/event limit checks cannot exceed the active plan limit.

## 2. Method

- Replaced the invite, accept and event-creation RPCs with a subscription → invite/member/event lock order.
- Required the relevant entitlement before reading `entitlement_limit`.
- Ran the database-backed v3 tenancy suite, including a canceled subscription and four concurrent STARTER event creations.

## 3. Command or Evidence

```text
bun test --env-file=.env.local tests/integration/v3-club-tenancy.test.ts
9 pass / 0 fail, 87 expect() calls
```

Observed behaviour:

- A `CANCELED` club is refused with `plan entitlement required: max_active_events` and `max_members`.
- Four concurrent STARTER event creations commit exactly three events; the fourth is refused.
- Existing active STARTER/PRO/ELITE plan tests still pass.

## 4. Result

- Targeted tests pass.
- The subscription lock order is documented in the migration and used by invite, accept and event creation.
- Full-suite/fault-injection and independent verification remain pending after rebase.

## 5. Limitations

- The full suite was not run on this branch because the market/ticketing/reward PRs are not all merged.
- The concurrent test uses four requests against a STARTER limit of three; it is not a high-load benchmark.
- Local Kong/Docker DNS workaround remains an environment limitation.

## 6. Links

- Issue: [#177](https://github.com/match-pulse/match-pulse/issues/177)
- PR: Pending
- Execution plan / audit: [v3 audit](../audits/2026-11-10-171-v3-audit.md), [execution plan](../exec-plans/173-audit-remediation.md)
- Findings register: FND-019, FND-028
- AI transparency entry: Entry 56
- Changelog row: pending release section

## 7. Addenda

Pending PR link, full-suite evidence and independent verification.
