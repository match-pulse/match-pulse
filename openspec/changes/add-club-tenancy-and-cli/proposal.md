# Proposal

## Why

MatchPulse v2 has global fan/organizer/club roles, anonymous fan sessions and no tenant that represents the paying customer. It cannot model a club with several staff members, a subscription plan that gates features, one fan attending events from many clubs, or a platform operator who manages plans without bypassing RLS.

The course needs a complete, realistic architecture and methodology story. This change makes the club the tenant, gives every actor an email/password account, adds simulated ticketing and club-scoped aggregate prediction insights, and exposes the whole application through a CLI so agents can audit it without a browser.

## What Changes

- **BREAKING** Replace the single global role model with club memberships (`OWNER`, `ADMIN`, `STAFF`, `ANALYST`) plus a separate platform-admin capability.
- **BREAKING** Remove anonymous fan authentication; all actors use email/password.
- Add clubs as tenants and link events to a club.
- Add `STARTER`, `PRO` and `ELITE` plans, subscription status and database-enforced entitlements.
- Add simulated nominal ticketing: buyer vs attendee, attendee identity fields, 1–4 tickets per buyer, ticket types with fan-card/transfer/away-sector rules, digital QR tickets, name change and box-office sales. No real payment, refund or financial KYC.
- Treat nominal attendee data as event-access data: the club is the controller, the platform the processor, and prediction insights remain aggregate.
- Allow one fan account to buy tickets and predict for events from any club.
- Clubs see aggregate prediction choices and engagement for their own events only, with cohorts below 5 suppressed.
- Add a platform admin for clubs, plans, subscription status and audit.
- Add a shared domain contract, a `matchpulse` CLI with JSON output and help, and an executable agent playbook.
- Record the competitive context: TicketOne, Vivaticket and Ticketmaster Italy are official channels; MatchPulse is a club-branded, prediction-enabled shop, not a consumer marketplace.
- Update the kata, domain model, ADRs, reports, test strategy, threat model, README, changelog and verification records.

## Capabilities

### New Capabilities

- `identity-and-access`: email/password accounts, global fan identity, club membership roles, platform-admin identity and context switching.
- `club-tenancy`: clubs, members, invitations, club-owned events and club isolation.
- `subscription-entitlements`: plans, subscription status and database-enforced feature/limit entitlements.
- `ticketing`: ticket types, simulated orders, ticket issuance, terms acceptance and check-in.
- `prediction-insights`: cross-club fan predictions, club-scoped aggregate insights and the threshold-5 privacy rule.
- `agent-cli`: a CLI client over the same contract, JSON output, self-description and an executable agent playbook.

### Modified Capabilities

None. The OpenSpec spec store is empty; the v2 behavior is recorded in the kata, domain model, ADRs and tests, not in OpenSpec specs.

## Impact

- Database: new tenants, memberships, plans, entitlements, ticket types, nominal orders, attendee tickets, transfers, fan cards and club-scoped events; new `club_id` ownership; rewritten RLS and grants.
- Application: email/password auth, shared domain contract, club-branded fan checkout, digital tickets, club and platform-admin UI, updated Server Actions.
- CLI: new `matchpulse` binary, nominal attendee input, box-office and transfer commands, and agent scenarios.
- Tests: tenancy, entitlements, cross-club isolation, nominal attendee data, max-four enforcement, fan-card/transfer rules, ticket capacity/concurrency, privacy and CLI contract.
- Documentation: ADR-007/008/009/010, competitive landscape, kata/domain model, reports, checkpoints D/E, verification records.
- Non-goals: real payments, financial KYC, hosted deployment, data resale, real-money prediction markets, seat maps, wallet passes and deep FIGC/Questura integration.
