# MatchPulse — System Overview

> **How to read this document.** It describes what the system is, who uses it
> and how a request travels through it. Entities, relationships and business
> rules live in the [domain model](./02-domain-model.md); diagrams live in the
> [C4 views](./05-c4-diagrams.md). Every element carries a state:
> **Implemented**, **Partial**, **Intended** or **Not implemented**. The
> authoritative enforcement and evidence record is the
> [invariants registry](../methodology/checkpoint-A/02-invariants.md).

## 1. Purpose and scope

MatchPulse is a football tournament web application. Spectators register for a
tournament, receive prediction points, and trade those points on the outcome of
a live match. Correct positions pay points that can later be redeemed for ticket
discounts. Aggregated market activity is intended to become a crowd-sentiment
product for football clubs.

The application is a **modular monolith**: one Next.js deployment and one
PostgreSQL database, with business-critical rules enforced inside database
transactions.

## 2. Users and goals

| Actor | Goal | State |
| :--- | :--- | :--- |
| **Spectator / fan** | Register for a tournament, trade points during a match, keep winnings for ticket discounts | Registration and trading implemented; redemption not implemented |
| **Tournament organizer / staff** | Create tournaments, schedule matches, finalise results and resolve markets | Data model, resolution RPC and organizer authorization implemented; management UI not implemented |
| **Club representative** | Read aggregated crowd sentiment without seeing individuals | Not implemented; the trade log records the raw data |
| **Developer / operator** | Run the stack locally, replay migrations, verify invariants in CI | Implemented |

## 3. Architecture style and boundaries

The system deliberately stays a modular monolith. A single application process
covers the web UI and the mutation endpoints; PostgreSQL is the source of truth.

- **Interface (Next.js App Router):** React Server Components render pages that
  read through the database client. Client components hold only form state.
- **Application layer (Server Actions):** validates input, resolves the caller
  through `src/lib/session.ts`, calls a database function and refreshes the view.
- **Domain layer (PostgreSQL):** tables, constraints and transaction-scoped
  functions (`open_trade`, `close_trade`, `resolve_market`,
  `register_for_tournament`) enforce the invariants. The application never
  performs a read-modify-write across requests.
- **Infrastructure:** Bun for tooling and tests, the Supabase CLI and Docker for
  local development, GitHub Actions for CI. Deployment is not configured.

Two boundaries are intentionally explicit today:

1. **The database is an authorization boundary.** Supabase Auth supplies the
   identity, RLS restricts private rows to their owner, direct table writes are
   revoked, and the state-changing RPCs run as `SECURITY DEFINER` with explicit
   `auth.uid()` checks. `resolve_market` additionally requires the organizer
   role. The public reads are tournaments, matches, markets and the identity-free
   trade feed.
2. **The organizer management UI is not implemented.** Market resolution is an
   authorized RPC and is exercised by the test suite; there is no browser
   management screen. The fan market page is authenticated and is not a
   security boundary by itself.

The file-level mapping of these elements is in the
[code map](./04-code-map.md). The runtime views are in
[05-c4-diagrams.md](./05-c4-diagrams.md).

## 4. Data flows

### 4.1 Market entry and exit (implemented and verified)

1. The spectator selects an outcome and commits an amount of points.
2. The Server Action validates the request shape and reads the authenticated
   session. The client supplies a request key for the action; the database RPC
   resolves the caller independently with `auth.uid()`; identity is never read
   from the form.
3. `open_trade` checks that the caller has a real auth identity, claims the
   request key (or replays/refuses a duplicate), then locks the market row, the
   profile row and the cooldown row, and checks the market window: the market
   must be open and the authoritative database time must be at or after
   `kickoff_time`.
4. The cooldown gate is checked. A refusal writes nothing.
5. The share quantity is solved from the committed budget under the LMSR cost
   curve. The cost is debited (`ceil`) atomically with the position update, the
   market state update and the trade-log write.
6. An exit (`close_trade`) is always permitted while the market is open: the
   requested shares are checked against the holding, the market state is moved
   back by those shares, and the proceeds (`floor`) are credited atomically with
   the position update and the trade-log write. No fee is charged.
7. The Server Action returns the result and Next.js refreshes the view.

### 4.2 Resolution (implemented and verified)

1. An authorized organizer finalises the match result and resolves the market
   with the winning outcome.
2. `resolve_market` checks `auth.uid()` and the organizer role, locks the market
   row, refuses if the market is already resolved, marks it resolved terminally,
   and pays each holder of winning shares exactly one point per share (floor),
   once, in the same transaction.
3. No entry or exit is accepted after resolution.

### 4.3 Registration (implemented and verified)

1. A spectator requests a place through the interface.
2. The Server Action validates the request shape and reads the authenticated
   session; the RPC independently resolves the caller with `auth.uid()`.
3. `register_for_tournament` checks that the caller has a real auth identity and
   a profile, locks the tournament row, checks capacity, inserts the
   registration in a subtransaction (a duplicate is refused without raising),
   and increments the counter.
4. The result is translated into a message and the view refreshes.

### 4.4 Sign-in (implemented)

1. A fan selects **Continue as fan**; Supabase Auth creates an anonymous user and
   a `profiles` row with 200 points and role `FAN`.
2. An organizer signs in with the local email/password account created by
   `bun run auth:organizer`; the profile role is `ORGANIZER`.
3. The server client stores the session in cookies and refreshes it through the
   Next.js proxy. The database still enforces authorization from the JWT; the UI
   state is not the boundary.

## 5. Quality and evidence

The project selects five architecture characteristics — elasticity,
deployability, testability, integrity under concurrency, and
security/authorization — and records their targets and evidence in
[03-architecture-characteristics.md](./03-architecture-characteristics.md).
Invariant coverage and fault-injection results are recorded in the
[registry](../methodology/checkpoint-A/02-invariants.md).

Authentication and authorization are **implemented and covered by CI**. The
authorization suite verifies anonymous, fan, cross-user and organizer behavior,
and direct table writes are denied. The system still does not implement reward
redemption, club analytics, an organizer management UI or a deployment
environment; those gaps are listed in the README and in the Checkpoint C
residual-risk record.
