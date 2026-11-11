# Checkpoint D — Architecture and Changeability

**3-minute checkpoint.** The focus is ownership, boundaries, dependency rules,
fitness functions, a realistic change, compatibility and technical debt.

## Ownership

- **Club `OWNER`/`ADMIN`:** club settings, members, events, tickets and plans.
- **Club `OWNER`/`ADMIN`/`STAFF`:** match result and market resolution.
- **Club `ANALYST`:** aggregate insights only; no attendee identity.
- **Platform admin:** clubs, plans, subscription status and audit; no impersonation.
- **Operator:** retention, backup and recovery with the service role.
- **Human owner:** schema, RPC contracts, RLS and releases, through an approved migration.

The database is the system of record. The UI and CLI are clients; neither is the
authorization boundary.

## Boundaries and fitness functions

The system is one Next.js application and one PostgreSQL database. Pages and
Server Actions call `src/lib/domain/`, which calls authorized RPCs or reads. The
CLI uses the same contract and never imports Server Actions. Domain modules —
identity, clubs/plans, events, ticketing, market, insights, admin/audit —
communicate through SQL inside one transaction, not through a network.

`scripts/check-architecture.ts` guards the text-level rules: no service-role key
in `src/`, no direct table mutations, no server-client imports from components,
and mutation RPCs with auth checks and grants. The behavioural fitness functions
are the authorization suite, the v3 tenancy suite, the CLI suite and the fault
injection matrix.

## A realistic change: v3 club tenancy and nominal ticketing

The v3 change is the best example. **What changed:** clubs became the tenant;
events became club-owned; plans/entitlements gated features; ticketing became
nominal; a shared contract and CLI were added; platform admin became separate.
**Why:** the old global-organizer model could not express a club subscription,
staff roles, attendee identity or club-scoped insights.

**Compatibility:** migrations `20261201`–`20261212` are additive. Existing
organizers are backfilled into clubs with `OWNER`/`PRO`. Legacy v2 pages remain.
Anonymous fan sessions are intentionally not migrated; that is a deliberate break
because all users now use email/password. A rollback is a migration replay or a
public-schema restore; there is no production rollback because there is no
production.

**What did not change:** the modular monolith, the database boundary, the
transaction model and the LMSR market.

## Technical debt and evolution

Legacy v2 pages remain; the legacy `CLUB` role and analytics path were retired in
#188. There is no hosted deployment, real payments, seat maps or turnstile
integration; those are separate projects. Attendee retention is a local command.
There is no independent security/privacy review.

The architecture should extract a module only when a measured driver appears:
independent scaling, independent release cadence, a different data owner or a
regulatory boundary. None exists today. A microservice split would add network
failure modes and distributed consistency without a benefit the kata requires.

**Decision.** Keep the modular monolith and the database boundary. Retire the
legacy surface before adding scope. Record any boundary change in an ADR.

**Detail:** [v3 verification](../verification/2026-11-157-v3-club-tenancy.md) ·
[architecture guard](../../../scripts/check-architecture.ts) · [ADR-007](../../architecture/adr/007-club-tenancy-and-entitlements.md) ·
[code map](../../architecture/04-code-map.md)
