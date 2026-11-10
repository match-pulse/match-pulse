# Verification Record — Ticketing Integrity

- **Issue:** [#178](https://github.com/match-pulse/match-pulse/issues/178)
- **PR:** Pending
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

## 4. Result

- Targeted v3 database tests pass.
- The cumulative cap and legacy scope are implemented.
- Full-suite, CLI, E2E and fault-injection evidence are pending the branch rebase and the evidence workstream.
- FND-012, FND-017 and FND-018 are implementation-complete and eligible for independent verification after merge.

## 5. Limitations

- The full suite was not run on this branch because the market lifecycle PR #185 is not merged yet; it will be rebased and rerun.
- The venue-capacity trigger is defence in depth behind the `ticket_allocation <= max_capacity` configuration rule.
- No UI E2E specifically covers the hidden legacy forms on v3 events; the database refuses the paths regardless.
- Local Kong/Docker DNS workaround remains an environment limitation.

## 6. Links

- Issue: [#178](https://github.com/match-pulse/match-pulse/issues/178)
- PR: Pending
- Execution plan / audit: [v3 audit](../audits/2026-11-10-171-v3-audit.md), [execution plan](../exec-plans/173-audit-remediation.md)
- Findings register: FND-012, FND-017, FND-018
- AI transparency entry: Entry 54
- Changelog row: pending release section

## 7. Addenda

Pending PR link, full-suite evidence and independent verification.
