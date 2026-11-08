# ADR 005: Club Analytics Privacy

- **Status:** Accepted
- **Date:** 2026-11-08

## Context

Clubs need aggregated crowd insight, but individual fans must not be identifiable. The club role must not read profiles or individual trades.

## Decision

Club analytics is exposed only through `SECURITY DEFINER` RPCs that return aggregates. A cohort below 5 traders is suppressed. Exports are aggregate-only and recorded in `audit_events`. Club users receive no grants on private tables.

## Consequences

- Small cohorts show a suppression state instead of metrics.
- The export cannot contain user IDs, usernames or individual trades.
- A formal privacy review and production retention policy remain open.
