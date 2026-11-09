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

## 6. Backup and restore (local/CI)

The backup/restore procedure is exercised in the CI `Delivery and recovery`
job and recorded in the
[recovery verification record](../methodology/verification/2026-11-117-recovery-drill.md).
It backs up the **application-owned `public` schema**, restores it into a
scratch database, and verifies table/policy counts and a marker row.

```bash
# Run inside the Supabase database container.
DB_CONTAINER=$(docker ps --filter "name=supabase_db" --format "{{.Names}}" | head -n 1)

# 1. Back up the application schema.
docker exec "$DB_CONTAINER" pg_dump -U postgres -d postgres \
  --schema=public -Fc -f /tmp/matchpulse-public.dump
docker cp "$DB_CONTAINER:/tmp/matchpulse-public.dump" /tmp/matchpulse-public.dump

# 2. Create a disposable scratch database.
docker exec "$DB_CONTAINER" dropdb -U postgres --if-exists matchpulse_restore
docker exec "$DB_CONTAINER" createdb -U postgres -T template0 matchpulse_restore

# 3. Minimal auth dependency for profiles.auth.users and auth.uid() policies.
docker exec -i "$DB_CONTAINER" psql -U postgres -d matchpulse_restore -v ON_ERROR_STOP=1 <<'SQL'
CREATE SCHEMA auth;
CREATE TABLE auth.users (id UUID PRIMARY KEY);
CREATE OR REPLACE FUNCTION auth.uid() RETURNS UUID
  LANGUAGE SQL STABLE AS $$ SELECT NULL::UUID $$;
SQL

# 4. Restore the public schema.
docker exec "$DB_CONTAINER" pg_restore -U postgres -d matchpulse_restore \
  --clean --if-exists --no-owner --no-privileges /tmp/matchpulse-public.dump
```

**Restore verification:** compare the public table count, RLS policy count and
row counts; confirm the marker row exists; start the app; `GET /api/health`
returns `200`; `bun run smoke` passes. The CI drill does this automatically.

**Observed 2026-11-08:** 67,009-byte backup; tables `10 → 10`, RLS policies
`10 → 10`, tournaments `2 → 2`, marker restored; smoke passed. `pg_restore`
exits `1` because `--clean` emits `DROP POLICY IF EXISTS` statements before the
tables exist in a fresh scratch database; the explicit restored-state
assertions are the gate.

**Scope and limits.** The backup covers the application-owned `public` schema,
not Supabase-managed `auth`, `storage`, `realtime` or `vault` data. The drill
does not cut the app over to the restored database. There is no production
backup, retention, PITR, off-site storage or measured RTO/RPO.

**Safety.** The scratch database is disposable. Do not run a destructive
restore against local data you need without explicit approval.

### Request-key retention

Completed idempotency rows are maintenance data. The cleanup is service-role-only and defaults to 30 days:

```bash
bun run maintenance:cleanup
# optional: TRADE_REQUEST_RETENTION_DAYS=60 bun run maintenance:cleanup
```

The function deletes only `COMPLETED` requests older than the window; recent rows and in-progress rows remain. Authenticated users cannot execute it. Run it from an authorized local/CI maintenance context, never from the application runtime.

### Attendee-data retention

Nominal ticket identity is event-access data. The cleanup is service-role-only and defaults to 365 days:

```bash
bun run maintenance:cleanup-attendees
# optional: ATTENDEE_RETENTION='400 days' bun run maintenance:cleanup-attendees
```

The function clears attendee name, date/place of birth, tax code/document and fan-card number for tickets whose event is older than the window. It keeps the ticket code, order, points and audit record, and writes an `attendee.retention` audit event. Authenticated users cannot execute it. Production scheduling and legal retention review are out of scope.

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
