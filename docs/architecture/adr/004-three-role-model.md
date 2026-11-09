# ADR 004: Three-Role Model (Fan, Organizer, Club)

- **Status:** Accepted
- **Date:** 2026-11-08

## Context

The MVP needs the three actors from the kata: spectators, tournament staff and club representatives. The original schema only had `FAN` and `ORGANIZER`.

## Decision

Use `profiles.role` with `FAN`, `ORGANIZER` and `CLUB`. Organizers own tournaments through `tournaments.organizer_id`; matches link to tournaments. Club access is read-only and aggregate-only. Authorization is enforced in RLS and RPCs, not only in the UI.

## Consequences

- Role checks are explicit in mutation RPCs.
- Organizer ownership is testable and reviewable.
- Club users have no private-table read access.
- Legacy matches without a tournament remain public and organizer-resolvable; this is documented.

## Update 2026-11-09 — v3 club memberships

The v2 global `FAN`/`ORGANIZER`/`CLUB` role model is superseded for the current product by club-scoped memberships (`OWNER`, `ADMIN`, `STAFF`, `ANALYST`) plus a separate platform admin. The v2 roles and pages remain only for backward compatibility. See [ADR-007](./007-club-tenancy-and-entitlements.md) and [ADR-009](./009-email-password-and-simulated-commerce.md).
