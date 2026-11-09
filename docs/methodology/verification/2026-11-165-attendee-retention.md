# Verification — v3 Attendee-Data Retention

- **Date:** 2026-11-09
- **Issue:** #165 (part of #153)
- **Pull request:** #166
- **CI run:** [42626348710](https://github.com/match-pulse/match-pulse/actions/runs/42626348710)
- **Scope:** service-role-only cleanup of attendee identity from past-event tickets
- **Related:** [Execution plan](../exec-plans/153-v3-club-subscriptions.md), [ADR-010](../../architecture/adr/010-nominal-ticketing-and-attendee-identity.md), [runbook](../../operations/runbook.md)

## 1. What was verified

- A ticket for an event older than the retention window loses its attendee name, date/place of birth, tax code/document and fan-card number.
- The ticket code, order id, points and audit record remain.
- A ticket for a recent event keeps its attendee identity.
- The cleanup writes an `attendee.retention` audit event.
- An authenticated fan cannot execute the cleanup function.
- The existing database, CLI, E2E, delivery and fault-injection jobs remain green.

## 2. Observed results

| Check | Result |
| :--- | :--- |
| `Domain invariants` | **42 pass / 0 fail** (includes the retention test) |
| `test:agent` | 2 pass / 0 fail |
| `E2E and accessibility` | 11 passed |
| `Lint, typecheck and build` | passed |
| `Delivery and recovery` | passed |
| `Fault injection` | passed |

## 3. Defects found and fixed during verification

No new defect was observed in the final run. The retention test creates an old and a recent event, runs the service-role cleanup, and confirms the authenticated denial.

## 4. Limits

- The retention window is a maintenance parameter (default 365 days), not a scheduled production job.
- The legal retention period has not had an independent privacy review.
- The audit event has no actor because the maintenance context is the service role; production scheduling and approval are out of scope.
- No real payments, financial KYC, hosted deployment or production recovery is claimed.

## 5. Conclusion

Attendee identity can now be removed from past tickets without losing the ticket, order, points or audit trail, while recent tickets and authenticated access remain protected.
