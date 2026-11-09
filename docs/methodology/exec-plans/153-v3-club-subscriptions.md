# Execution Plan — v3.0.0 Club Subscriptions, Nominal Ticketing and CLI

- **Status:** Approved by the human decision owner on 2026-11-09.
- **Issue:** #153 (sub-issues #154 and #156)
- **Branch:** `arch/153-v3-club-subscriptions`
- **Decision owner:** Human developer
- **Risk level:** High — tenancy, authorization, authentication, schema, nominal identity data, simulated commerce and a new CLI surface
- **Related:** [Kata](../../architecture/kata.md), [Domain model](../../architecture/02-domain-model.md), [Architecture characteristics](../../architecture/03-architecture-characteristics.md), [ADR-007](../../architecture/adr/007-club-tenancy-and-entitlements.md), [ADR-008](../../architecture/adr/008-platform-admin-and-operator-boundary.md), [ADR-009](../../architecture/adr/009-email-password-and-simulated-commerce.md), [ADR-010](../../architecture/adr/010-nominal-ticketing-and-attendee-identity.md), [Competitive landscape](../../product/competitive-landscape.md), [Findings register](../findings-register.md), [Test strategy](../test-strategy.md)

## 1. Intent

MatchPulse v2.0.x is a three-role MVP with a fan, organizer and club analytics role. The next increment makes the product model explicit: **clubs are the paying tenant**, fans are global accounts that can buy tickets and predict across clubs, and subscription plans gate features in the database.

Italian football ticketing is **nominative**: the club is the organizer, tickets are tied to named attendees, identity data is required, a buyer can usually purchase up to four tickets, and digital tickets are becoming the norm. The v3 ticket model must reflect that reality.

The increment remains a course project. It uses **simulated commerce**, **no financial KYC**, no real payment provider and no hosted production deployment. The goal is a complete, coherent, testable architecture and methodology story.

## 2. Competitive context

TicketOne, Vivaticket and Ticketmaster Italy are the main official ticketing channels/technology partners. The real incumbent is often the club's own box office and legacy system. Secondary marketplaces are not official channels.

MatchPulse does not compete as a central consumer marketplace. It is a **club-branded official ticket shop + fan engagement + aggregate prediction insights**, paid for by the club. The club keeps the brand, the fan relationship and the merchant role.

Differentiators:

- club-owned fan relationship and data;
- integrated free-to-play prediction and aggregate insights;
- simple setup and subscription pricing for local clubs;
- box-office and digital channels in one flow.

Non-differentiators for v3: seat maps, turnstile hardware, deep FIGC/Questura integration, real payment processing and large-scale distribution. Those are later integrations, not claims.

## 3. Current state

- `v2.0.1` is the published release; `main` is green.
- Roles are global `FAN`, `ORGANIZER` and `CLUB`; fans use anonymous Supabase sessions.
- Tournaments are owned by an organizer profile; there is no club/tenant entity.
- Tickets are claimed, not sold; one ticket per user/tournament; no attendee data, price, order, QR or check-in.
- Prediction markets are points-only per match.
- Club analytics are aggregate-only with a threshold of 5.
- Mutations are Postgres RPCs behind thin Server Actions.
- CI has build, invariants, delivery/recovery, fault-injection and E2E/accessibility jobs.
- Checkpoints D and E wait for L13–L16 and L17–L20.
- FND-007 (real-club validation) and FND-008 (independent review) remain open human gates.

## 4. Scope

### Included

- Clubs as tenants with `OWNER`, `ADMIN`, `STAFF` and `ANALYST` memberships.
- A user may belong to multiple clubs and may also be a fan.
- Email/password authentication for fans, club organizers and the platform admin; anonymous fan auth is removed.
- `STARTER`, `PRO` and `ELITE` plans with database-enforced entitlements.
- Platform admin for clubs, plans, subscription status and audit.
- Club-scoped events, ticket types, nominal orders, attendees, ticket codes and check-in.
- Buyer vs attendee distinction: one buyer can purchase 1–4 tickets, each tied to a named attendee.
- Attendee identity fields: first name, last name, date of birth, place of birth, tax code/document, optional fan card.
- Configurable ticket-type rules: sector, price, allocation, sales window, max per buyer, fan-card requirement, transferability, away-sector flag.
- Digital ticket page with QR code and idempotent check-in.
- Name change/transfer before a deadline when the ticket type allows it.
- Box-office sales by club staff and an attendee list.
- Club fan-card field and validation for restricted sales.
- Fans can buy tickets and predict across events from any club.
- Clubs see aggregate prediction choices and engagement for their own events only; cohorts below 5 are suppressed.
- A shared domain contract, a CLI with JSON output and help, and an executable agent playbook covering every capability.
- ADRs, competitive landscape, domain model/kata updates, reports addendum, test strategy, threat model and release `v3.0.0`.

### Non-goals

- Real payment processing, Stripe, invoices, refunds or settlement.
- Financial KYC, AML or identity-document verification for payments.
- Real-money prediction markets or cash prizes.
- Hosted production deployment, monitoring or production recovery.
- Data resale, cross-club discounts or a data marketplace.
- Full seat maps, turnstile hardware, Apple/Google Wallet passes or deep FIGC/Questura integration.
- Customer discovery as a course deliverable.
- Migrating anonymous fan sessions to email/password accounts.
- Retroactively adding attendee identity to legacy claimed tickets.

## 5. Assumptions

- The course uses local/CI evidence; no production data exists.
- Local database reset is acceptable for this increment.
- Email confirmation is disabled for local/CI and documented as a production gap.
- The platform admin is the human owner, seeded by an operator script, not public sign-up.
- A club may have multiple members; the UI provides a club switcher.
- Simulated money is clearly labelled everywhere and never represented as real revenue.
- Nominal ticketing identity data is event-access data, not financial KYC. The club is the data controller and MatchPulse the processor.
- The default maximum is four tickets per buyer per event; clubs can configure lower limits.
- Fan-card, transfer, box-office and away-sector rules are in `v3.0.0`; deep external integration is not.

## 6. Key decisions

| ID | Decision | Consequence |
| --- | --- | --- |
| D1 | Clubs are the tenant; events belong to a club, not a global organizer. | Tournaments gain `club_id`; organizer ownership migrates to club membership. |
| D2 | Authorization is role + club membership + entitlement. | Every RPC and RLS policy must enforce all three. |
| D3 | Fans are global email/password accounts. | Anonymous sessions are removed; a fan can participate across clubs. |
| D4 | Clubs see aggregate prediction data only, threshold 5. | No personal identity or cross-club history is exposed to clubs. |
| D5 | Commerce is simulated; no financial KYC. | Orders, prices and plan changes are records, not money movement. |
| D6 | Ticketing is nominative: buyer and attendee are distinct. | One order can contain up to four tickets, each with attendee identity data. |
| D7 | The club is the organizer; MatchPulse is the white-label channel. | Club-branded shop, club terms/privacy, simulated club merchant. |
| D8 | The CLI is a second client of the shared contract, not the source of truth. | Server Actions and the CLI call the same validation and RPC wrappers. |
| D9 | Platform admin is separate from the service role. | Admin actions use user sessions and audit; service role stays in ops/fixtures. |

## 7. Acceptance criteria

- A fan can sign up with email/password, buy two nominal tickets for Club A (assigning a different attendee to each), predict on Club A's match, then buy a ticket for Club B with the same account.
- The checkout requires attendee identity fields, terms acceptance and a request id; retries do not duplicate orders or tickets.
- A buyer cannot exceed four tickets per event; the refusal leaves committed state unchanged.
- A ticket type that requires a fan card refuses a purchase without a valid card.
- A ticket can be transferred to a new named attendee before the deadline when the type is transferable; a non-transferable or late transfer is refused.
- Club staff can check in a ticket by code; a second check-in is idempotent; another club is refused.
- Club staff can sell a ticket through the box-office channel; the order is audited.
- Club A cannot read Club B's events, orders, attendees, tickets, members or analytics.
- A club `ANALYST` can read aggregate sales and prediction data but not attendee identity.
- A club owner can create a club, choose a plan, invite staff, create an event, publish ticket types and view sales.
- `STARTER` cannot enable prediction markets or export; `PRO` can enable predictions and view aggregate insights; `ELITE` can export.
- The platform admin can assign a plan and view audit without impersonating a user or changing fan points.
- Prediction insights contain no attendee/fan identity and suppress cohorts below 5.
- The CLI exposes every customer and admin capability with `--json`, deterministic exit codes and request ids.
- The agent playbook runs the full match-day journey plus nominal ticketing, authorization, privacy, entitlement and concurrency scenarios in CI.
- All existing tests remain green; new tenancy, entitlement, privacy, attendee, order and auth tests pass.
- Reports, ADRs, README, changelog, verification records and PDFs are updated; `v3.0.0` is released.

## 8. Work breakdown

| Phase | Deliverable | Estimate |
| :--- | :--- | ---: |
| **0. Contract** | ADR-007/008/009/010, competitive landscape, capability manifest, agent playbook, kata/domain model, OpenSpec change | 3 days |
| **1. Schema and authorization** | Clubs, members, invites, platform admins, plans, entitlements, subscriptions, ticket types, orders, attendee tickets, transfers, fan cards; RLS, grants, helpers, migration/backfill | 6 days |
| **2. Domain RPCs** | Club onboarding, members, events, matches, ticket types, nominal purchase, transfer, check-in, box office, fan cards, analytics, admin | 5 days |
| **3. Identity and shared contract** | Email/password sign-up/sign-in, remove anonymous auth, shared validation and typed RPC wrappers | 3 days |
| **4. CLI** | Auth, profiles, JSON/help, fan/club/admin/ops commands, contract tests | 4 days |
| **5. Web UI** | Club-branded storefront, attendee checkout, digital ticket/QR, transfer; club dashboard, box office, attendees; admin console | 8 days |
| **6. Agent playbook** | Executable scenarios, coverage gate, CI job and evidence artifact | 3 days |
| **7. Course wrap** | Reports, checkpoints D/E mapping, PDFs, verification records and `v3.0.0` release | 3 days |

**Estimated total:** 22–30 focused working days.

### Issue tree

1. Epic: `v3.0.0 — club subscriptions, nominal ticketing, cross-club fans and CLI`
2. ADRs, competitive landscape and domain model
3. Schema, RLS and grants
4. Club and membership RPCs
5. Plans, subscriptions and entitlement enforcement
6. Nominal ticket types, orders, attendees and capacity
7. Digital ticket, check-in, transfer and box office
8. Fan cards and away-sector rules
9. Email/password auth and account migration
10. Shared domain contract
11. CLI foundation
12. CLI fan commands
13. CLI club commands
14. CLI admin and ops commands
15. Fan UI
16. Club UI
17. Platform admin UI
18. Agent playbook and executable scenarios
19. Course reports, checkpoints and PDFs
20. Release `v3.0.0`

## 9. Verification

- `bun run lint`, `bun run typecheck`, `bun run build`, `bun run test`.
- New database-backed suites for club isolation, role matrix, entitlements, fan cross-club access, nominal attendee data, max-four enforcement, fan-card refusal, transfer deadline, capacity/oversell, idempotent orders/check-in, box-office audit and privacy threshold.
- `bun run test:agent` against local Supabase.
- `bun run test:e2e` and axe on the new pages.
- `bun run check:architecture`, `bun run check:secrets`, `bun run perf`.
- Dated verification records for tenancy/entitlements, nominal ticketing, auth and CLI/playbook.
- One AI transparency entry per issue and an updated findings register.

## 10. Risks, cut line and recovery

| Risk | Mitigation |
| --- | --- |
| Scope exceeds course time | Cut line: core tenancy, plans, admin, email/password, cross-club fan, nominal ticketing, digital check-in and CLI/playbook; defer fan cards, transfers, box office and away-sector rules to `v3.1.0`. |
| Identity-data privacy | Club as controller, platform as processor; operational-role access; retention window; no prediction linkage; no sale. |
| Fan-card/FIGC integration complexity | Model the field and validation; deep integration is later. |
| RLS regression or cross-club leak | Deny-by-default policies, isolation tests, security review gate. |
| Auth migration breaks sessions | Remove anonymous auth deliberately; local reset; sign-up/sign-in tests. |
| Entitlement bypass | Enforce in RPCs and helpers; UI is never the only gate. |
| Ticket oversell | Transactional capacity checks and concurrent purchase tests. |
| Name-change abuse | Deadline, transferable flag, attendee data, audit. |
| CLI token exposure | `0600` config or keychain; no passwords in arguments; profiles per actor. |
| Course deadline | Freeze scope after Phase 6; reports and release before optional work. |

Migrations are forward-only. Take a local backup before applying; local reset is acceptable for the course. No production deployment is involved.

## 11. Stop conditions

Stop and request a human decision if:

- a tenancy, attendee-data or entitlement change would alter an approved domain invariant;
- RLS cannot enforce a rule without a schema redesign;
- email/password migration requires deleting non-test data;
- the attendee identity fields or retention rule need legal review;
- the course deadline conflicts with the planned scope;
- a security or privacy review finds a cross-club or attendee-data exposure.

## 12. Human gates

- Approve ADR-007, ADR-008, ADR-009 and ADR-010.
- Confirm the plan/entitlement matrix and limits.
- Confirm attendee identity fields and the retention rule.
- Confirm the no-financial-KYC rule: nominal ticketing identity data is required; no payment KYC or AML.
- Confirm the default maximum of four tickets per buyer.
- Confirm fan-card, name-change, box-office and away-sector rules are in `v3.0.0`.
- Confirm email confirmation is disabled for local/CI.
- Confirm club self-serve onboarding with simulated plan selection.
- Provide L13–L20 for Checkpoint D/E finalization.
- Arrange FND-008 independent review.
- Approve the `v3.0.0` tag and release.
