# MatchPulse MVP Scope

- **Version:** v3.0.0
- **Status:** Approved scope; implemented and verified at the local/CI boundary.
- **Roles:** Fan, club member (`OWNER`/`ADMIN`/`STAFF`/`ANALYST`), platform admin, ops.

## 1. Fan

- Sign up and sign in with email/password; one global account across clubs.
- Browse published club events and ticket types.
- Buy one to four nominal tickets, assigning each ticket to a named attendee and accepting the club terms.
- Receive a digital entry code and QR image; view tickets across clubs.
- Transfer a transferable ticket to a new attendee before the deadline.
- Enter and exit points-only prediction positions across clubs.
- View portfolio, trades, payouts and points.
- Redeem points for club-scoped rewards and discounts.

## 2. Club

- Email/password sign-in and club onboarding; choose a simulated plan.
- `OWNER`/`ADMIN`/`STAFF`/`ANALYST` memberships; invite, change roles and remove members.
- Create events, ticket types, matches and optional prediction markets.
- Sell nominal tickets (web and box office), list orders/attendees and check in by code.
- Issue fan cards for restricted ticket types.
- Create club rewards and see aggregate sales/attendance.
- Resolve the club's markets once.
- Read aggregate prediction insights for its own events; cohorts below 5 are suppressed and no attendee identity is included.
- `ELITE` can export the aggregate CSV; the export is audited.
- A club cannot read another club's events, orders, attendees or insights.

## 3. Platform admin

- Email/password sign-in.
- Create/list clubs, assign plans and subscription status.
- Review audit events.
- No impersonation, fan-point override or unattended attendee-data access.
- The service role is an ops/fixture credential, not the admin identity.

## 4. Ops

- `/api/health`, JSON logs, smoke test, release/rollback/backup runbook.
- Five CI jobs: build/security, domain invariants, delivery/recovery, fault injection, E2E/accessibility.
- `matchpulse` CLI and agent playbook for browser-free verification.
- Request-key retention (30 days) and attendee identity retention (365 days) maintenance commands.
- Local/CI delivery only; no hosted production environment.

## 5. Non-goals

- Real payment processing, financial KYC, invoices, refunds or settlement.
- Real subscription billing; plans are simulated.
- Real-money prediction markets or cash prizes.
- Data resale or selling personal data.
- Seat maps, wallet passes, turnstile hardware or deep FIGC/Questura integration.
- Cross-club discounts, a data marketplace or multi-tenant billing.
- Hosted production deployment, external monitoring or production recovery.
- Customer discovery or real-club validation as a course deliverable.

## 6. Acceptance

- A fan signs up, buys two named tickets for one club, predicts, and buys for another club with the same account.
- A club owner creates a club, plan, event, ticket type, match and market; staff check in a ticket and resolve the market.
- Cross-club reads are refused; entitlement gates are enforced in the database.
- The CLI runs the match-day journey and refusal cases; the agent playbook is green in CI.
- The web fan/club/admin journeys and serious/critical axe checks pass in CI.
- The database, delivery/recovery and fault-injection jobs pass.
- The reports, ADRs and verification records describe the implemented system and its limits.
