# Checkpoint E — Delivery, Observation and Recovery

**3-minute checkpoint.** The focus is how an increment reaches a running
environment, how I know it is healthy, what happens when it fails, how recovery
works, and what risk remains.

## Delivery

Local and CI only. There is no hosted environment, TLS, DNS or production
availability claim.

- **Local:** Docker + Supabase CLI; `bun install`, `bunx supabase start`,
  `bunx supabase db reset`, `bun run dev`. A new person can replay every
  migration from an empty schema.
- **CI:** five jobs — lint/typecheck/build/security, domain invariants,
  delivery/recovery, fault injection, E2E/accessibility.
- **Container:** `Dockerfile` and `docker-compose.yml` run the app against the
  host Supabase stack.

`db reset` deletes local data; it is not a production operation.

## Observation

| Signal | What it proves | What it cannot |
| :--- | :--- | :--- |
| `GET /api/health` | App + database reachable, no sensitive data | Business correctness, latency |
| JSON logs | A health or key action failure happened | Trends, alerting, correlation |
| `bun run smoke` | Health, login and home shell work | Authenticated purchase/trade, load |
| CI status | The recorded checks ran and passed | Production behaviour |
| Capacity burst p50/p95/max | A local latency observation | Sustained load, multi-instance |

There is no collector, dashboard, trace or alert. Logs go to stdout and are lost
when the process stops. That is acceptable for a course prototype and is stated
as a limit.

## Release and rollback

Releases are annotated SemVer tags on `main` after CI is green. v3.0.0 is the
current tag; the v3.1.0 remediation is in the changelog `Unreleased` section. A
rollback is a previous tag plus a migration replay or a public-schema restore.
There is no production rollback because there is no production. Breaking changes
are named: anonymous sessions removed, reward redemption requires a request key,
resolution requires a finished match and the score-derived winner.

## Recovery

The CI `Delivery and recovery` job dumps the application-owned `public` schema,
restores it into a scratch database and verifies tables, RLS policies, rows and a
marker. The last recorded drill restored a 67,009-byte backup: tables 10 → 10,
policies 10 → 10, tournaments 2 → 2, marker present.

It proves the application schema and policies can be restored. It does **not**
prove Supabase-managed auth/storage, point-in-time recovery, production RTO/RPO,
encryption keys or recovery from a corrupted backup.

## SLOs and limits

Proposed, not production commitments: health returns 200 in smoke; p95 < 1,000 ms
for 100 concurrent registrations (observed 463–572 ms); 0 invariant failures in
the domain suite; public-schema restore matches tables/policies/rows. Availability
is not claimed.

The limits are: no hosted deployment, external monitoring, alerting, on-call,
production backup, retention, RTO/RPO or incident drill. The p95 is an
observation, not a release gate. If a hosted environment is required, it is an
explicit decision with cost, security and operational approval.

**Detail:** [runbook](../../operations/runbook.md) · [SLOs](../../operations/slo.md) ·
[recovery drill](../verification/2026-11-117-recovery-drill.md) ·
[delivery verification](../verification/2026-11-111-delivery-operations-baseline.md)
