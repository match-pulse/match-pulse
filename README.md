# ⚽ MatchPulse

MatchPulse is a football tournament web application that engages fans through match predictions, rewards, and data-driven insights for soccer clubs.

**Users:** Football fans, tournament organizers, and soccer clubs.

## Current status

This is an early-stage project. **Tournament registration and a live prediction market are implemented.** The market engine is tested and was observed failing under fault injection; the UI is an unprotected prototype. Rewards redemption and club analytics are not implemented.

What exists today:

| Area | State |
| :--- | :--- |
| Tournament registration with capacity enforcement | **Implemented and verified** |
| Live prediction market (LMSR entry, exit, resolution) | **Implemented** — engine verified; prototype UI |
| Points and rewards | Points balance and payouts only; ticket-discount redemption not implemented |
| Authentication and row-level security | **Not implemented** |
| Club analytics | Not implemented — the trade log is recorded, not aggregated or exported |

The system is **not** a security boundary. Anyone who can reach the database can act as any participant. See [Known gaps](#known-gaps).

## Features

- **Tournament Management:** Organize tournaments, teams, matches, and results. *(partial)*
- **Live Prediction Market:** Buy and sell HOME/DRAW/AWAY shares while the match is live. Prices follow an LMSR curve; entry is cooled down per user and market; the winning side pays one point per share at resolution. *(implemented, unprotected prototype)*
- **Rewards:** Points are redeemable for future ticket discounts. *(redemption not implemented)*
- **Crowd-Sentiment Analytics:** Aggregate market activity into insights for soccer clubs. *(not implemented; trades are recorded)*

## Tech Stack

- **Framework:** Next.js 16 (App Router, Server Actions)
- **Database:** Supabase (PostgreSQL) — migrations, constraints and transactional functions
- **Runtime & Package Manager:** Bun
- **Local Infrastructure:** Docker and Supabase CLI
- **Continuous Integration:** GitHub Actions

## Architecture

MatchPulse follows a **modular monolith** architecture, emphasising data
integrity, clear module boundaries, and reliable registration processing.

Read the architecture documents in this order:

1. [Architectural Kata](docs/architecture/kata.md) — the problem and its constraints
2. [System Overview](docs/architecture/01-system-overview.md) — users, boundaries and data flows
3. [Domain Model](docs/architecture/02-domain-model.md) — entities, relationships and business rules
4. [C4 Diagrams](docs/architecture/05-c4-diagrams.md) — context, containers and market components
5. [Architecture Characteristics](docs/architecture/03-architecture-characteristics.md) — priorities and measurements
6. [Code Map](docs/architecture/04-code-map.md) — documents and rules mapped to files and tests
7. [Architecture Decision Records](docs/architecture/adr/) — the decisions behind the structure

### Development Methodology

- [Checkpoint A — Context, Claims and Evidence](docs/methodology/checkpoint-A/README.md)
- [Checkpoint B — Operating Model and Feedback](docs/methodology/checkpoint-B/README.md)
- [AI Transparency Log](docs/methodology/ai-transparency-log.md)
- [Execution Plan — Live Prediction Market](docs/methodology/exec-plans/live-prediction-market.md)
- [Execution Plan — Invariant Evidence and the Registration Path](docs/methodology/exec-plans/50-invariant-evidence-and-registration-path.md) *(superseded)*
- [AI Agent Instructions](AGENTS.md)

---

## Getting Started

### Prerequisites

- [Git](https://git-scm.com/)
- [Bun](https://bun.sh/)
- [Docker](https://www.docker.com/products/docker-desktop/) — running, with the Supabase CLI able to reach it

The Supabase CLI is a project dependency and is invoked through Bun.

### 1. Clone the repository

```bash
git clone https://github.com/match-pulse/match-pulse.git
cd match-pulse
```

### 2. Install dependencies

```bash
bun install
```

### 3. Start the local database

```bash
bunx supabase start
bunx supabase db reset
```

`db reset` drops and recreates the local schema, then replays every file in `supabase/migrations/` in order and applies `supabase/seed.sql`. **It deletes local data.**

### 4. Configure the environment

Create `.env.local` in the project root:

```dotenv
NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-local-anon-key
```

Get both values from the Supabase CLI:

```bash
bunx supabase status -o env
```

This is the only place these variables are configured, and the names must match `src/lib/supabase.ts`. `.env.local` is gitignored and excluded from the Docker build context.

### 5. Run the application

```bash
bun run dev
```

Open [http://localhost:3000](http://localhost:3000).

---

## Testing

```bash
bun run test          # all suites
bun run lint          # ESLint
bun run typecheck     # tsc --noEmit
bun run build         # production build
```

The invariant suites need a running database — complete steps 3 and 4 first. Missing credentials fail immediately with a clear error rather than passing silently.

| Suite | Verifies |
| :--- | :--- |
| `tests/invariants/tournament-capacity.test.ts` | 100 concurrent requests against capacity 32; accepted/refused split **and** committed rows, stored counter, `counter <= capacity` |
| `tests/invariants/registration-uniqueness.test.ts` | A repeated registration is refused and consumes no second place |
| `tests/invariants/market-pricing.test.ts` | Budget-bounded entry with `ceil` debit, `floor` credit on exit, over-sell and overspend refusals, share bookkeeping |
| `tests/invariants/market-lifecycle.test.ts` | Pre-kickoff and post-resolution refusals, one-shot resolution payout, cooldown ladder/cap/decay/scope |
| `tests/invariants/market-concurrency.test.ts` | Cross-market double-spend race and same-market entry burst |

These suites were confirmed **capable of failing**: reintroducing each defect in turn produced a non-zero exit. See the invariants registry for the recorded output.

### Continuous Integration

[`.github/workflows/ci.yml`](.github/workflows/ci.yml) runs two jobs on every pull request:

- **Lint, typecheck and build** — ESLint, production build, `tsc --noEmit`
- **Domain invariants** — starts a local Supabase, replays migrations, runs `bun run test`

The CI job reads its credentials from the running stack at job time via `supabase status -o env`. **No database credential is stored in this repository.**

## Docker

```bash
export NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321
export NEXT_PUBLIC_SUPABASE_ANON_KEY=your-local-anon-key
docker compose up --build
```

Compose reads these from your shell or a root `.env` file. `release.env` was removed: it contained only an unused `APP_VERSION` and no Supabase values, and `env_file` does not satisfy `${...}` interpolation.

## Known gaps

Recorded so they are not mistaken for delivered work. Full detail in the [invariants registry](docs/methodology/checkpoint-A/02-invariants.md).

- **No authentication, no Row Level Security, no grants.** `anon` currently has full read and write on every table and can call `open_trade`, `close_trade` and `resolve_market` directly. Server actions resolve a fixed demo identity; that is not authentication.
- **Five market invariants are enforced but not fault-injected.** M-INV1, M-INV2, M-INV3, M-INV5 and M-INV8 have passing tests; only M-INV4, M-INV6 and the M-INV7 gate were observed failing under injection.
- **No idempotency keys.** If a request is retried after the cooldown expires, it is accepted as a new entry. The cooldown is the anti-churn mitigation, not a retry key.
- **No load or latency measurement.** The suites cover correctness under a burst, not throughput or p95 latency.
- **No ticket-discount redemption and no club analytics aggregation.** The trade log exists; nothing consumes it yet.

## Project Roles

MatchPulse is developed by one person covering the software development lifecycle:

- **Product Owner:** Defines domain requirements and product goals.
- **Software Architect:** Documents architectural decisions and characteristics.
- **Full-Stack Developer:** Implements the application and database logic.
- **QA Engineer:** Develops automated tests for domain invariants.
- **DevOps:** Manages local infrastructure and CI.