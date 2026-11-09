# Design

## Context

The v2 schema has global `profiles.role` values (`FAN`, `ORGANIZER`, `CLUB`), anonymous fan sessions, organizer-owned tournaments and club analytics RPCs. There is no tenant, membership, plan, entitlement, ticket order or club-scoped event ownership.

The v3 change makes clubs the tenant and introduces email/password accounts, simulated ticketing and a CLI. The database remains the system of record; critical rules stay in RPCs and RLS.

## Goals / Non-Goals

**Goals:**

- Model a club as a tenant with multiple members and role-scoped capabilities.
- Enforce subscription entitlements in the database.
- Give fans one recoverable email/password account that works across clubs.
- Model a realistic simulated ticket purchase and check-in flow without real money or KYC.
- Give clubs aggregate prediction insights for their own events only.
- Expose every capability through a CLI and an executable agent playbook.
- Keep the course evidence coherent: ADRs, migration, tests, reports, checkpoints.

**Non-Goals:**

- Real payment processing, refunds, invoicing or settlement.
- KYC, AML or identity documents.
- Hosted production deployment, production monitoring or production recovery.
- Data resale, cross-club discounts or a data marketplace.
- Real-money prediction markets.
- Migrating anonymous sessions to email/password accounts.

## Decisions

### D1 — Club tenancy replaces global organizer ownership

`clubs` is the tenant. `club_members` maps profiles to clubs with `OWNER`, `ADMIN`, `STAFF` or `ANALYST`. `tournaments.club_id` becomes the ownership key. The global `profiles.role` is retired as an authorization source. Platform administration is a separate `platform_admins` table.

A user can belong to several clubs and can also be a fan. The web UI uses a context switcher; the CLI uses `--club` or a selected profile context.

**Alternative:** keep `ORGANIZER` and add a club table beside it. Rejected: two ownership models create ambiguous authorization and duplicate rules.

### D2 — Plans and entitlements are database data, enforced by helpers

`plans`, `plan_entitlements` and `club_subscriptions` store the catalog and the club's status. Helpers `has_entitlement(club_id, feature)` and `require_entitlement(club_id, feature)` are used by RPCs. RLS uses membership helpers; entitlement checks inside RPCs protect gated operations. The UI may hide controls, but the database is the gate.

Limits are numeric entitlements: `max_active_events`, `max_members`. Features are booleans: `prediction_markets`, `prediction_insights`, `club_rewards`, `data_export`, `advanced_analytics`.

Only an `ACTIVE` subscription grants entitlements. A downgrade preserves existing rows; new creation is blocked when over the new limit; feature access follows the current plan.

### D3 — Email/password accounts and cross-club fans

All users authenticate with Supabase email/password. `signInAnonymously` is removed from the app. A new fan sign-up creates a `profiles` row through the existing trigger and receives the starting points.

Club organizers are profiles with club memberships, not a separate auth tenant. Platform admins are profiles with a `platform_admins` row. Email confirmation is disabled locally/CI; the production gap is documented.

A fan's cross-club history is read from their own orders, tickets and positions. A club reads only its own event rows; the RLS policies do not join through the fan's other clubs.

**Alternative:** keep anonymous sessions and add optional email. Rejected: no recoverable cross-club identity.

### D4 — Simulated ticketing with transactional capacity

`ticket_types` define an event, name, simulated price, allocation and sales window. `ticket_orders` record the fan, quantity, total, `SIMULATED_PAID` status, terms acceptance and a unique request id. `tickets` record the issued units, a unique code and check-in time.

`purchase_ticket` runs in one transaction: validate the event/ticket type, check the sales window, lock the counters, assert capacity and allocation, create the order and tickets, award configured points, and write audit. A retry with the same request id returns the existing order.

`check_in_ticket` is idempotent: a second check-in preserves the first timestamp and does not create a duplicate attendance row. Only club staff for the ticket's event can check in.

**Alternative:** keep the old claim-ticket flow. Rejected: it cannot express prices, terms, orders or check-in, which are the core of the club ticketing story.

### D4b — Ticketing is nominative; buyer and attendee are distinct

Italian football tickets are tied to the named attendee. A buyer may purchase one to four tickets per event, each assigned to a different attendee. `ticket_orders` records the buyer, quantity, simulated total, status, request id and terms acceptance. `tickets` records the order, ticket type, attendee identity fields (first name, last name, date of birth, place of birth, tax code/document, optional fan card), unique code and check-in time.

Ticket types carry the rules: sector, price, allocation, sales window, maximum per buyer (default 4), fan-card requirement, transferability and away-sector flag. `transfer_ticket` changes the attendee before the configured deadline when the type allows it; `ticket_transfers` keeps the history. Club staff can sell through a `BOX_OFFICE` channel and check in by code. Digital tickets are a QR page; wallet passes are later.

Attendee identity data is event-access data, not financial KYC. The club is the controller, MatchPulse the processor. `OWNER`, `ADMIN` and `STAFF` can read attendee data for their club; `ANALYST` sees aggregates only. A retention window and cleanup path apply.

**Alternative:** keep one ticket tied to the buyer. Rejected: it cannot model group purchases or Italian nominal ticketing.

### D5 — Prediction insights are aggregate and club-scoped

Predictions remain points-only. The market engine and cooldown rules are unchanged. A club can enable predictions per match only with the entitlement. Insights are computed from positions/trades for the club's own event and return counts/percentages by outcome. A cohort below 5 returns a suppressed response. No fan id, email, username or individual position is returned.

The existing `club_analytics_summary` and `club_analytics_timeseries` become club-scoped and entitlement-gated. `record_club_export` records the actor and club.

### D6 — Shared contract and CLI

Validation and typed RPC wrappers live in a shared domain layer. Server Actions become thin web adapters. The CLI is a separate Bun entry point that authenticates with the anon key and a stored user session, then calls the same RPCs/reads. It never imports Server Actions and never uses the service role for business commands.

The CLI prints JSON with `--json`, uses exit codes 0/1/2 and accepts `--request-id` for mutations. `matchpulse commands --json` lists the command tree. `ops` commands use the service role only in a separate context.

**Alternative:** make the CLI the source of truth and have the UI shell out. Rejected: slow, fragile and a second security boundary.

### D7 — Migration and rollback

Migrations are additive and forward-only:

1. create clubs, members, invites, platform admins, plans, entitlements, subscriptions, ticket types, orders and ticket columns;
2. create a club per existing organizer, make the organizer `OWNER`, and link tournaments;
3. create a `PRO` subscription for migrated clubs for continuity;
4. rewrite RLS/grants and RPCs for club scope;
5. remove the old global role from authorization.

Anonymous fan sessions cannot be migrated. Local reset is acceptable for the course; production migration is out of scope. Take a local backup before applying. Rollback is a local restore, not a down migration.

## Data Model Summary

| Table | Purpose |
| :--- | :--- |
| `clubs` | Tenant: name, slug, created_by |
| `club_members` | profile_id, club_id, role, status |
| `club_invites` | email, role, token, expiry, accepted_at |
| `platform_admins` | profile_id |
| `plans` | code, name, active |
| `plan_entitlements` | plan_id, feature, limit |
| `club_subscriptions` | club_id, plan_id, status, period |
| `ticket_types` | event_id, name, sector, price_cents, allocation, sales window, max per buyer, fan-card/transfer/away rules |
| `ticket_orders` | buyer_id, ticket_type_id, quantity 1–4, total, status, terms, request_id, channel |
| `tickets` | order_id, ticket_type_id, buyer_id, attendee identity fields, fan card, code, checked_in_at |
| `ticket_transfers` | ticket_id, previous and new attendee data, actor, created_at |
| `club_fan_cards` | club_id, card_number, profile_id, status |
| `tournaments` | + club_id, status, published_at |
| `matches` | + prediction_enabled |
| `rewards` | + club_id |

## Authorization Matrix

| Operation | Fan | Club STAFF | Club ADMIN | Club OWNER | Platform admin |
| :--- | :---: | :---: | :---: | :---: | :---: |
| Buy ticket | own | — | — | — | — |
| Predict | own | — | — | — | — |
| Read own portfolio | own | — | — | — | — |
| Read club events | public/own | own | own | own | all |
| Create/update event | — | own | own | own | — |
| Create ticket type | — | own | own | own | — |
| Check in ticket | — | own | own | own | — |
| Read attendee identity | — | own | own | own | audited |
| Box-office sale | — | own | own | own | — |
| Invite/remove member | — | — | own | own | — |
| Change member role | — | — | own | own | — |
| Request plan change | — | — | — | own | — |
| Assign plan/status | — | — | — | — | all |
| Read analytics | — | own | own | own | aggregate only |
| Export analytics | — | — | — | own/analyst if entitled | — |
| Read audit | own events | — | own | own | all |

## Risks

- **Cross-club leakage:** deny-by-default policies and a dedicated isolation suite.
- **Entitlement bypass:** every gated RPC calls the helper; tests attempt each bypass.
- **Ticket oversell:** row locks and capacity assertions; concurrent purchase test.
- **Auth migration:** remove anonymous deliberately; test sign-up/sign-in; document local reset.
- **Scope:** the cut line defers ticket orders/check-in and export if the course deadline requires it.
