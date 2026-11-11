# Verification Record — M-INV2 Observed-Red Mutation (FND-002 / #198)

- **Issue:** [#198](https://github.com/match-pulse/match-pulse/issues/198)
- **PR:** Pending
- **Date:** 2026-11-10
- **Environment:** Local Fedora 44; Bun 1.4.2; local Supabase PostgreSQL 17.11; `dblink` 1.2
- **Status:** Verified — targeted observed-red mutation and forced-failure rollback both behave as declared
- **Verifier:** Implementation Agent / Test Engineer (evidence); Human developer (final verification, 2026-11-10)

## 1. Claim or Acceptance Criterion

FND-002 / M-INV2: the rollback test must fail when a non-atomic side effect escapes a failed trade transaction, not only pass when PostgreSQL rolls back a single function.

## 2. Method

- Kept the existing forced-failure mutation: a trigger raises on trade insert and the test passes because the function rolls back.
- Added `m-inv2-nonateomic`: a test-only `SECURITY DEFINER` trigger function owned by `supabase_admin` connects through `dblink`, sets `session_replication_role = replica` on the second connection, inserts a trade row there, disconnects, then raises the same fault message.
- Applied the mutation as `supabase_admin` (the fault runner now supports a per-mutation user) so `dblink` can connect without a password.
- Ran the rollback fault test under the mutation; it fails because one trade row survives.
- Reset the database and confirmed the baseline forced-failure test passes.

## 3. Command or Evidence

```text
bun test --env-file=.env.local ./tests/fault-injection/atomic-rollback.fault.ts
# with m-inv2-nonateomic applied:
Expected: 0
Received: 1
(fail) M-INV2 rollback > a trade-insert failure leaves no partial balance, position or trade

# baseline forced-failure mutation:
1 pass / 0 fail
```

The dblink mutation is test-only and is removed by the next `supabase db reset`. It is not part of a production migration.

## 4. Result

- The rollback test now detects a non-atomic side effect: the dblink trade row survives the raised exception and the test fails.
- The forced-failure mutation still passes and proves the positive rollback property.
- FND-002 is Verified; the matrix now has 28 entries.

## 5. Limitations

- The mutation is test-only and requires `dblink` plus `supabase_admin`; it must never be installed in production.
- The full 28-entry matrix is revalidated in CI; local evidence covers the new mutation and the baseline rollback.
- The test uses one database instance, not a production cluster.

## 6. Links

- Issue: [#198](https://github.com/match-pulse/match-pulse/issues/198)
- PR: Pending
- Findings register: FND-002
- Invariant registry: M-INV2
- AI transparency entry: Entry 66

## 7. Addenda

Pending PR link and CI matrix result.
