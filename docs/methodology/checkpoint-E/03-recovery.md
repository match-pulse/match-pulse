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

## 2. Backup and restore

The procedure is exercised in the CI `Delivery and recovery` job. It backs up
the application-owned `public` schema with `pg_dump`, restores it into a
disposable scratch database with `pg_restore`, and verifies:

- public table count (`10 → 10`);
- public RLS policy count (`10 → 10`);
- tournament row count (`2 → 2`);
- a marker tournament inserted before the backup;
- app health and smoke after the drill.

Observed 2026-11-08: 67,009-byte backup; all counts matched; marker restored;
smoke passed. CI run
[42467767299](https://github.com/match-pulse/match-pulse/actions/runs/42467767299).
The full commands and the `pg_restore` clean-phase warning are documented in
the [operations runbook](../../operations/runbook.md#6-backup-and-restore-localci)
and the [verification record](../verification/2026-11-117-recovery-drill.md).

**Scope.** The backup covers the application-owned `public` schema, not
Supabase-managed `auth`, `storage`, `realtime` or `vault` data. The app is not
cut over to the restored database.

## 3. Incident sequence

1. Detect: red CI, failed smoke, `503` health or a user report.
2. Contain: stop the affected process; do not delete data or rewrite history.
3. Diagnose: read the JSON error event, reproduce, identify the last good tag.
4. Recover: previous tag or local dump; verify health and smoke.
5. Record: dated incident record and a finding if systemic.

## 4. Limits

- No production backup, retention, PITR or disaster-recovery drill.
- The local/CI restore exercise is evidence of procedure and restored state, not
  of production recovery time or data-loss bounds.
- No on-call, paging or automated failover.
