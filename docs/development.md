# Development and Local Setup

This page holds the developer detail that does not belong on the README:
local setup, demo accounts, CLI, Docker and tests. For environments, health,
release and recovery, use the [operations runbook](operations/runbook.md).

## 1. Prerequisites

- Git
- Bun
- Docker, running
- The Supabase CLI, invoked through Bun

## 2. First local run

```bash
git clone https://github.com/match-pulse/match-pulse.git
cd match-pulse
bun install
bunx supabase start
bunx supabase db reset   # drops and recreates the local schema; deletes local data
```

Create `.env.local` with the values printed by:

```bash
bunx supabase status -o env
```

```dotenv
NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-local-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-local-service-role-key
```

`SUPABASE_SERVICE_ROLE_KEY` is for local fixtures, tests and maintenance only.
It must never be exposed to the browser, committed, or used by the application
runtime.

```bash
bun run dev
```

Open <http://localhost:3000>. The app redirects to `/login`.

## 3. Demo accounts

- **Fan:** open `/login`, choose **Fan**, then create an account with an email,
  username and password. The profile starts with 200 points.
- **Club organizer and platform admin:** create the local fixtures, then sign in
  through the **Organizer** tab:

```bash
bun run auth:organizer
# organizer@matchpulse.local / matchpulse-organizer
# admin@matchpulse.local / matchpulse-admin
```

The script creates a PRO demo club with a published event, a ticket type and a
prediction market. The admin lands on `/admin`.

The default passwords are local fixtures, not production secrets.

## 4. CLI

The CLI is a second client of the same database contract. It stores each
profile's session in `~/.config/matchpulse/<profile>.json` with `0600`
permissions.

```bash
bun run cli -- commands --json
bun run cli -- auth login --profile fan --email fan@example.test --password ...
bun run cli -- fan events list --profile fan --json
```

The command tree and scenarios are in [testing](testing/README.md) and the
[agent playbook](testing/agent-playbook.md).

## 5. Tests

```bash
bun run lint
bun run typecheck
bun run build
bun run test          # database and application suites
bun run test:agent    # CLI match-day and refusal scenarios
bun run test:e2e      # Playwright and axe
bun run check:architecture
bun run smoke
bun run fault:inject  # mutation matrix; requires Supabase and Docker
```

The invariant suites need a running local database. Missing credentials fail
immediately rather than passing silently.

## 6. Docker

Start the local database first, then run the app in a container. Inside the
container `127.0.0.1` is the container itself, so point the app at the host
gateway from `docker-compose.yml`:

```bash
export NEXT_PUBLIC_SUPABASE_URL=http://host.docker.internal:54321
export NEXT_PUBLIC_SUPABASE_ANON_KEY=your-local-anon-key
docker compose up --build
```

The `NEXT_PUBLIC_*` values are compiled into the image at build time. Rebuild
after changing them.

## 7. Where to go next

- [Operations runbook](operations/runbook.md) — environments, health, release, recovery.
- [Testing](testing/README.md) — layers and agent playbook.
- [Architecture reference](architecture/README.md) — structure and decisions.
- [Methodology records](methodology/README.md) — checkpoints and evidence.
- [Workflow index](workflows/README.md) — issue, branch, review and release flow.
