# MatchPulse — System Overview

MatchPulse is a club-first football ticketing and fan-engagement platform. It is
one Next.js application and one PostgreSQL database. Critical rules are enforced
in the database, not in the UI. Commerce is simulated.

## 1. Actors

| Actor | Goal | State |
| :--- | :--- | :--- |
| Fan | Buy nominal tickets, predict with points, hold a cross-club portfolio, redeem rewards | Implemented |
| Attendee | Enter with identity and ticket code/QR | Implemented; no account |
| Club owner/admin/staff/analyst | Create events and ticket types, manage orders and attendees, check in, resolve markets, read insights | Implemented |
| Platform admin | Manage clubs, plans, subscription status and audit; no impersonation | Implemented |
| Operator | Run the CLI, retention and recovery checks | Implemented |

## 2. Runtime structure

- **Next.js App Router** renders the fan, club and admin pages. Server Components
  read data; client components hold form state.
- **Server Actions** validate input and call the shared domain contract.
- **Shared domain contract** (`src/lib/domain/`) wraps authorized RPCs and
  read queries. The CLI uses the same contract and never imports Server Actions.
- **PostgreSQL** holds the tables, constraints, RLS policies, grants and
  transactional functions. It is the system of record and the authorization
  boundary.
- **Supabase Auth** supplies email/password identity and sessions. There are no
  anonymous sessions.
- **Bun, Docker, Supabase CLI and GitHub Actions** provide tooling, local
  infrastructure and CI. There is no hosted deployment.

## 3. Three boundaries

1. **Authorization.** Supabase Auth identifies the caller. RLS restricts private
   rows. Direct table writes are revoked. Mutation RPCs are `SECURITY DEFINER`,
   resolve `auth.uid()`, fix `search_path`, and check club membership, role and
   active entitlement. The service-role key is an operator/fixture credential,
   never an application runtime key.
2. **Tenancy.** A club member cannot read another club's events, orders,
   attendees, tickets, rewards or insights. The booking user and the named
   attendee are different people; attendee identity is visible only to
   operational club staff. `ANALYST` sees aggregates, not identity.
3. **Commerce.** Ticket orders and subscriptions record simulated money. There is
   no payment provider, financial KYC, invoice, refund or settlement. Personal
   data is not sold.

## 4. Core flows

**Sign-in.** A fan, club member or platform admin signs in with email/password.
The server client stores the session in cookies and refreshes it through the
Next.js proxy. The home route chooses admin → legacy organizer/club → club
membership → fan. The database still enforces authorization from the JWT; routing
is not the boundary.

**Club and event setup.** A user creates a club and becomes `OWNER`. The club gets
a simulated subscription (`STARTER`, `PRO`, `ELITE`); only `ACTIVE` grants
entitlements. Staff create a draft event with capacity and allocation, add ticket
types with price, sales window, buyer cap, fan-card, transfer and away-sector
rules, publish with at least one active ticket type, and add matches. A match may
create a prediction market if the plan allows it.

**Nominal purchase.** A fan chooses a ticket type and 1–4 attendees, enters each
attendee's identity data, accepts the club terms and submits a request id.
`purchase_ticket` locks the ticket type and event, checks the sales window,
cumulative buyer cap, fan-card rule, capacity and allocation, and either replays
the stored request or creates one simulated order plus one ticket per attendee.
Each ticket gets a code/QR. Ticket points go to the buyer. No payment instrument
is collected.

**Check-in and transfer.** Staff enter or scan a ticket code. `check_in_ticket`
checks the club and role, records the first check-in and returns the existing time
on a retry. A buyer may transfer a transferable ticket to a new named attendee
before the deadline; a checked-in ticket cannot be transferred.

**Prediction.** A fan chooses HOME, DRAW or AWAY and commits points with a request
key. `open_trade` claims or replays the key, locks the market, profile and
cooldown, checks the kickoff window, solves the LMSR share quantity, and debits
points atomically with the position, market and trade. An exit is always allowed
while the market is open; proceeds are credited atomically; no fee is charged. A
trigger refuses entries when predictions are disabled or the match is finished;
exits remain available.

**Resolution.** A club `OWNER`/`ADMIN`/`STAFF` finalises the result and resolves
the market once. `resolve_market` requires a finished match, binds the winner to
the score-derived outcome, refuses a second resolution, pays each winning share
one point, and writes the payout and audit row. No entry or exit is accepted
after resolution.

**Insights and retention.** Club members read the sales summary; `PRO`/`ELITE`
members read prediction insights. Insights are club-scoped, suppress each
outcome/time-bucket cohort below 5, and exclude attendee identity. `ELITE` can
export an audited aggregate CSV. A service-role maintenance command clears
attendee identity from past-event tickets, transfer history, old fan-card audit
metadata and invitation emails after 365 days, while keeping ticket, order, points
and audit rows.

## 5. What is not built

A hosted production environment, external monitoring and alerting, production
backup/recovery, real payments/KYC, seat maps, wallet passes, turnstile hardware,
FIGC/Questura integration, a mobile app, and a scheduled production retention
job. The current product is a course prototype.

## Related documents

- [Domain model](./02-domain-model.md)
- [Architecture characteristics](./03-architecture-characteristics.md)
- [C4 views](./05-c4-diagrams.md)
- [Code map](./04-code-map.md)
- [Architecture description](./reports/2026-11-10.md)
