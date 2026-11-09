# Verification — v3.0.0 Club Tenancy and Nominal Ticketing Schema

- **Date:** 2026-11-09
- **Issue:** #157 (part of #153)
- **Pull request:** #158
- **CI run:** [42609325110](https://github.com/match-pulse/match-pulse/actions/runs/42609325110)
- **Scope:** database schema, RLS, helper functions, club/plan RPCs, nominal ticketing RPCs and legacy compatibility
- **Related:** [ADR-007](../../architecture/adr/007-club-tenancy-and-entitlements.md), [ADR-008](../../architecture/adr/008-platform-admin-and-operator-boundary.md), [ADR-010](../../architecture/adr/010-nominal-ticketing-and-attendee-identity.md), [execution plan](../exec-plans/153-v3-club-subscriptions.md)

## 1. What was verified

- A clean `supabase db reset` applies every migration and the seed.
- The v3 integration suite passes against a real local PostgreSQL/Supabase boundary:
  - club creation, `OWNER` membership and STARTER/PRO entitlements;
  - platform-admin plan assignment and audit;
  - nominal purchase for two named attendees;
  - maximum-four refusal;
  - fan-card requirement and valid-card purchase;
  - ticket transfer before the deadline;
  - idempotent check-in;
  - box-office channel sale;
  - cross-club attendee and order isolation;
  - aggregate prediction insights with the threshold-5 suppression;
  - fan own-order visibility and other-club denial.
- The existing v2 invariant, authorization, idempotency and lifecycle suites remain green.
- The delivery/recovery job backs up and restores the public schema, including the new tables and policies.
- The fault-injection matrix still produces its expected observed-red results.
- The existing Playwright role journeys and axe checks still pass.
- Lint, typecheck, build and architecture guards pass.

## 2. Observed results

| Check | Result |
| :--- | :--- |
| `Domain invariants` | **41 pass / 0 fail** across 10 files |
| `Delivery and recovery` | backup/restore passed; 26 tables, 35 policies, marker restored |
| `Fault injection` | 11 expected results, full suite green after restore |
| `E2E and accessibility` | passed |
| `Lint, typecheck and build` | passed |

## 3. Defects found and fixed during verification

1. **Backup/restore dependency.** The `club_invites.token` default used `gen_random_bytes` from the `extensions` schema, which is absent in the scratch restore database. The table failed to restore and the table/policy counts differed. Replaced the default and token generator with a UUID-based value that needs no extension.
2. **Legacy market resolution regression.** The club-aware `resolve_market` initially required tournament ownership even for legacy markets with no tournament link, breaking three v2 tests. Restored the legacy organizer rule while keeping club-member resolution for club-linked events.
3. **Ambiguous column in check-in.** `RETURNING checked_in_at` collided with the output parameter of the same name. Qualified it as `RETURNING tickets.checked_in_at`.
4. **CI port collision.** The fault-injection job twice failed to bind port 54322 before starting Supabase. Added a port-free step to the job.

## 4. Limits

- The application UI, Server Actions, auth and CLI are not yet migrated to the v3 contract. The v3 RPCs are database-only at this point.
- The existing anonymous fan path and global organizer/club roles remain available for backward compatibility until the application is migrated.
- Attendee retention cleanup is not implemented yet.
- No real payments, financial KYC, hosted deployment or production recovery is claimed.
- FND-007 real-club evidence and FND-008 independent review remain open human gates.

## 5. Conclusion

The v3 database foundation is verified at the local/CI boundary. The next increment is the email/password and shared-contract application layer, followed by the CLI and the remaining UI.
