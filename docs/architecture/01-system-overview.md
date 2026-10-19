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
| **Tournament organizer / staff** | Create tournaments, schedule matches, finalise results and resolve markets | Data model and resolution function exist; management UI and authorization not implemented |
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

1. **There is no security boundary.** Supabase Auth, Row Level Security and
   grants are not implemented (INV-05). The anon key can read and write every
   table and call every RPC.
2. **The market UI is a prototype.** The engine and its functions are tested;
   the page is not authenticated and is not a hardened interface.

The file-level mapping of these elements is in the
[code map](./04-code-map.md). The runtime views are in
[05-c4-diagrams.md](./05-c4-diagrams.md).

## 4. Data flows

### 4.1 Market entry and exit (implemented and verified)

1. The spectator selects an outcome and commits an amount of points.
2. The Server Action validates the request shape and resolves the spectator's
   identity on the server; identity is never read from the form.
3. `open_trade` locks the market row, then the profile row, then the cooldown
   row, and checks the market window: the market must be open and the
   authoritative database time must be at or after `kickoff_time`.
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

1. Staff finalise the match result and resolve the market with the winning
   outcome.
2. `resolve_market` locks the market row, refuses if the market is already
   resolved, marks it resolved terminally, and pays each holder of winning
   shares exactly one point per share (floor), once, in the same transaction.
3. No entry or exit is accepted after resolution.

### 4.3 Registration (implemented and verified)

1. A spectator requests a place through the interface.
2. The Server Action validates the request shape and resolves identity on the
   server.
3. `register_for_tournament` locks the tournament row, checks capacity, inserts
   the registration in a subtransaction (a duplicate is refused without
   raising), and increments the counter.
4. The result is translated into a message and the view refreshes.

## 5. Quality and evidence

The project selects four architecture characteristics — elasticity,
deployability, testability, and integrity under concurrency — and records their
targets and evidence in
[03-architecture-characteristics.md](./03-architecture-characteristics.md).
Invariant coverage and fault-injection results are recorded in the
[registry](../methodology/checkpoint-A/02-invariants.md).

The system is **not** a security boundary, does not yet implement reward
redemption or club analytics, and has no deployment environment. Those gaps are
listed in the README so they are not mistaken for delivered work.
