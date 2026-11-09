# ADR 009: Email/Password Identity, Cross-Club Fans and Simulated Commerce

- **Status:** Accepted
- **Date:** 2026-11-09

## Context

The v2 fan journey uses anonymous Supabase sessions. That is sufficient for a single demo but gives the fan no recoverable account and no history across clubs. The v3 model needs one fan account that can attend events from many clubs. It also needs club organizers and the platform admin to sign in with a stable identity.

The project does not process real money and does not perform KYC. Ticket prices, orders and subscription plans are simulated for the course.

## Decision

- All users authenticate with email/password through Supabase Auth.
- Anonymous fan sign-in is removed.
- `profiles` is the global fan identity. Club capabilities come from `club_members`; platform capabilities come from `platform_admins`.
- A fan can buy tickets and make predictions for events from any club with one account.
- A fan's cross-club history is visible to that fan. A club sees only aggregate data for its own events, with cohorts below 5 suppressed.
- Ticket orders record the ticket type, quantity, simulated total, status and terms acceptance. No payment instrument, card data or identity document is collected.
- Predictions remain points-only. Rewards are gifts or discounts; there is no cash entry or cash prize.
- The platform does not sell personal data.

## Consequences

- Existing anonymous sessions cannot be migrated; local reset is acceptable for the course.
- Email confirmation is disabled for local/CI and documented as a production gap.
- Sign-up, sign-in, sign-out and session refresh need tests for all roles.
- The terms/privacy notice is part of the simulated checkout.
- Real payments, refunds, tax and KYC remain out of scope.

## Alternatives considered

- **Keep anonymous fan sessions and add optional email.** Rejected: it does not give a reliable cross-club account or a recoverable identity.
- **Add real payments and KYC.** Rejected: out of scope, unnecessary for the course and a large legal/operational surface.
- **Make points club-specific.** Rejected for this increment: a global fan balance keeps cross-club participation simple; club rewards remain club-scoped.
