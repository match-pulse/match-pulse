# Checkpoint D — Compatibility and Evolution

- **Status:** Pre-read; policy proposal.
- **Purpose:** Define what “compatible change” means for MatchPulse and when a change requires a new MAJOR release.

## 1. Contracts

| Contract | Where it lives | Consumers | Breaking examples |
| :--- | :--- | :--- | :--- |
| **Database schema** | `supabase/migrations/` | Application RPCs, tests, local tooling | Dropping a column/table; changing a type; removing a constraint; a reset-required migration without a note |
| **RPC signatures** | `CREATE FUNCTION` in migrations | Server Actions, tests, local scripts | Removing/renaming a parameter; changing return columns; changing error semantics |
| **Authorization contract** | RLS policies, grants, auth checks | Fans, organizers, public readers | A private table becoming public; a mutation becoming callable by `anon`; a role losing/ gaining authority |
| **Domain rules** | Kata, domain model, invariant registry, RPCs | Users, tests, release notes | Capacity, points, pricing, cooldown, resolution or payout semantics |
| **Server Action contract** | `src/app/actions/` | Client components | Changed form fields, success/error shape, redirect behavior |
| **Release contract** | `CHANGELOG.md`, tags, GitHub Releases | Maintainers, assessors | Moving/deleting a tag; rewriting a released section |

## 2. Expand → migrate → contract

Use this sequence for schema and RPC changes:

1. **Expand:** add the new column/table/parameter/function without removing the old path. Keep old clients working.
2. **Migrate:** update the application, tests and docs to use the new path. Backfill data if needed.
3. **Observe:** run both paths or the new path in CI; watch for defects.
4. **Contract:** remove the old path only with a release note and a MAJOR/MINOR decision.

A change is **compatible** when a consumer that follows the current contract can continue without a coordinated change. A change is **breaking** when it requires the consumer to change or resets data.

## 3. Versioning decision

| Change | Release |
| :--- | :--- |
| Additive read-only field/view; new public data with a safe default | MINOR |
| Additive RPC parameter with a default; new table/RPC without removing the old path | MINOR |
| Backward-compatible fix; security patch | PATCH |
| Remove/rename an RPC parameter; remove a return column; change a domain rule; reset-required contract change with no compatibility path | MAJOR |
| New feature that preserves existing contracts | MINOR |

A local reset required by a migration does **not** automatically make a release MAJOR if there are no external consumers; it must be stated in the migration note. If the database contract is treated as public, it is MAJOR.

## 4. Migration rules

- One logical migration per file; filename order is the replay order.
- Additive changes first; destructive changes last and only with a note.
- Every migration must replay from an empty schema in CI.
- A migration that deletes data, resets local state or changes a role/grant requires explicit human approval.
- No manual schema edits; the migration is the record.
- Include rollback/recovery notes when the change is non-trivial.

## 5. RPC compatibility

- Prefer adding an optional parameter over changing an existing one.
- If a new required parameter is unavoidable, add a new function version and keep the old one until the app and tests migrate.
- Document the error semantics: refusal vs exception vs replay.
- Keep authorization checks inside every version.
- Retire an old RPC only with a release note and a search for callers.

## 6. Authorization compatibility

- A change that widens read/write access is a security change, not a routine feature.
- It requires the Security & Privacy reviewer, an authorization test, and a release note.
- A change that narrows access can break a legitimate user; test the affected role.
- The public trade feed must remain identity-free if it is widened.

## 7. Rollback and recovery

- **Before release:** revert the branch, reset locally, re-run CI.
- **After release:** create a new PATCH release; never move/delete the tag.
- **Data changes:** no production data exists today; once a deployment exists, backup/restore and rollback notes become mandatory.
- **Contract removal:** keep the old path for a deprecation window; document the removal condition.

## 8. What is missing

- No automated migration compatibility lint.
- No RPC versioning scheme beyond parameter changes.
- No production backup/restore or rollback drill (Checkpoint E).
- No deprecation register beyond the changelog and ADRs.

## 9. Decision requested

- Approve this compatibility policy as the D baseline.
- Confirm whether the database contract is treated as public (MAJOR on breaking changes) or local-only (MINOR with migration notes).
- Confirm whether an ADR-004 should record this policy.
