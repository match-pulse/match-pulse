# Execution Plan — v3.0.0 Club Subscriptions, Cross-Club Fans and CLI

- **Status:** Approved by the human decision owner on 2026-11-09.
- **Issue:** #153
- **Branch:** `arch/153-v3-club-subscriptions`
- **Decision owner:** Human developer
- **Risk level:** High — tenancy, authorization, authentication, schema, simulated commerce and a new CLI surface
- **Related:** [Kata](../../architecture/kata.md), [Domain model](../../architecture/02-domain-model.md), [Architecture characteristics](../../architecture/03-architecture-characteristics.md), [ADR-007](../../architecture/adr/007-club-tenancy-and-entitlements.md), [ADR-008](../../architecture/adr/008-platform-admin-and-operator-boundary.md), [ADR-009](../../architecture/adr/009-email-password-and-simulated-commerce.md), [Findings register](../findings-register.md), [Test strategy](../test-strategy.md)

## 1. Intent

MatchPulse v2.0.x is a three-role MVP with a fan, organizer and club analytics role. The next increment makes the product model explicit: **clubs are the paying tenant**, fans are global accounts that can participate in events from any club, and subscription plans gate features in the database.

The increment must remain a course project. It uses **simulated commerce**, **no KYC**, no real payment provider and no hosted production deployment. The goal is a complete, coherent, testable architecture and methodology story, not a market launch.

## 2. Current state

- `v2.0.1` is the published release; `main` is green.
- Roles are global `FAN`, `ORGANIZER` and `CLUB`; fans use anonymous Supabase sessions.
- Tournaments are owned by an organizer profile; there is no club/tenant entity.
- Tickets are claimed, not sold; rewards are global local codes.
- Prediction markets are points-only per match.
- Club analytics are aggregate-only with a threshold of 5.
- Mutations are Postgres RPCs behind thin Server Actions.
- CI has build, invariants, delivery/recovery, fault-injection and E2E/accessibility jobs.
- Checkpoints D and E wait for L13–L16 and L17–L20.
- FND-007 (real-club validation) and FND-008 (independent review) remain open human gates.

## 3. Scope

### Included

- Clubs as tenants with `OWNER`, `ADMIN`, `STAFF` and `ANALYST` memberships.
- A user may belong to multiple clubs and may also be a fan.
- Email/password authentication for fans, club organizers and the platform admin; anonymous fan auth is removed.
- `STARTER`, `PRO` and `ELITE` plans with database-enforced entitlements.
- Platform admin for clubs, plans, subscription status and audit.
- Club-scoped events, ticket types, simulated orders, ticket codes and check-in.
- Fans can buy tickets and predict across events from any club.
- Clubs see aggregate prediction choices and engagement for their own events only; cohorts below 5 are suppressed.
- A shared domain contract, a CLI with JSON output and help, and an executable agent playbook covering every capability.
- ADRs, domain model/kata updates, reports addendum, test strategy, threat model and release `v3.0.0`.

### Non-goals

- Real payment processing, Stripe, invoices, refunds or settlement.
- KYC, AML or identity verification.
- Real-money prediction markets or cash prizes.
- Hosted production deployment, monitoring or production recovery.
- Data resale, cross-club discounts or a data marketplace.
- Customer discovery as a course deliverable.
- Migrating anonymous fan sessions to email/password accounts.

## 4. Assumptions

- The course uses local/CI evidence; no production data exists.
- Local database reset is acceptable for this increment.
- Email confirmation is disabled for local/CI and documented as a production gap.
- The platform admin is the human owner, seeded by an operator script, not public sign-up.
- A club may have multiple members; the UI provides a club switcher.
- Simulated money is clearly labelled everywhere and never represented as real revenue.

## 5. Key decisions

| ID | Decision | Consequence |
| --- | --- | --- |
| D1 | Clubs are the tenant; events belong to a club, not a global organizer. | Tournaments gain `club_id`; organizer ownership migrates to club membership. |
| D2 | Authorization is role + club membership + entitlement. | Every RPC and RLS policy must enforce all three. |
| D3 | Fans are global email/password accounts. | Anonymous sessions are removed; a fan can participate across clubs. |
| D4 | Clubs see aggregate prediction data only, threshold 5. | No personal identity or cross-club history is exposed to clubs. |
| D5 | Commerce is simulated; no KYC. | Orders, prices and plan changes are records, not money movement. |
| D6 | The CLI is a second client of the shared contract, not the source of truth. | Server Actions and the CLI call the same validation and RPC wrappers. |
| D7 | Platform admin is separate from the service role. | Admin actions use user sessions and audit; service role stays in ops/fixtures. |

## 6. Acceptance criteria

- A fan can sign up with email/password, buy a simulated ticket for Club A, predict on Club A's match, then do the same for Club B with one account.
- Club A cannot read Club B's events, orders, tickets, members or analytics.
- A club owner can create a club, choose a plan, invite staff, create an event, publish ticket types and check in a ticket.
- `STARTER` cannot enable prediction markets or export; `PRO` can enable predictions and view aggregate insights; `ELITE` can export.
- The platform admin can assign a plan and view audit without impersonating a user or changing fan points.
- The CLI exposes every customer and admin capability with `--json`, deterministic exit codes and request ids.
- The agent playbook runs the full match-day journey plus authorization, privacy, entitlement and concurrency scenarios in CI.
- All existing tests remain green; new tenancy, entitlement, privacy, order and auth tests pass.
- Reports, ADRs, README, changelog, verification records and PDFs are updated; `v3.0.0` is released.

## 7. Work breakdown

1. **Phase 0 — contract**: execution plan, ADR-007/008/009, capability manifest, agent playbook skeleton, OpenSpec change.
2. **Phase 1 — schema and authorization**: clubs, members, invites, platform admins, plans, entitlements, subscriptions, ticket types, orders, tickets, club-scoped events; RLS, grants, helpers and migration.
3. **Phase 2 — domain RPCs**: club onboarding, members, events, ticket types/orders/check-in, predictions, analytics, admin plan/status/audit.
4. **Phase 3 — identity and shared contract**: email/password sign-up/sign-in, remove anonymous auth, shared validation and typed RPC wrappers.
5. **Phase 4 — CLI**: auth, profiles, JSON/help, fan/club/admin/ops commands and contract tests.
6. **Phase 5 — UI**: fan discovery/checkout/tickets/predictions; club onboarding/dashboard/events/tickets/members/plan/analytics; admin console.
7. **Phase 6 — agent playbook**: executable scenarios, coverage gate, CI job and evidence artifact.
8. **Phase 7 — course wrap**: reports, checkpoints D/E mapping, PDFs, verification records and `v3.0.0` release.

## 8. Verification

- `bun run lint`, `bun run typecheck`, `bun run build`, `bun run test`.
- New database-backed suites for club isolation, role matrix, entitlements, fan cross-club access, ticket capacity/oversell, idempotent orders/check-in and privacy threshold.
- `bun run test:agent` against local Supabase.
- `bun run test:e2e` and axe on the new pages.
- `bun run check:architecture`, `bun run check:secrets`, `bun run perf`.
- Dated verification records for tenancy/entitlements, ticket orders, auth and CLI/playbook.
- One AI transparency entry per issue and an updated findings register.

## 9. Risks and recovery

| Risk | Mitigation |
| --- | --- |
| Scope exceeds course time | Cut line: core tenancy/plans/admin/auth/cross-club fan/CLI; defer ticket orders and ELITE export to `v3.1.0`. |
| RLS regression or cross-club leak | Deny-by-default policies, isolation tests, security review gate. |
| Auth migration breaks sessions | Remove anonymous auth deliberately; local reset; sign-up/sign-in tests. |
| Entitlement bypass | Enforce in RPCs and helpers; UI is never the only gate. |
| Ticket oversell | Transactional capacity checks and concurrent purchase tests. |
| Privacy leak | Aggregate-only responses, threshold 5, no personal data in club payloads. |
| CLI token exposure | `0600` config or keychain; no passwords in arguments; profiles per actor. |
| Course deadline | Freeze scope after Phase 6; reports and release before optional work. |

Migrations are forward-only. Take a local backup before applying; local reset is acceptable for the course. No production deployment is involved.

## 10. Stop conditions

Stop and request a human decision if:

- a tenancy or entitlement change would alter an approved domain invariant;
- RLS cannot enforce a rule without a schema redesign;
- email/password migration requires deleting non-test data;
- the course deadline conflicts with the planned scope;
- a security or privacy review finds a cross-club exposure.

## 11. Human gates

- Approve ADR-007, ADR-008 and ADR-009.
- Confirm the plan/entitlement matrix and limits.
- Confirm email confirmation is disabled for local/CI.
- Confirm club self-serve onboarding with simulated plan selection.
- Confirm ticket check-in is in scope.
- Provide L13–L20 for Checkpoint D/E finalization.
- Arrange FND-008 independent review.
- Approve the `v3.0.0` tag and release.
