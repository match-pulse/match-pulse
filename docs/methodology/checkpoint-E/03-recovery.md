# E-03 — Recovery

## 1. Release rollback

Rollback selects the previous good tag and verifies it; it never moves or
deletes a tag.

```bash
git fetch --tags
git checkout vX.Y.(Z-1)
bun install --frozen-lockfile
# start the app against the intended database
bun run smoke
```

A bad release is corrected by a **new PATCH tag**, not by rewriting the old one.
A bad migration is corrected by a new migration; applied migrations are not
edited.

## 2. Local backup and restore

The local Supabase database can be dumped and restored. Commands must be
verified against the installed CLI before documenting results.

```bash
supabase db dump -f /tmp/matchpulse-backup.sql
grep -c "CREATE TABLE" /tmp/matchpulse-backup.sql
```

Restore is destructive to local data. It requires explicit human approval and a
confirmed local-only target:

```bash
psql "$DB_URL" -f /tmp/matchpulse-backup.sql
```

**Verification after restore:** row counts for `profiles`, `tournaments`,
`registrations`, `markets`, `market_trades`; `GET /api/health` returns `200`;
`bun run smoke` passes.

## 3. Incident sequence

1. Detect: red CI, failed smoke, `503` health or a user report.
2. Contain: stop the affected process; do not delete data or rewrite history.
3. Diagnose: read the JSON error event, reproduce, identify the last good tag.
4. Recover: previous tag or local dump; verify health and smoke.
5. Record: dated incident record and a finding if systemic.

## 4. Limits

- No production backup, retention, PITR or disaster-recovery drill.
- The local restore exercise is evidence of procedure, not of production
  recovery time or data-loss bounds.
- No on-call, paging or automated failover.
