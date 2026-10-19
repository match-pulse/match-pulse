# MatchPulse — System Overview & Domain Model

> **How to read this document.** It describes the domain model and the intended
> architecture, not only what exists today. Every entity and journey carries a
> state: **Implemented**, **Partial**, **Intended** (designed, not yet built) or
> **Not implemented**. The authoritative registry of enforcement and evidence is
> [`docs/methodology/checkpoint-A/02-invariants.md`](../methodology/checkpoint-A/02-invariants.md).

## 1. Domain Entities

| Entity | Meaning | State |
| :--- | :--- | :--- |
| **Profile** | A fan or participant. Stores identity and available prediction points. | Implemented (no authentication; seeded demo profile) |
| **Tournament** | Contains participating teams and scheduled matches. Defines a maximum participant capacity (`max_capacity`). | Implemented |
| **Team** | Represents a football team participating in a tournament. | Not implemented as a table; matches store team names as text |
| **Match** | Represents a fixture between two teams. Stores the home and away teams, kickoff timestamp, and status (`SCHEDULED`, `LIVE`, `FINISHED`). | Implemented |
| **Registration** | Links a profile to a tournament and ensures participant capacity is respected. | Implemented and verified |
| **Market** | A three-outcome market (HOME / DRAW / AWAY) attached to a match, priced by an LMSR market maker, open from kickoff until resolution. | Intended (this increment) |
| **Position** | A profile's holding of shares in one outcome of one market, with its cost basis. | Intended (this increment) |
| **Trade** | An accepted entry or exit: timestamp, outcome, shares, cost or proceeds, and implied odds before and after. This is the analytics-of-record dataset. | Intended (this increment) |
| **Points Ledger** | Records point grants, costs, rewards and redemptions. | Not implemented |

## 2. Primary User Journeys

1. **Organizer:** Creates tournaments, manages teams, schedules matches, and records final results. Resolving a market is an organizer operation; authorization is not yet enforced (INV-05).
2. **Fan Registration (implemented):** Registers for a tournament while capacity remains, and is told when it is full.
3. **Fan Trading (intended, this increment):** Once the match has started, commits points to one outcome. The LMSR market prices the position from the selected budget. The spectator may exit part or all of the position at any later moment before resolution; exits are never blocked or charged. Exiting settles against the current odds — a gain when the position's implied probability has risen, a proportional loss when it has fallen. Re-entry into the same market is cooled down (5s, 15s, 30s, 45s, … capped, decaying after quiet periods); refused attempts do not escalate.
4. **Resolution (intended, this increment):** When staff finalise a result, the market resolves once and terminally: each winning share pays exactly one point, losing shares pay nothing. No trade is accepted afterwards.
5. **Rewards:** Accumulated points can be redeemed for future ticket discounts. *Not implemented.*
6. **Club Analytics:** Soccer clubs purchase aggregated crowd-sentiment insights derived from market activity over time. *Not implemented; the trade log is designed to support it. Export and privacy rules are not implemented (INV-05).*

## 3. High-Level System Architecture

MatchPulse follows a modular monolith architecture using Next.js and Supabase, with PostgreSQL as the source of truth for domain data and transactional integrity.

- **Frontend (Next.js App Router):** Renders the web interface using React Server Components.
- **Application Layer (Next.js Server Actions):** Validates input, resolves the caller's identity through a single server-side seam, invokes database functions, and refreshes affected views.
- **Database (Supabase / PostgreSQL):** Stores domain data and enforces critical business invariants through constraints, transactions and atomic database functions. **Row Level Security is not implemented** (INV-05); the system is not currently a security boundary.
- **Infrastructure:** Bun for tooling, Docker for local Supabase development, GitHub Actions for CI. Vercel is the intended hosting target; no deployment is configured.

Critical operations — tournament registration, market entries and exits, and resolution — enforce their invariants inside the database transaction rather than relying on frontend or application-level checks.

Prediction activity is linked to profiles internally and aggregated into crowd-sentiment insights for clubs. Access to underlying user data must follow defined authorization and privacy rules; those rules are **not yet implemented**.

## 4. Data Flows

### 4.1 Market entry and exit (intended)

1. The spectator selects an outcome and commits an amount of points through the interface.
2. The Server Action validates the request shape and resolves the spectator's identity on the server; the identity is never read from the form.
3. `open_trade` locks the market row, then the profile row, then the cooldown row, and checks the market window: the market must be open and the authoritative database time must be at or after `kickoff_time`.
4. The cooldown gate is checked. A refusal writes nothing.
5. The share quantity is solved from the committed budget under the LMSR cost curve. The cost is debited (`ceil`) atomically with the position update, the market state update and the trade log write.
6. An exit (`close_trade`) is always permitted while the market is open: the requested shares are checked against the holding, the market state is moved back by those shares, and the proceeds (`floor`) are credited atomically with the position update and the trade log write. No fee is charged.
7. The Server Action returns the result and Next.js refreshes the view.

### 4.2 Resolution (intended)

1. Staff finalise the match result and resolve the market with the winning outcome.
2. `resolve_market` locks the market row, refuses if the market is already resolved, marks it resolved terminally, and pays each holder of winning shares exactly one point per share (floor), once, within the same transaction.
3. No entry or exit is accepted after resolution.

### 4.3 Registration (implemented and verified)

1. A spectator requests a place through the interface.
2. The Server Action validates the request shape and resolves identity on the server.
3. `register_for_tournament` locks the tournament row, checks capacity, inserts the registration in a subtransaction (a duplicate is refused without raising), and increments the counter.
4. The result is translated into a message and the view refreshes.

## 5. Core Invariants

| Domain rule | Enforcement | Status |
| :--- | :--- | :--- |
| Tournament capacity is never exceeded under concurrency; stored counter matches stored rows | `register_for_tournament` + CHECK constraints | **Verified** (fault-injected, CI) |
| A participant cannot register twice for a tournament | Unique constraint + idempotent refusal | **Verified** (fault-injected, CI) |
| Trading opens only at kickoff and stops at resolution | Market window guard in `open_trade`/`close_trade` | Intended (M-INV1) |
| Entry/exit, position, balance and trade log succeed or fail together | Single database transaction | Intended (M-INV2) |
| Cannot sell shares not held; holdings never negative | Position guard | Intended (M-INV3) |
| Balance never negative, including concurrent same-user requests | Profile row lock + conditional debit | Intended (M-INV4) |
| Sum of held shares equals the market's outstanding quantity | Transactional state update | Intended (M-INV5) |
| Resolution pays exactly one point per winning share, once, terminally | `resolve_market` | Intended (M-INV6) |
| Entry cooldown ladder and decay; exits never restricted | `open_trade` cooldown gate | Intended (M-INV7) |
| No commission of any kind on entry, exit or settlement | No fee path in any RPC; exact payout formulas | Intended (M-INV8) |
| Authenticated identity, RLS, grants, privacy rules | Supabase Auth, RLS policies, grants | **Not implemented** (INV-05) |
