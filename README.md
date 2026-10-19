# ⚽ MatchPulse

MatchPulse is a football tournament web application that engages fans through match predictions, rewards, and data-driven insights for soccer clubs.

**Users:** Football fans, tournament organizers, and soccer clubs.

**Value Proposition:** MatchPulse is designed to enforce prediction deadlines, handle concurrent submissions safely, and turn aggregated prediction activity into strategic crowd-sentiment insights for clubs.

## Features

- **Tournament Management:** Organize tournaments, teams, matches, and results.
- **Match Predictions:** Let fans predict match outcomes before kickoff.
- **Rewards:** Award points for correct predictions, redeemable for future ticket discounts.
- **Crowd-Sentiment Analytics:** Aggregate prediction behavior to generate insights for soccer clubs.

## Tech Stack

- **Framework:** Next.js 16 (App Router, Server Actions)
- **Database:** Supabase (PostgreSQL, Row Level Security, atomic database operations)
- **Runtime & Package Manager:** Bun
- **Local Infrastructure:** Docker and Supabase CLI
- **Deployment:** Vercel
- **Continuous Integration:** GitHub Actions

## Architecture

MatchPulse follows a **modular monolith** architecture, emphasizing data integrity, clear module boundaries, and reliable prediction processing.

- **System Overview & Domain Model:** [`docs/architecture/01-system-overview.md`](docs/architecture/01-system-overview.md)
- **Architectural Kata:** [`docs/architecture/kata.md`](docs/architecture/kata.md)
- **Architecture Characteristics:** [`docs/architecture/02-architecture-characteristics.md`](docs/architecture/02-architecture-characteristics.md)
- **Architecture Decision Records (ADRs):** [`docs/architecture/adr/`](docs/architecture/adr/)

### Development Methodology

- **Bounded Proposal:** [`docs/methodology/bounded-proposal-01.md`](docs/methodology/bounded-proposal-01.md)
- **AI Transparency Log:** [`docs/methodology/ai-transparency-log.md`](docs/methodology/ai-transparency-log.md)
- **AI Agent Instructions:** [`AGENTS.md`](AGENTS.md)

## Getting Started

### Prerequisites

Install the following tools:

- [Git](https://git-scm.com/)
- [Bun](https://bun.sh/)
- [Docker Desktop](https://www.docker.com/products/docker-desktop/)

The Supabase CLI is managed as a project dependency and invoked through Bun.

### 1. Clone the Repository

```bash
git clone https://github.com/zantgo/match-pulse.git
cd match-pulse
```

### 2. Install Dependencies

```bash
bun install
```

### 3. Configure the Environment

Create a `.env.local` file in the project root with the local Supabase credentials:

```dotenv
NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=your-local-publishable-key
```

Obtain the local URL and publishable key from the Supabase CLI output. Keep environment files containing secrets out of version control.

### 4. Start the Local Database

Ensure Docker Desktop is running, then execute:

```bash
bunx supabase start
bunx supabase db reset
```

The local Supabase configuration, database migrations, and seed data must be present in the repository. **Warning:** `db reset` recreates the local database and deletes its existing local data.

### 5. Run the Application

```bash
bun run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Testing

Automated tests will verify domain invariants and protect against invalid states during concurrent requests.

```bash
# Run the prediction-lock invariant test
bun test tests/invariants/prediction-lock.test.ts

# Run the tournament-capacity invariant test
bun test tests/invariants/tournament-capacity.test.ts
```

These focused commands require the corresponding test files to be implemented. The tests are intended to verify that late or duplicate predictions are rejected and that tournament capacity constraints remain valid under concurrent requests.

## Project Roles

MatchPulse is developed by a solo engineer covering the software development lifecycle:

- **Product Owner:** Defines domain requirements and product goals.
- **Software Architect:** Documents architectural decisions and characteristics.
- **Full-Stack Developer:** Implements the application and database logic.
- **QA Engineer:** Develops automated tests for domain invariants.
- **DevOps:** Manages local infrastructure, CI, and deployment.

## Development Status

MatchPulse is an early-stage project focused on software architecture, development methodology, and reliable prediction processing. Features and testing capabilities will become available as implementation progresses.