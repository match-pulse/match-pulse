# Verification Record — Ticketing Integrity

- **Issue:** [#178](https://github.com/match-pulse/match-pulse/issues/178)
- **PR:** [#186](https://github.com/match-pulse/match-pulse/pull/186)
- **Date:** 2026-11-10
- **Environment:** Local Fedora 44; Node 22.23.1; Bun 1.4.2; Docker CE 29.9.3; local Supabase PostgreSQL 17.11
- **Status:** Partially verified — targeted implementer evidence; full suite after rebase and independent verification pending
- **Verifier:** Implementation Agent (evidence only; independent verifier required)

## 1. Claim or Acceptance Criterion

FND-012: the buyer cap is cumulative per event across orders and channels.
FND-017: legacy claim and registration work only for `club_id IS NULL` events.
FND-018: ticket sales cannot exceed venue capacity or allocation, and an event cannot configure allocation above capacity.

## 2. Method

- Added a `ticket_orders` trigger for the cumulative buyer limit, a `tournaments` trigger for allocation/capacity configuration, and a `tickets` trigger for venue capacity.
- Replaced `claim_ticket` and `register_for_tournament` so v3 club events reject the legacy paths; the v2 pages filter to legacy tournaments.
- Ran the database-backed v3 tenancy suite, which exercises sequential and concurrent purchases, event configuration, claim refusal and registration refusal.
- The full database/CLI/E2E suite will run after the branch is rebased onto the merged market lifecycle PR.

## 3. Command or Evidence

```text
bun test --env-file=.env.local tests/integration/v3-club-tenancy.test.ts
9 pass / 0 fail, 91 expect() calls
```

Observed behaviour:

- A buyer with four tickets cannot place a fifth order; the message contains `maximum per buyer`.
- Two concurrent three-ticket orders for a cap of four commit only one order (three tickets).
- Creating a club event with capacity 2 and allocation 3 is refused.
- A v3 event claim is refused with `legacy claim is not available`.
- A v3 event registration returns `false`; the legacy event path remains covered by the MVP backend suite.
- Existing v3 purchase, transfer, check-in, box-office, retention and security tests still pass.

Full suite after rebasing onto the merged market lifecycle and resetting the local database:

```text
bun run test
50 pass / 0 fail, 416 expect() calls

bun run test:agent
2 pass / 0 fail, 29 expect() calls

bun run test:e2e
11 passed

bun run build (local .env.local)
passed
```

## 4. Result

- Targeted, full database (50 tests), CLI (2) and E2E (11) suites pass.
- The cumulative cap and legacy scope are implemented.
- Fault injection for the new triggers remains for the evidence workstream.
- FND-012, FND-017 and FND-018 are implementation-complete and eligible for independent verification after merge.

## 5. Limitations

- The tests use synthetic matches/markets and a disposable local database.
- The venue-capacity trigger is defence in depth behind the `ticket_allocation <= max_capacity` configuration rule.
- No UI E2E specifically covers the hidden legacy forms on v3 events; the database refuses the paths regardless.
- Fault-injection mutations for the new triggers are not added yet (FND-020 evidence work).
- Local Kong/Docker DNS workaround remains an environment limitation.
- The E2E run emitted pre-existing Next.js `Date.now()` prerender warnings but all 11 tests passed.

## 6. Links

- Issue: [#178](https://github.com/match-pulse/match-pulse/issues/178)
- PR: [#186](https://github.com/match-pulse/match-pulse/pull/186)
- Execution plan / audit: [v3 audit](../audits/2026-11-10-171-v3-audit.md), [execution plan](../exec-plans/173-audit-remediation.md)
- Findings register: FND-012, FND-017, FND-018
- AI transparency entry: Entry 54
- Changelog row: pending release section

## 7. Addenda

2026-11-10: PR [#186](https://github.com/match-pulse/match-pulse/pull/186) opened; full-suite evidence recorded; independent verification pending.

2026-11-10: The human decision owner confirmed the remediation campaign as verified and authorized closure of #173. This finding is now Verified. See the [final campaign verification](2026-11-173-audit-remediation.md).
