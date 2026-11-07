# Checkpoint D — Dependency Rules and Fitness Functions

- **Status:** Pre-read; implemented guard is live in CI, the rest are proposals.
- **Purpose:** State the architectural rules and make the enforceable ones executable.

## 1. Rules

| ID | Rule | Why | Enforcement |
| :--- | :--- | :--- | :--- |
| **A-R1** | Client components must not import the server-only Supabase client. | Prevents session/database access from the browser boundary. | `bun run check:architecture` |
| **A-R2** | Application source must not perform direct table mutations (`.insert`, `.update`, `.delete`). | Mutations must go through authorized RPCs with `auth.uid()` and role checks. | `bun run check:architecture` |
| **A-R3** | The application runtime must not use the service-role key. | The service key bypasses RLS; it is local test/administration only. | `bun run check:architecture` |
| **A-R4** | Every mutation RPC must be `SECURITY DEFINER`, resolve `auth.uid()`, and be granted only to `authenticated`. | Direct writes are revoked; the RPCs are the only mutation surface. | Text guard + authorization suite |
| **A-R5** | `resolve_market` must require the organizer role. | Domain rule: only authorized organizers finalize results. | Text guard + authorization suite |
| **A-R6** | The database is authoritative for capacity, balances, positions, cooldown and resolution. | Application-layer checks are insufficient under concurrency. | Invariant suites |
| **A-R7** | Schema changes happen only through `supabase/migrations/`. | Reproducibility and reviewability. | CI migration replay + code review |
| **A-R8** | Public reads and private own-row reads are explicit through grants and RLS. | Least privilege and privacy. | Authorization suite + code review |
| **A-R9** | The domain model and invariant registry are updated with the code. | Prevents documentation drift and overclaiming. | Review checklist + link checks |

## 2. Implemented fitness function

`bun run check:architecture` runs `scripts/check-architecture.ts` and checks:

- no service-role key in application source;
- no direct table mutations in `src/`;
- no server-only Supabase client import in client components;
- no imports of the retired unauthenticated client;
- every mutation RPC in `20261110_rpc_auth.sql` has `SECURITY DEFINER`, `auth.uid()`, an explicit revoke and an authenticated-only grant;
- `resolve_market` contains the organizer check.

It runs in the **Lint, typecheck and build** CI job.

### What the guard does not prove

- It is a text-level guard, not a parser or an import-graph analysis.
- It does not prove that every policy is correct; the authorization suite does that for the tested paths.
- It does not query the live database for RLS coverage or grants.
- It can miss indirect imports or dynamic calls.
- It does not replace code review or the database tests.

The guard is a **tripwire**, not a proof.

## 3. Fitness functions still to add

| Candidate | What it would enforce | How |
| :--- | :--- | :--- |
| **RLS coverage query** | Every public table has RLS enabled and at least one policy. | SQL/inventory test against local Supabase |
| **Grant matrix check** | `anon`/`authenticated` have no direct write grants; only intended reads. | Query `information_schema.role_table_grants` |
| **RPC grant check** | Mutation RPCs are executable only by `authenticated`; public helpers only by the intended roles. | Query `pg_proc`/`proacl` or inspect migrations |
| **Migration compatibility** | No destructive change without an expand/contract note; filenames unique and ordered. | Migration lint script |
| **Bundle secret scan** | No service-role key or database URL in the client bundle. | Build scan |
| **Import boundary** | `src/components` never imports server-only modules; `src/app/actions` uses RPCs, not table mutations. | AST/import-graph check |
| **Dependency direction** | UI → actions → RPC → DB; no reverse dependency. | Import graph |
| **Documentation links** | README and methodology links resolve. | Link scan in CI |

## 4. How to change a rule

1. State which architectural risk the rule protects.
2. Update the ADR/ownership record.
3. Update the guard or test, and prove it fails when the rule is broken.
4. Record the limit of the guard.
5. Remove or replace the rule only with a human decision and a dated record.

A rule that cannot fail is not a fitness function. It is a comment.
