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
