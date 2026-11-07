# Checkpoint D — Ownership and Change Rights

- **Status:** Pre-read; awaiting L13–L16.
- **Purpose:** Make the architectural modules, owners and change rights explicit enough that a change can be routed, reviewed and verified.

## 1. Modules

| Module | Responsibility | Key locations | Owner | Change boundary |
| :--- | :--- | :--- | :--- | :--- |
| **Identity and access** | Supabase Auth, profiles, roles, RLS, grants, session seam | `src/lib/session.ts`, `src/lib/supabase/server.ts`, `src/proxy.ts`, `supabase/migrations/20261108–20261110` | Human owner; Security & Privacy reviewer | Schema/RLS/RPC changes require an ADR or an addendum and authorization tests |
| **Registration** | Capacity, uniqueness, registration path | `src/app/actions/register.ts`, `src/app/tournaments/[id]/page.tsx`, `register_for_tournament` | Human owner; implementation/test agents | Domain rule changes require the invariant registry and fault-injected tests |
| **Market engine** | LMSR pricing, entry/exit, cooldown, resolution, payouts | `supabase/migrations/20261021–20261023`, `src/app/actions/market.ts`, market page/components | Human owner; market/test agents | Pricing, outcome set and settlement changes require an ADR and invariant evidence |
| **Shared interface** | App shell, TopBar, login forms, error messages | `src/app/layout.tsx`, `src/components/` | Human owner; implementation agent | Must not own domain rules or direct database mutations |
| **Database platform** | Schema, constraints, RLS, grants, migrations | `supabase/migrations/`, `supabase/config.toml`, `supabase/seed.sql` | Human owner; security/database reviewer | Migrations are the only schema path; destructive changes require approval |
| **Test and evidence system** | Invariant, authorization and architecture guards; CI | `tests/`, `scripts/check-architecture.ts`, `.github/workflows/ci.yml` | Test engineer; human accepts | Weakening a test, guard or invariant requires explicit approval |
| **Documentation and records** | Architecture, methodology, ADRs, findings, AI log, changelog | `docs/`, `README.md`, `AGENTS.md` | Orchestrator; human accepts | Historical records are append-only; decisions are dated |
| **Release and operations** | Versioning, tags, GitHub Releases, future deployment/recovery | `CHANGELOG.md`, `docs/workflows/release-workflow.md` | Human owner; Release & Operations verifier | Tags are immutable; release requires green `main` and human approval |

## 2. Dependency direction

```text
Browser / client component
        |
        v
Next.js Server Component / Server Action
        |
        v
Authorized SQL RPC (auth.uid + role checks)
        |
        v
PostgreSQL tables, constraints and RLS
```

Rules:

- Presentation code may call Server Actions; it may not talk to the database directly.
- Server Actions validate input and translate results; they do not own domain decisions.
- The database is authoritative for capacity, balances, positions, cooldown and resolution.
- Public reads use RLS/grants; private reads are owner-only.
- Mutations use authorized RPCs; direct table writes are denied.
- The service role is local test/administration only, never application runtime.

## 3. Change rights

| Change | Who may propose | Who decides | Required evidence |
| :--- | :--- | :--- | :--- |
| UI copy, layout, error text | Implementation agent | Human owner | Build/lint/typecheck; no domain change |
| New read-only field/view | Implementation agent | Human owner | RLS/read policy, tests, docs |
| New RPC or RPC signature change | Architect + implementation | Human owner | ADR/contract note, auth checks, grants, tests |
| Schema or migration | Architect + implementation | Human owner | Migration replay, constraints, rollback note, verification |
| Domain rule or pricing change | Product owner + architect | Human owner | Invariant registry, fault-injected tests, release note |
| RLS/grant change | Security reviewer + implementation | Human owner | Authorization suite, grant matrix, threat review |
| New dependency/tool | Implementation agent | Human owner | Need, alternatives, lockfile, CI evidence |
| Residual risk acceptance | Human owner only | Human owner | Dated risk record; AI cannot accept |
| Release/tag/deploy | Release verifier + human | Human owner | Green `main`, release section, migration/rollback notes |

## 4. Ownership gaps

- **No independent human reviewer.** The project is solo; review is structured self-review plus agent role passes (FND-008). A peer review is the recommended first improvement.
- **No CODEOWNERS file.** The module table above is the current ownership source. Add CODEOWNERS only if the repository gains contributors.
- **No organizer management UI.** The organizer role and resolution RPC exist, but the browser management surface does not.
- **No operational owner.** Deployment, monitoring and recovery are not implemented; Checkpoint E will need a release/operations role and evidence.
- **No points ledger.** Balances, trades and payouts are transactional, but there is no append-only ledger for reconciliation.

## 5. Decision rule

If a change crosses a module boundary, changes a contract, or changes who can see/act on data:

1. Write the intent and the affected boundary.
2. State the compatibility and migration path.
3. Name the owner and the reviewer.
4. Add the fitness function or test that would catch a regression.
5. Record the decision and the limit.

If the change cannot be explained in those terms, it is not ready for implementation.
