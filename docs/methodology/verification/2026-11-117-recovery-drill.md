# Verification — Backup and Restore Recovery Drill

- **Date:** 2026-11-08
- **Issue:** #117
- **PR:** #118
- **Status:** Verified in CI for the local Supabase/PostgreSQL environment. Production recovery remains unverified.
- **Related:** [Delivery verification](2026-11-111-delivery-operations-baseline.md), [Operations runbook](../../operations/runbook.md), [Checkpoint E recovery](../checkpoint-E/03-recovery.md), [FND-006](../findings-register.md)

## 1. What was verified

- A backup of the application-owned `public` schema is produced from the running local database.
- The backup is restored into a scratch PostgreSQL database.
- The restored schema has the same number of public tables and RLS policies as the source.
- The restored data has the same tournament count and the marker row inserted before the backup.
- The working database is not modified by the drill.
- The app still starts and the smoke test passes after the drill.
- The existing invariant suite remains green.

## 2. Environment

- GitHub Actions `ubuntu-latest`; Supabase local; PostgreSQL 17; Bun 1.4.2;
  Next.js 16.4.2.
- The backup is taken with `pg_dump` from the Supabase database container.
- The restore target is a scratch database in the same PostgreSQL instance.
- No hosted deployment, production data or external backup service was used.

## 3. Commands and observed results

| Command / job | Result |
| :--- | :--- |
| `bunx supabase start` / `db reset` | Passed. |
| `pg_dump --schema=public -Fc` | Produced a 67,009-byte backup. |
| `pg_restore` into `matchpulse_restore` | Exit status 1 from clean-phase `DROP POLICY IF EXISTS` warnings; restored state assertions passed. |
| Public table count | 10 → 10. |
| Public RLS policy count | 10 → 10. |
| Tournament count | 2 → 2. |
| Marker row | `Recovery drill marker` restored. |
| App health and smoke after the drill | Passed. |
| Domain invariants | 28 pass, 0 failures. |

CI run: [42467767299](https://github.com/match-pulse/match-pulse/actions/runs/42467767299)

```text
Database container: supabase_db_match-pulse
Backup size: 67009 bytes
pg_restore exit status: 1
tables: 10 -> 10
RLS policies: 10 -> 10
tournaments: 2 -> 2
restored marker: Recovery drill marker
```

## 4. Restore scope

The backup contains the **application-owned `public` schema**. Supabase-managed
schemas (`auth`, `storage`, `realtime`, `vault`) are platform infrastructure and
are recreated by Supabase, not by this application backup.

The scratch database receives a minimal `auth` shim before the restore because
the public schema depends on `auth.users(id)` and `auth.uid()`. The shim proves
the public schema can be restored; it is not a restore of Supabase Auth data.

## 5. Why `pg_restore` exits 1

`pg_restore --clean` emits `DROP POLICY IF EXISTS ...` statements before the
tables exist in a fresh scratch database. PostgreSQL reports “relation does not
exist” for those cleanup statements, and `pg_restore` exits 1 even though it
continues and restores the schema. The drill therefore gates on explicit
restored-state assertions (tables, policies, row counts, marker) rather than on
the exit code alone. The status is printed for the record.

This is a known limitation of the drill, not a silent failure: if the restore
did not produce the expected tables, policies or marker, the job fails.

## 6. Limits and unverified claims

- No production backup, retention, PITR, encryption or off-site storage.
- No restore of Supabase-managed `auth`/`storage` data; only the public schema.
- No app cutover to the restored database; the app runs against the working
  database after the drill.
- No measured RTO/RPO, no disaster-recovery exercise, no on-call.
- No independent human review.

## 7. Findings

- **FND-006** — recovery evidence improved: the local/CI backup/restore procedure
  is now exercised. Hosted deployment, production backup/retention and a
  production recovery drill remain open.
- FND-004 remains partly fixed; FND-002, FND-007 and FND-008 remain open.

## 8. Decision

The local/CI recovery drill is accepted for the course environment. Production
recovery risk is not accepted by this record.
