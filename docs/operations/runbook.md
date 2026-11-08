# Operations Runbook

- **Scope:** local and CI environments for the MatchPulse course project.
- **Status:** implemented and exercised locally/CI. There is **no production
  environment** and this runbook does not claim one.
- **Related:** [`slo.md`](./slo.md), [release workflow](../workflows/release-workflow.md),
  [architecture characteristics](../architecture/03-architecture-characteristics.md),
  [FND-006](../methodology/findings-register.md).

## 1. Environments

| Environment | Purpose | Database | How it runs |
| :--- | :--- | :--- | :--- |
| Local | Development and manual verification | Supabase local (Docker) | `bun run dev`, `bun run start` |
| CI | Repeatable verification on every PR and `main` | Supabase local in the runner | `.github/workflows/ci.yml` |
| Release | Immutable snapshot by tag | Migrations replayed from `supabase/migrations/` | `git checkout vX.Y.Z` then local/CI start |

There is no hosted production deployment, no paid service and no production
data. Any statement about availability applies only to the environment named in
the evidence.

## 2. Health

`GET /api/health` is public and read-only. It performs one public `markets`
read through the server Supabase client.

```json
{ "status": "ok", "app": "up", "db": "up", "timestamp": "2026-11-08T00:00:00.000Z" }
```

- `200` — the app is running and the database read succeeded.
- `503` — the app is running but the database check failed (`db: "down"`).
- `cache-control: no-store`; no cookies, counts, identities or environment
  values are returned.

**Interpretation.**

- `503` means the app process is alive but cannot reach PostgreSQL. Check the
  Supabase stack (`supabase status`), the environment variables used to start
  the app, and the app log for `health.db_check_failed`.
- A connection error before any response means the app process is not running.

## 3. Logs

`src/lib/logger.ts` writes one JSON object per line to stdout (`info`) or stderr
(`error`):

```json
{"level":"error","event":"market.enter_failed","timestamp":"...","requestId":"...","marketId":"...","message":"..."}
```

- Events currently emitted: `health.db_check_failed`,
  `market.enter_failed`, `market.exit_failed`, `registration.failed`.
- Fields are chosen per event. Tokens, keys, emails, full form bodies and
  session data are never logged.
- In CI, logs appear in the job output. Locally, they appear in the terminal
  that started the app. There is no external collector, dashboard or alerting.

## 4. Release

Follow [`../workflows/release-workflow.md`](../workflows/release-workflow.md).
The short version:

1. `main` CI is green.
2. Curate `CHANGELOG.md`, align `package.json` to the release version.
3. Prepare the release notes and the verification/limitations statement.
4. Merge the release PR.
5. Create an **annotated** tag `vX.Y.Z` on the release commit and push it.
6. Publish the GitHub Release from the tag.
7. Close the milestone and move the board items to Release & Learn.

Tags are immutable. Never move, delete or reuse one.

## 5. Rollback

Rollback is a forward action on a new tag, not a rewrite of history.

| Situation | Action |
| :--- | :--- |
| Bad application release | Check out the previous good tag, verify `/api/health` and `bun run smoke`, then release a new PATCH tag with the fix or revert. |
| Bad migration | Do **not** edit the applied migration or reset shared data. Add a new corrective migration, verify it locally/CI, and release a new version with migration notes. |
| Local data mistake | Restore from the latest local dump (§6); a local `supabase db reset` deletes local data and requires explicit approval. |

Because no production environment exists, "rollback" here means selecting a
previous tag locally or in CI and proving it starts and passes the smoke check.
It is not a zero-downtime production rollback claim.

## 6. Backup and restore (local)

The local Supabase stack can be dumped and restored. The exact CLI flags must be
confirmed against the installed CLI version before use; record the observed
commands and results in the verification record.

```bash
# Dump the local database
supabase db dump -f /tmp/matchpulse-backup.sql

# Confirm the dump is non-empty and contains the expected tables
grep -c "CREATE TABLE" /tmp/matchpulse-backup.sql

# Restore into the local database (only after confirming local data may be replaced)
psql "$(supabase status -o env | sed -n 's/^DB_URL=//p')" -f /tmp/matchpulse-backup.sql
```

**Restore verification:** count rows in `profiles`, `tournaments`,
`registrations`, `markets` and `market_trades`; start the app; `GET
/api/health` returns `200`; `bun run smoke` passes.

**Limits.** This is a local exercise, not a production recovery drill. The
repository does not store backups, schedules or retention rules.

## 7. Incident steps

1. **Detect** — failed CI, a smoke-test failure, a `503` health response or a
   user report.
2. **Contain** — stop the affected process/environment; do not delete data or
   rewrite history.
3. **Diagnose** — read the JSON error event, reproduce locally, identify the
   last good tag.
4. **Recover** — restore from the last good tag or local dump, then verify
   health and smoke.
5. **Record** — add a dated incident record under
   `docs/methodology/incidents/` and a finding if the cause is systemic. Do not
   overwrite an existing record.

No on-call rotation, paging or automated incident response exists.

## 8. What this runbook does not cover

- Hosted deployment, TLS, DNS or cloud configuration.
- Production secrets management and key rotation.
- Centralised logging, metrics, tracing, dashboards or alerts.
- Multi-instance behaviour, load balancing or zero-downtime rollout.
- Production backup retention, PITR or disaster recovery.

These are explicit non-goals for the course scope and remain open in
[FND-006](../methodology/findings-register.md).
