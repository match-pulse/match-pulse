# ADR 008: Platform Admin and Operator Boundary

- **Status:** Accepted
- **Date:** 2026-11-09

## Context

The solo operator needs to manage clubs, plans, subscription status and support cases. Giving the application runtime the service role would bypass RLS and contradict ADR-003. Giving one admin unlimited power would make every support action unauditable and increase the blast radius of a compromised account.

## Decision

- Add a `platform_admins` table, separate from club membership.
- The platform admin authenticates with email/password and uses scoped RPCs.
- Admin capabilities are limited to club management, plan and subscription status, and audit review.
- The platform admin cannot impersonate a user, silently change fan points or resolve a market on an organizer's behalf.
- Every admin action writes an audit event with actor, action and target.
- The service role remains an operator/fixture credential outside the application runtime. It is used for local/CI setup and verification, not for business actions.
- A separate `ops` CLI context is the only place that may use the service role.

## Consequences

- Admin actions are attributable and reviewable.
- Support workflows that need more power require a new, explicitly approved capability.
- The admin UI and CLI are small and auditable rather than a generic database console.
- Cross-club support access to personal data is denied by default.

## Alternatives considered

- **One all-powerful `ADMIN` role in `profiles`.** Rejected: it mixes club and platform authority and weakens the audit boundary.
- **Use the service role from the CLI for admin work.** Rejected: it bypasses RLS and makes the authorization tests meaningless.
- **No platform admin.** Rejected: the operator cannot manage plans or support the platform.
