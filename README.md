# ⚽ MatchPulse

MatchPulse is a football tournament web application that engages fans through match predictions, rewards, and data-driven insights for soccer clubs.

**Users:** Football fans, tournament organizers, and soccer clubs.

## Current status

This is an early-stage project. **Tournament registration, a live prediction market, authentication, database-enforced authorization and retry-safe trading are implemented.** The market engine is tested and was observed failing under fault injection; the UI is authenticated. Rewards redemption and club analytics are not implemented.

What exists today:

| Area | State |
| :--- | :--- |
| Tournament registration with capacity enforcement | **Implemented and verified** |
| Live prediction market (LMSR entry, exit, resolution) | **Implemented** — engine verified; authenticated UI; request-key idempotency |
| Points and rewards | Points balance and payouts only; ticket-discount redemption not implemented |
| Authentication, roles, RLS and grants | **Implemented and verified** — fan/organizer sessions, own-row reads, organizer-only resolution |
| Club analytics | Not implemented — the trade log is recorded, not aggregated or exported |

The database is the authorization boundary: Supabase Auth supplies identity, RLS restricts private rows to the owner, direct table writes are revoked, and the mutation RPCs check `auth.uid()` and the organizer role. The remaining gaps are listed below.

## Features

- **Tournament Management:** Organize tournaments, teams, matches, and results. *(partial)*
- **Live Prediction Market:** Buy and sell HOME/DRAW/AWAY shares while the match is live. Prices follow an LMSR curve; entry is cooled down per user and market; a retry with the same request key returns the original trade; the winning side pays one point per share at resolution. *(implemented, authenticated UI)*
- **Rewards:** Points are redeemable for future ticket discounts. *(redemption not implemented)*
- **Crowd-Sentiment Analytics:** Aggregate market activity into insights for soccer clubs. *(not implemented; trades are recorded)*

## Tech Stack

- **Framework:** Next.js 16 (App Router, Server Actions)
- **Database:** Supabase (PostgreSQL) — migrations, constraints, RLS and transactional functions
- **Authentication:** Supabase Auth — anonymous fans and email/password organizers
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
7. [Architecture Decision Records](docs/architecture/adr/) — the decisions behind the structure, including [ADR-003: authorization and RLS](docs/architecture/adr/003-authorization-rls.md)
8. [Architecture Report — 2026-11-08](docs/architecture/reports/2026-11-08.md) — dated synthesis of the kata, characteristics, style, decisions and evidence

### Development Methodology

- [Checkpoint A — Context, Claims and Evidence](docs/methodology/checkpoint-A/README.md)
- [Checkpoint B — Operating Model and Feedback](docs/methodology/checkpoint-B/README.md)
- [SDLC Decision — Hybrid Lifecycle](docs/methodology/checkpoint-B/04-sdlc-decision.md)
- [Checkpoint C — Quality and Residual Risk](docs/methodology/checkpoint-C/README.md)
- [Checkpoint D — Architecture and Changeability (Pre-read)](docs/methodology/checkpoint-D/README.md)
- [Checkpoint E — Delivery, Observability and Recovery (Pre-read)](docs/methodology/checkpoint-E/README.md)
- [Methodology Report — 2026-11-08](docs/methodology/reports/2026-11-08.md) — dated synthesis of the claim, lifecycle, checkpoints, evidence and residual risk
- [Operations Runbook](docs/operations/runbook.md)
- [Service-Level Objectives](docs/operations/slo.md)
- [Development Practices — Testing, Specification and OpenSpec](docs/methodology/development-practices.md)
- [AI Transparency Log](docs/methodology/ai-transparency-log.md)
- [Execution Plan — Live Prediction Market](docs/methodology/exec-plans/live-prediction-market.md)
- [Execution Plan — Authorization, RLS and Grants](docs/methodology/exec-plans/95-authorization-rls.md)
- [Execution Plan — Idempotent Entry and Exit](docs/methodology/exec-plans/107-idempotent-trades.md)
- [Execution Plan — Delivery, Observability and Recovery](docs/methodology/exec-plans/111-delivery-operations-baseline.md)
- [Verification — Authorization, RLS and Grants](docs/methodology/verification/2026-11-95-authorization-rls.md)
- [Verification — Idempotent Entry and Exit](docs/methodology/verification/2026-11-107-idempotent-trades.md)
- [Verification — Delivery, Observability and Recovery](docs/methodology/verification/2026-11-111-delivery-operations-baseline.md)
- [Verification — Backup and Restore Recovery Drill](docs/methodology/verification/2026-11-117-recovery-drill.md)
- [Execution Plan — Invariant Evidence and the Registration Path](docs/methodology/exec-plans/50-invariant-evidence-and-registration-path.md) *(superseded)*
- [AI Agent Instructions](AGENTS.md)

### Engineering Workflows and Records

- [Engineering Workflows](docs/workflows/README.md) — requirements, development, agentic execution, testing, audit, refactoring, release, operations, and recordkeeping.
- [Methodology Records](docs/methodology/README.md) — record index, retention rules, and locations.
- [Findings Register](docs/methodology/findings-register.md) — permanent finding index and lifecycle.
- [Changelog](CHANGELOG.md) — append-only change history.

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
SUPABASE_SERVICE_ROLE_KEY=your-local-service-role-key
```

Get all three values from the Supabase CLI:

```bash
bunx supabase status -o env
```

`NEXT_PUBLIC_*` values are read by the application through `src/lib/supabase/server.ts`. `SUPABASE_SERVICE_ROLE_KEY` is used only by local test setup and `bun run auth:organizer`; it must never be exposed to the browser, committed, or used by the application runtime. `.env.local` is gitignored and excluded from the Docker build context.

### 5. Run the application

```bash
bun run dev
```

Open [http://localhost:3000](http://localhost:3000). You will be sent to
`/login`.

### Demo accounts

- **Fan:** select **Continue as fan**. Supabase anonymous sign-in creates a real
  auth user and a profile with 200 points.
- **Organizer:** create the local organizer account, then sign in with the
  email/password shown by the script:

  ```bash
  bun run auth:organizer
  # default: organizer@matchpulse.local / matchpulse-organizer
  ```

The organizer role is assigned locally; there is no self-service organizer
sign-up. The default password is a local fixture, not a production secret.

---

## Testing

```bash
bun run test          # all suites
bun run lint          # ESLint
bun run typecheck     # tsc --noEmit
bun run build         # production build
bun run check:architecture  # architecture guards
bun run smoke         # health/login/home against a running app
```

The invariant suites need a running database — complete steps 3 and 4 first. Missing credentials fail immediately with a clear error rather than passing silently.

| Suite | Verifies |
| :--- | :--- |
| `tests/invariants/authorization.test.ts` | Anonymous public/private access, fan own-row isolation, organizer-only resolution, denied direct writes, identity-free public trades, owner-only trade requests |
| `tests/invariants/idempotency.test.ts` | Request-key replay, concurrent duplicates, payload mismatch, retry after cooldown, exit replay |
| `tests/invariants/tournament-capacity.test.ts` | 100 authenticated concurrent requests against capacity 32; accepted/refused split **and** committed rows, stored counter, `counter <= capacity`; records p50/p95/max latency |
| `tests/invariants/registration-uniqueness.test.ts` | A repeated registration is refused and consumes no second place; each test owns its fixtures |
| `tests/invariants/market-pricing.test.ts` | Budget-bounded entry with `ceil` debit, `floor` credit on exit, over-sell and overspend refusals, share bookkeeping |
| `tests/invariants/market-lifecycle.test.ts` | Pre-kickoff and post-resolution refusals, one-shot resolution payout, cooldown ladder/cap/decay/scope |
| `tests/invariants/market-concurrency.test.ts` | Cross-market double-spend race and same-market entry burst |

The invariant suites use authenticated user clients for the real mutation path
and a local service-role client for setup and committed-state reads. The service
role is not an application runtime credential.

These suites were confirmed **capable of failing**: reintroducing each defect in
turn produced a non-zero exit. The authorization and idempotency boundaries are
verified in CI run
[42425131584](https://github.com/match-pulse/match-pulse/actions/runs/42425131584)
(28 tests, 0 failures). See the invariants registry and the
[authorization verification record](docs/methodology/verification/2026-11-95-authorization-rls.md).

### Continuous Integration

[`.github/workflows/ci.yml`](.github/workflows/ci.yml) runs three jobs on every pull request:

- **Lint, typecheck and build** — ESLint, production build, `tsc --noEmit`, architecture guards
- **Domain invariants** — starts a local Supabase, replays migrations, runs `bun run test`
- **Delivery and recovery** — starts Supabase, builds, starts the app, waits for `/api/health`, runs `bun run smoke`, then dumps and restores the public schema into a scratch database and verifies tables, RLS policies and a marker row

The CI job reads its credentials from the running stack at job time via
`supabase status -o env`. The service-role key is written to the test
environment only; it is used for test setup and committed-state reads, never by
the application runtime. **No database credential is stored in this
repository.**

## Docker

Start the database first (steps 3–4), then run the app in a container. Inside
the container `127.0.0.1` is the container itself, so point the app at the host
gateway that Compose defines:

```bash
export NEXT_PUBLIC_SUPABASE_URL=http://host.docker.internal:54321
export NEXT_PUBLIC_SUPABASE_ANON_KEY=your-local-anon-key
docker compose up --build
```

Open [http://localhost:3000](http://localhost:3000). The `extra_hosts` entry in
`docker-compose.yml` maps `host.docker.internal` to the host on Linux as well as
Docker Desktop. Compose reads the variables from your shell or a root `.env`
file and fails with a clear message if they are missing.

These values are compiled into the image **at build time** (Next.js inlines
`NEXT_PUBLIC_*`), so rebuild after changing them and do not expect runtime
environment entries to override them. `release.env` was removed: it contained
only an unused `APP_VERSION` and no Supabase values, and `env_file` does not
satisfy `${...}` interpolation.

## Known gaps

Recorded so they are not mistaken for delivered work. Full detail in the [invariants registry](docs/methodology/checkpoint-A/02-invariants.md).

- **No organizer management UI.** Market resolution is an authorized RPC and is exercised by tests; there is no browser management screen.
- **No hosted deployment.** Delivery is local/CI only: health, structured logs, smoke test and a `Delivery and recovery` CI job exist, but there is no cloud environment, TLS, DNS or production availability claim.
- **No external observability or alerting.** Logs are JSON to stdout; there is no collector, dashboard, trace or alert.
- **No production recovery drill.** CI restores a public-schema backup into a scratch database and verifies table/policy/row counts; there is still no production backup, retention, RTO/RPO or disaster-recovery evidence.
- **Authentication and authorization are implemented**, but production session hardening, rate-limit tuning and service-role handling remain operational work.
- **Five market invariants are enforced but not fault-injected.** M-INV1, M-INV2, M-INV3, M-INV5 and M-INV8 have passing tests; only M-INV4, M-INV6 and the M-INV7 gate were observed failing under injection.
- **No request-key retention/cleanup policy.** Idempotency request rows grow with accepted/rejected requests; a retention policy is deferred.
- **p95 latency is observed, not asserted.** The capacity burst records p50/p95/max, but the target is not a CI gate yet, and the value is environment-specific.
- **No ticket-discount redemption and no club analytics aggregation.** The trade log exists; nothing consumes it yet.

## Project Roles

MatchPulse is developed by one person covering the software development lifecycle:

- **Product Owner:** Defines domain requirements and product goals.
- **Software Architect:** Documents architectural decisions and characteristics.
- **Full-Stack Developer:** Implements the application and database logic.
- **QA Engineer:** Develops automated tests for domain invariants and authorization.
- **Security & Privacy Reviewer:** Reviews authentication, RLS, grants and trust boundaries.
- **DevOps / Release & Operations Verifier:** Manages local infrastructure, CI and release readiness.