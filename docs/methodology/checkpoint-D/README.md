# Checkpoint D — Architecture and Changeability (Pre-read)

- **Date:** 2026-11-07
- **Status:** **Pre-read only.** The L13–L16 lecture materials are not yet in the course folder. This folder prepares the architecture baseline; it is not the final Checkpoint D deliverable.
- **Update 2026-11-08:** the idempotency change scenario is implemented and verified (#107 / PR #108, 28 tests in CI). The architecture baseline now has a real compatible-change example; L13–L16 requirements are still pending.
- **Purpose:** Make ownership, boundaries, dependency rules, changeability and compatibility explicit enough to test against the actual L13–L16 requirements when they arrive.
- **Related:** [Kata](../../architecture/kata.md), [System overview](../../architecture/01-system-overview.md), [Domain model](../../architecture/02-domain-model.md), [Architecture characteristics](../../architecture/03-architecture-characteristics.md), [Code map](../../architecture/04-code-map.md), [C4 views](../../architecture/05-c4-diagrams.md), [ADR-001](../../architecture/adr/001-use-nextjs-and-supabase.md), [ADR-002](../../architecture/adr/002-live-prediction-market.md), [ADR-003](../../architecture/adr/003-authorization-rls.md)

## 1. What D is likely to ask

Based on L01 and the course structure, Checkpoint D is about **architecture, ownership and compatible change**:

- who owns which architectural area and who may change it;
- what boundaries and dependencies must stay stable;
- which fitness functions enforce those rules;
- how a realistic change moves through the architecture;
- whether the change is compatible, what migration/rollback is required;
- what technical debt remains and how the architecture evolves.

The exact questions will be confirmed from L13–L16. This pre-read should be treated as a hypothesis, not a finished answer.

## 2. Current architecture evidence

| Evidence | What it establishes | Limit |
| :--- | :--- | :--- |
| Kata and domain model | Domain scope, entities and invariants | No real organizer evidence; matches are not linked to tournaments |
| System overview | Modular monolith, request flow, security boundary | Organizer management UI is not implemented |
| Architecture characteristics | Elasticity, deployability, testability, integrity, security/authorization | Deployment and load are unverified |
| C4 views | Context, containers, market components | No component view for the registration/auth path |
| Code map | Architecture elements mapped to files, migrations and tests | A navigation aid, not an enforcement mechanism |
| ADR-001–003 | Stack, live market, authorization/RLS | No ADR yet for modular-monolith ownership or compatibility policy |
| Invariant and authorization suites | Domain and access-control evidence in CI | Some market invariants remain un-injected; local environment only |
| v1.1.0 release | Immutable release with migration notes | No deployment or operational evidence |

## 3. What this folder contains

1. [`01-ownership-and-change-rights.md`](./01-ownership-and-change-rights.md) — modules, owners, dependency direction and who may change what.
2. [`02-dependency-rules-and-fitness-functions.md`](./02-dependency-rules-and-fitness-functions.md) — boundaries, executable guards and their limits.
3. [`03-change-scenario-idempotency.md`](./03-change-scenario-idempotency.md) — a realistic compatible change with impact, tests, migration and rollback.
4. [`04-compatibility-and-evolution.md`](./04-compatibility-and-evolution.md) — expand/contract policy, versioning and what requires a MAJOR release.
5. [`05-technical-debt-and-evolution.md`](./05-technical-debt-and-evolution.md) — the debt register and the evolution path.

## 4. Known, inferred and unknown

| Statement | Status |
| :--- | :--- |
| The system is a modular monolith with one Next.js app and one PostgreSQL database. | **Known** — code and architecture docs. |
| The database enforces the critical invariants; the application translates and validates. | **Known** — migrations, RPCs and tests. |
| Authentication/RLS is the current security boundary. | **Known** — ADR-003 and verification record. |
| D will ask for a change scenario and changeability evidence. | **Inferred** from L01 and the course pattern. |
| D will require fitness functions, ownership and a compatibility policy. | **Inferred**; exact form awaits L13–L16. |
| Idempotency is the right first D change scenario. | **Proposed** — it closes FND-003 and exercises schema/RPC/test/docs. |
| A deployment/operational change is part of D or E. | **Unknown** — likely E (delivery/observation/recovery). |

## 5. Pre-read verdict

The architecture baseline is strong: modular monolith, database-enforced invariants, explicit security boundary, C4 views, code map and three ADRs. D is not yet complete because:

- there is no prepared change scenario with evidence (this folder begins one);
- the fitness functions are new and only partially cover the boundaries;
- there is no accepted architecture ownership/compatibility ADR;
- the L13–L16 requirements are not available.

## 6. Proposed D work after L13–L16 arrive

1. Validate this pre-read against the actual D questions.
2. Run the idempotency change scenario end-to-end, or replace it with the change D asks for.
3. Add the missing fitness functions (RLS coverage, grant matrix, migration compatibility).
4. Write ADR-004 for architecture ownership and compatible change if the course requires an explicit decision.
5. Record the change evidence, limits and residual risk.
6. Present D with the same claim → evidence → limit → decision structure used in C.

## 7. Decisions requested

- Approve the D pre-read as the working baseline.
- Confirm the change scenario: idempotency (recommended) or organizer resolution UI.
- Confirm whether the architecture guards should stay in CI (they currently run in the build job).
- Confirm whether to write a proposed ADR-004 now or wait for L13–L16.

## 7. v3.0.0 change evidence (2026-11-09)

The v3.0.0 increment is the realistic architecture change for Checkpoint D:

- **Change:** clubs became the tenant; events are club-owned; plans/entitlements gate features; ticketing became nominal (buyer vs attendee); a shared domain contract and CLI were added.
- **Ownership:** club `OWNER`/`ADMIN`/`STAFF`/`ANALYST`, platform admin and ops are separate capabilities. The service role is not an application identity.
- **Boundaries:** the database remains the system of record; `src/lib/domain/` is the shared contract used by Server Actions and the CLI; the CLI never imports Server Actions.
- **Fitness functions:** `scripts/check-architecture.ts` guards service-role use, direct mutations, mutation-RPC definers and imports; the tenancy suite checks club isolation, role matrix, entitlements, nominal ticketing and retention; the CLI suite checks command parity.
- **Compatibility/migration:** `20261201`–`20261205` are additive; existing organizers are backfilled into clubs with `OWNER`/`PRO`; anonymous fan sessions are explicitly not migrated; legacy v2 pages remain for compatibility.
- **Trade-offs:** multi-tenant RLS and entitlement checks add query and test complexity; the modular monolith and database boundary are retained.
- **Technical debt:** legacy global roles/pages, no real payments/KYC, no seat maps/wallet/turnstile/FIGC integration, local-only retention, no hosted deployment.

Evidence: [execution plan](../exec-plans/153-v3-club-subscriptions.md), ADR-007–010, [schema verification](../verification/2026-11-157-v3-club-tenancy.md), [CLI verification](../verification/2026-11-159-cli-and-agent-playbook.md), [auth/UI verification](../verification/2026-11-161-v3-auth-ui.md), [club UI verification](../verification/2026-11-163-club-members-rewards-insights.md), [retention verification](../verification/2026-11-165-attendee-retention.md).

The exact L13–L16 questions are still pending; this section is the prepared evidence, not the final answer.
