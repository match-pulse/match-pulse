# MatchPulse — System Overview

> **How to read this document.** It describes what the system is, who uses it
> and how a request travels through it. Entities, relationships and business
> rules live in the [domain model](./02-domain-model.md); diagrams live in the
> [C4 views](./05-c4-diagrams.md). The authoritative enforcement and evidence
> record is the [invariants registry](../methodology/checkpoint-A/02-invariants.md).

## 1. Purpose and scope

MatchPulse is a club-first football ticketing and fan-engagement platform. Clubs
are the paying tenant: they subscribe to a plan, create events, sell nominal
tickets, check in attendees and read aggregate prediction insights for their own
matches. Fans use one email/password account to buy tickets and trade points
across clubs. A platform admin manages clubs, plans and audit. Commerce is
simulated; there is no real payment provider, financial KYC or data resale.

The application is a **modular monolith**: one Next.js deployment, one PostgreSQL
database and one shared domain contract used by the web UI and the CLI. Critical
rules are enforced inside database transactions.

## 2. Users and goals

| Actor | Goal | State |
| :--- | :--- | :--- |
| **Fan** | Buy nominal tickets, predict, keep a cross-club portfolio, redeem club rewards | Implemented and verified |
| **Attendee** | Enter with their identity and ticket code/QR | Implemented; no account required |
| **Club owner/admin/staff/analyst** | Create events and ticket types, manage orders/attendees, check in, resolve markets, read aggregate insights | Implemented and verified |
| **Platform admin** | Manage clubs, plans/subscription status and audit without impersonation | Implemented and verified |
| **Developer/operator** | Run the stack locally, run the CLI/agent playbook, verify invariants in CI, apply retention | Implemented |

## 3. Architecture style and boundaries

- **Interface (Next.js App Router):** Server Components render the fan, club and
  admin pages. Client components hold form state; the checkout uses dynamic
  attendee fields and a request id.
- **Application layer (Server Actions + shared domain):** `src/lib/domain/`
  contains typed wrappers over the database contract. Server Actions and the
  `matchpulse` CLI call the same wrappers. The CLI never imports Server Actions.
- **Domain layer (PostgreSQL):** tables, constraints, RLS, grants and
  transaction-scoped functions enforce tenancy, roles, entitlements, ticketing,
  market, privacy and retention rules.
- **Infrastructure:** Bun for tooling/tests/CLI, Supabase CLI and Docker locally,
  GitHub Actions for CI. Deployment is not configured.

Three boundaries are explicit:

1. **The database is the authorization boundary.** Supabase Auth supplies
   email/password identity. RLS restricts private rows; direct writes are
   revoked; RPCs run as `SECURITY DEFINER` and check `auth.uid()`, club
   membership, role and the active subscription entitlement. The platform admin
   is a separate capability; the service role is an operator/fixture credential.
2. **Tenancy is club-scoped.** A club member cannot read another club's events,
   orders, attendees or analytics. The booking user and the named attendee are
   different people; attendee identity is visible only to operational club staff.
3. **Commerce is simulated.** Ticket orders and subscriptions record simulated
   money; there is no payment provider, financial KYC, invoice, refund or
   settlement. The platform does not sell personal data.

## 4. Data flows

### 4.1 Sign-in and home routing

1. Fans, club organizers and the platform admin sign in with email/password.
   There is no anonymous session.
2. The server client stores the session in cookies and refreshes it through the
   Next.js proxy.
3. The home route chooses platform admin → legacy organizer/club → club
   membership → fan. The database still enforces authorization from the JWT; UI
   routing is not the boundary.

### 4.2 Club onboarding and plan

1. An authenticated user creates a club and becomes `OWNER`.
2. The club gets a simulated subscription. `STARTER`, `PRO` and `ELITE` rows in
   `plan_entitlements` gate prediction markets, insights, rewards, export and
   event/member limits.
3. The owner requests a plan change; the platform admin assigns the plan/status.
4. Every gated RPC calls `has_entitlement`/`require_entitlement`; a `PAST_DUE` or
   `CANCELED` subscription grants nothing.

### 4.3 Event, ticket type and match setup

1. Club staff create a draft event with capacity and ticket allocation.
2. They add ticket types with price, allocation, sales window, max per buyer,
   fan-card, transferability and away-sector rules.
3. They publish the event (at least one active ticket type is required) and add
   matches; a match may create a prediction market if the plan allows it.

### 4.4 Nominal purchase

1. A fan selects a ticket type and 1–4 attendees, enters each attendee's name,
   date/place of birth, tax code or document and optional fan card, accepts the
   club terms and submits a request id.
2. `purchase_ticket` locks the ticket type and event, checks the sales window,
   max per buyer, fan-card and allocation, and either replays the existing order
   or creates one `SIMULATED_PAID` order plus one ticket per attendee.
3. Each ticket gets a unique code/QR. The event's ticket points are credited to
   the buyer. No payment instrument is collected.
4. A buyer may transfer a transferable ticket to a new attendee before the
   deadline; a checked-in ticket cannot be transferred.

### 4.5 Check-in and box office

1. Club staff enter or scan a ticket code. `check_in_ticket` checks the event's
   club and the staff role, records the first check-in, and returns the existing
   time on a second attempt.
2. Club staff may sell through the `BOX_OFFICE` channel for an existing buyer;
   the order and audit record the channel.

### 4.6 Market entry and exit

1. The fan selects an outcome and commits points. The client supplies a request
   key; the RPC resolves the caller independently with `auth.uid()`.
2. `open_trade` claims/replays the request key, locks the market, profile and
   cooldown, checks the kickoff window and cooldown, solves the LMSR share
   quantity, and debits points atomically with the position, market and trade.
3. An exit is always permitted while the market is open; proceeds are credited
   atomically. No fee is charged.
4. A trigger refuses trades when `matches.prediction_enabled` is false.

### 4.7 Resolution

1. Club `OWNER`/`ADMIN`/`STAFF` (or the legacy organizer for a non-club market)
   finalise the result and resolve the market once.
2. `resolve_market` locks the market, refuses a second resolution, pays each
   winning share one point (floor), marks the market resolved and audits it.
3. No entry or exit is accepted afterwards.

### 4.8 Insights, export and retention

1. A club member reads `club_sales_summary` (all roles) and
   `club_prediction_insights` (PRO/ELITE). Insights are club-scoped, suppress
   cohorts below 5 and exclude attendee identity.
2. An `ELITE` owner/admin/analyst can download the aggregate CSV; the export is
   audited.
3. A service-role maintenance command clears attendee identity from past-event
   tickets after the retention window while keeping ticket, order, points and
   audit.

## 5. Quality and evidence

The project selects reliability, elasticity, deployability, testability and
security/authorization; targets and evidence are in
[03-architecture-characteristics.md](./03-architecture-characteristics.md).
Invariant coverage and fault-injection results are in the [registry](../methodology/checkpoint-A/02-invariants.md).

The v3 evidence includes database-backed tenancy/entitlement/nominal-ticketing
tests, a CLI match-day scenario, Playwright/axe journeys for the fan, club and
admin pages, delivery/recovery and fault injection. Real payments, financial
KYC, hosted deployment, seat maps/wallet passes and deep FIGC/Questura
integration remain out of scope.
