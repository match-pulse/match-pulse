# MatchPulse

MatchPulse is a club-first football ticketing and fan-engagement platform. A club
subscribes to a plan, creates events and matches, sells nominal tickets, checks
attendees in, and reads aggregate prediction insights for its own matches. Fans
use one email/password account to buy tickets and predict with points across
clubs. A platform admin manages clubs, plans and audit.

Commerce is **simulated**: no payment provider, financial KYC, invoice, refund or
settlement. The project is a course prototype, not a production service.

**Current code:** v3.0.0 plus the v3.1.0 security and integrity remediation
(unreleased). **Last recorded check:** 57 database/application tests, 2 CLI
scenarios, 11 Playwright journeys and a 27-entry fault-injection matrix.

## What works

| Area | State |
| :--- | :--- |
| Club tenancy and plans | STARTER/PRO/ELITE; database-enforced entitlements and limits |
| Nominal ticketing | 1–4 named attendees, identity data, terms, code/QR, transfer, box office, idempotent check-in |
| Prediction market | LMSR HOME/DRAW/AWAY points market; entry/exit, cooldown, idempotency, result-bound one-shot resolution |
| Cross-club fans | One email/password account; club-scoped data; no anonymous sessions |
| Club insights | Aggregate-only, own events, cohorts below 5 suppressed, no attendee identity |
| Platform admin | Clubs, plans, subscription status and audit; no impersonation |
| CLI and agents | `matchpulse` JSON client; match-day and refusal scenarios |

## The claim

> For a club organizer running a match day, MatchPulse will keep ticket sales and
> prediction trades correct under concurrent requests — never overselling, never
> charging twice, never paying a winning share twice, and never exposing another
> club's data — measured by concurrent database-backed tests against committed
> state, with the limitation that commerce is simulated, the evidence is local/CI,
> and there is no hosted deployment or independent user study.

The critical rules — capacity, points, ticket codes, club isolation, roles and
resolution — are enforced inside PostgreSQL transactions, row locks, constraints,
RLS and `SECURITY DEFINER` functions. The database, not the UI, is the
authorization boundary.

## Run it

Prerequisites: Git, Bun, Docker and the Supabase CLI (invoked through Bun).

```bash
bun install
bunx supabase start
bunx supabase db reset   # deletes local data
# write .env.local from: bunx supabase status -o env
bun run dev
```

`SUPABASE_SERVICE_ROLE_KEY` is for local fixtures, tests and maintenance only. It
must never be exposed to the browser, committed, or used by the application
runtime.

Create a fan account from `/login`, or create the local organizer/admin fixtures:

```bash
bun run auth:organizer
# organizer@matchpulse.local / matchpulse-organizer
# admin@matchpulse.local / matchpulse-admin
```

The CLI is a second client of the same domain contract:

```bash
bun run cli -- commands --json
bun run cli -- auth login --profile fan --email fan@example.test --password ...
bun run cli -- fan events list --profile fan --json
```

## Course documentation

Start with [`docs/course/README.md`](docs/course/README.md).

| Deliverable | Source | PDF |
| :--- | :--- | :--- |
| Kata (Task 1) | [`docs/architecture/kata.md`](docs/architecture/kata.md) | `docs/submissions/kata.pdf` |
| Architecture characteristics (Task 2) | [`docs/architecture/03-architecture-characteristics.md`](docs/architecture/03-architecture-characteristics.md) | `docs/submissions/architecture-characteristics.pdf` |
| Architecture description | [`docs/architecture/reports/2026-11-10.md`](docs/architecture/reports/2026-11-10.md) | `docs/submissions/architecture-report.pdf` |
| Methodology checkpoints A–E | [`docs/methodology/checkpoints/`](docs/methodology/checkpoints/) | `docs/submissions/methodology-checkpoints.pdf` |
| AI use | [`docs/methodology/ai-use.md`](docs/methodology/ai-use.md) | linked from the architecture description |

The detailed reference is in [`docs/architecture/`](docs/architecture/README.md).
The permanent evidence — verification, audits, execution plans and the full AI
log — is in [`docs/methodology/`](docs/methodology/README.md).

## Testing

```bash
bun run lint
bun run typecheck
bun run build
bun run test
bun run test:agent
bun run test:e2e
bun run check:architecture
bun run smoke
bun run fault:inject
bun run docs:pdf
```

The invariant suites need a running local database. Missing credentials fail
immediately.

## Limits

- No hosted deployment, TLS, DNS, external monitoring or alerting. Production
  deployment is the final post-MVP step; see
  [`production-deployment.md`](docs/operations/production-deployment.md).
- No production backup, retention, RTO/RPO or disaster recovery.
- No real payments, KYC, invoices, refunds or settlement.
- No seat maps, wallet passes, turnstile hardware or FIGC/Questura integration.
- Attendee retention is a local maintenance command, not a scheduled job.
- No independent privacy or security audit; no data resale.
- M-INV2 is verified by forced-failure rollback, not observed-red.
- The p95 latency is observed, not a CI gate.
- Legacy v2 pages and the legacy `CLUB` role remain for compatibility.

See [`AGENTS.md`](AGENTS.md) for the engineering rules and human decision gates.
