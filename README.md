# ⚽ MatchPulse

MatchPulse is a football tournament web application that engages fans through match predictions, rewards, and data-driven insights for soccer clubs.

**Users:** Football fans, tournament organizers, and soccer clubs.

## Current status

This is an early-stage project. **Tournament registration is implemented and tested.** Everything else in the kata — predictions, points rewards, ticket discounts, club analytics — is documented but largely unimplemented.

What exists today:

| Area | State |
| :--- | :--- |
| Tournament registration with capacity enforcement | **Implemented and verified** |
| Prediction submission | Partial — duplicate prevention only. No kickoff enforcement |
| Points and rewards | Not implemented |
| Authentication and row-level security | **Not implemented** |
| Club analytics | Not implemented |

The system is **not** a security boundary. Anyone who can reach the database can act as any participant. See [Known gaps](#known-gaps).

## Features

- **Tournament Management:** Organize tournaments, teams, matches, and results. *(partial)*
- **Match Predictions:** Let fans predict match outcomes before kickoff. *(no kickoff enforcement)*
- **Rewards:** Award points for correct predictions, redeemable for future ticket discounts. *(not implemented)*
- **Crowd-Sentiment Analytics:** Aggregate prediction behavior to generate insights for soccer clubs. *(not implemented)*

## Tech Stack

- **Framework:** Next.js 16 (App Router, Server Actions)
- **Database:** Supabase (PostgreSQL) — migrations, constraints and transactional functions
- **Runtime & Package Manager:** Bun
- **Local Infrastructure:** Docker and Supabase CLI
- **Continuous Integration:** GitHub Actions

## Architecture

MatchPulse follows a **modular monolith** architecture, emphasising data integrity, clear module boundaries, and reliable registration processing.

- [System Overview & Domain Model](docs/architecture/01-system-overview.md)
- [Architectural Kata](docs/architecture/kata.md)
- [Architecture Characteristics](docs/architecture/02-architecture-characteristics.md)
- [Architecture Decision Records](docs/architecture/adr/)

### Development Methodology

- [Checkpoint A — Context, Claims and Evidence](docs/methodology/checkpoint-A/README.md)
- [Checkpoint B — Operating Model and Feedback](docs/methodology/checkpoint-B/README.md)
- [AI Transparency Log](docs/methodology/ai-transparency-log.md)
- [Execution Plan — Invariant Evidence and the Registration Path](docs/methodology/exec-plans/50-invariant-evidence-and-registration-path.md)
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
git clone https://github.com/zantgo/match-pulse.git
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
| `tests/invariants/prediction-duplicate-prevention.test.ts` | Concurrent duplicate predictions for one match |

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

- **No authentication, no Row Level Security, no grants.** `anon` currently has full read and write on every table.
- **No kickoff enforcement.** `submit_prediction` checks match status and never reads `kickoff_time`, so a prediction can be submitted after kickoff while the match still shows `SCHEDULED`.
- **Point accounting is not atomic.** The prediction insert and the point deduction are separate operations.
- **`retractPrediction` accepts a user id from its caller.** The registration action added later does not; this one still does.

## Project Roles

MatchPulse is developed by one person covering the software development lifecycle:

- **Product Owner:** Defines domain requirements and product goals.
- **Software Architect:** Documents architectural decisions and characteristics.
- **Full-Stack Developer:** Implements the application and database logic.
- **QA Engineer:** Develops automated tests for domain invariants.
- **DevOps:** Manages local infrastructure and CI.