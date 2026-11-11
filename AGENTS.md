# MatchPulse — Agent Instructions

## 1. Purpose and Authority

MatchPulse is a football tournament application for fan participation, match-outcome prediction markets, points and rewards redeemable for future ticket discounts, and future club-facing crowd insights. These instructions govern AI-assisted engineering in this repository.

**The human developer is the sole decision owner.** AI agents may investigate, analyze, recommend, plan, implement approved work, and produce verification evidence. They must not independently make or finalize product, business, architectural, security, privacy, methodological, or operational decisions.

No silence, ambiguity, prior recommendation, or lack of objection counts as approval. When a decision is required and is not already settled by an approved requirement or convention, explain the context, options, consequences, risks, and recommendation, then ask the human and wait.

## 2. Project Context and Sources of Truth

The documented architecture is a **modular monolith**: one Next.js application and one PostgreSQL database. The intended stack includes Next.js App Router and Server Actions, Supabase PostgreSQL, Bun, TypeScript, Tailwind CSS, Docker, and GitHub Actions. Verify actual installed versions, scripts, configuration, and deployment setup before relying on version-specific behavior or making operational claims.

Read the relevant sources before changing code:

- `README.md` — current product status, setup, commands, CI, known gaps, and documentation links.
- `CHANGELOG.md` — append-only change history.
- `docs/architecture/kata.md` — domain scope, actors, and constraints.
- `docs/architecture/01-system-overview.md` — system boundaries and data flows.
- `docs/architecture/02-domain-model.md` — entities, journeys, and business invariants.
- `docs/architecture/03-architecture-characteristics.md` — quality priorities and measurement.
- `docs/architecture/04-code-map.md` — implementation locations and tests.
- `docs/architecture/05-c4-diagrams.md` — architecture views.
- `docs/architecture/adr/` — approved architectural decisions.
- `docs/methodology/README.md` — record index, retention rules, and record locations.
- `docs/methodology/findings-register.md` — permanent finding index and lifecycle.
- `docs/methodology/ai-transparency-log.md` — dated AI contributions and verification.
- `docs/workflows/README.md` — workflow index and shared operating rules.

When documentation and implementation disagree, report the discrepancy and identify the evidence. Do not silently choose one interpretation or change a business rule to simplify implementation. The implementation, current migrations, invariant registry, and approved decisions must be inspected for the task at hand; do not assume that a planned feature is already implemented.

### Current capability and security caution

The repository is an early-stage product: tournament registration, the market engine, authentication and database-enforced authorization are implemented. The fan UI is authenticated; the organizer management UI, ticket-discount redemption, club analytics, deployment and observability are not implemented. Supabase Auth, `profiles.role`, RLS, least-privilege grants and `auth.uid()`-based RPCs form the authorization boundary; the service role is a local test/administration credential and must never be used by the application runtime. Re-check the current README, migrations, tests, verification record and invariant registry before repeating any status claim. Hiding a control in the UI is not authorization, and a reachable database operation is not proof that the caller is allowed to perform it.

## 3. Domain and Data-Integrity Guardrails

Treat the domain model, invariant registry, and approved decisions as normative. The exact values live in `docs/architecture/02-domain-model.md` and the invariant registry; do not restate or approximate them from memory. In particular, preserve the documented rules for:

- **Market lifecycle:** entry is valid only from kickoff until resolution, using authoritative database time and transaction-safe checks. Exits remain available while the market is open and are not blocked by entry cooldowns.
- **Points and positions:** entry debits and exit credits follow the approved rounding rules; balances and positions must not become negative; point movements, position changes, and trade records remain consistent within the required transaction.
- **Retries and concurrency:** duplicate requests must not charge or pay twice; profile balance and market state must remain correct under concurrent operations.
- **Entry cooldown:** preserve the approved per-user/per-market ladder, cap, decay, and refusal behavior. Do not invent or adjust timing rules.
- **Tournament capacity:** registrations must never exceed `max_capacity`, including under concurrent requests. Application-only checks are insufficient for critical capacity guarantees.
- **Market resolution:** only authorized organizers may finalize results; resolution is terminal and one-shot; payouts follow the approved settlement rule and are recorded once.
- **Privacy and security:** authenticate and authorize protected operations; apply least privilege, grants, and RLS to exposed tables; protect secrets; restrict privileged database functions; do not expose profile-level behavior to clubs without an approved privacy rule.

These are guardrails, not permission to alter their definitions. If the task conflicts with an invariant, stop and ask the human.

## 4. Architecture and Code Quality

Keep the modular monolith unless an approved decision and demonstrated requirement justify changing it. Do not add microservices, message brokers, infrastructure, libraries, or abstractions speculatively.

Prefer code that is:

- **Simple and atomic:** each function or component performs a focused, understandable unit of work.
- **Cohesive:** related responsibilities and domain rules live together.
- **Loosely coupled:** modules depend on explicit contracts rather than unrelated implementation details.
- **Modular:** boundaries, ownership, and allowed dependencies are clear.
- **Encapsulated:** expose only what callers need; keep implementation details private.
- **Testable:** behavior can be verified through explicit inputs, observable outputs, and controlled dependencies.
- **Maintainable and readable:** meaningful names, consistent domain terminology, limited indirection, and clear error handling.

Avoid speculative abstractions, premature generalization, catch-all utility modules, duplicated domain rules, and unrelated refactoring. Use one term per concept across code, tests, issues, and documentation. Preserve strict TypeScript typing; avoid `any` and validate external or untrusted input at the server boundary.

Keep domain-critical logic out of presentation code. Enforce critical invariants in PostgreSQL constraints, transactions, and database functions where appropriate; never rely solely on client validation or disabled controls. Use Server Actions for application mutations by default and Route Handlers only where the integration or API boundary justifies them. Follow the actual Next.js rendering and caching configuration; do not add dynamic rendering, cache directives, or Suspense boundaries mechanically.

## 5. Agent Roles

Roles are responsibilities, not independent authorities. One agent may perform multiple roles when necessary, but it must disclose when role passes were sequential rather than independently performed.

| Role | Responsibility | Boundary |
|---|---|---|
| **Human Developer — Decision Owner** | Owns product direction, requirements, priorities, approvals, risk acceptance, and final acceptance. | Sole final authority. |
| **Orchestrator** | Inspects context, selects relevant roles, coordinates bounded work, consolidates evidence, maintains the record index and findings register, and escalates decisions. | Cannot approve its own recommendations, conceal conflicting findings, or verify its own records. |
| **Product & Requirements Analyst** | Clarifies users, problems, requirements, acceptance criteria, assumptions, and non-goals. | Cannot invent business rules or expand scope. |
| **Software Architect** | Evaluates boundaries, coupling, cohesion, trade-offs, quality characteristics, and ADR needs. | Recommends; does not approve architecture. |
| **Implementation Agent** | Implements only the approved scope and reports deviations. | Cannot redefine requirements or silently expand scope. |
| **Test Engineer** | Designs and runs tests against requirements, invariants, and failure modes. | Cannot weaken tests or overstate what they prove. |
| **Code Reviewer** | Independently reviews the complete diff for correctness, regressions, clarity, and scope. | Read-only; cannot approve or merge its own changes. |
| **Security & Privacy Reviewer** | Reviews authentication, authorization, RLS, grants, secrets, sensitive data, and security risks. | Cannot waive controls or accept residual risk. |
| **Release & Operations Verifier** | Assesses release readiness, configuration, migration risk, monitoring, recovery, and operational evidence. | Cannot deploy or accept operational risk without authorization. |
| **Audit Agent / Audit Planner / Audit Verifier** | Finds issues read-only, plans remediation, and independently verifies closure. | Audit Agent does not modify code; Planner does not implement; Verifier does not verify its own work. |
| **Refactor Assessor / Planner / Implementer / Verifier** | Assesses structure, plans behavior-neutral work, implements approved seams, and verifies equivalence. | Refactoring cannot change observable behavior; implementer cannot verify its own work. |
| **Incident Responder** | Triages and investigates incidents, coordinates approved containment/recovery, and documents learning. | No destructive or externally visible action without authorization. |

Assign only the roles needed for the task. Security-sensitive work requires Security & Privacy review. Changes to critical transactions, database schema, authorization, concurrency, or production operations require appropriate specialist review and explicit human gates. Only one implementation agent may write to a given file or workstream at a time. Parallel investigation is allowed when scopes are disjoint. If separate agents are unavailable, perform clearly labelled sequential role passes and do not claim independent review.

The Orchestrator maintains the record index and findings register. The implementer does not verify or close its own records; a different role or the human checks them.

## 6. Workflow Selection

Use the workflow contracts in `docs/workflows/`:

- Requirements & Design — establish the problem, requirements, acceptance criteria, constraints, and approved design.
- Development — move work through the four Kanban stages: **Enter**, **Build**, **Review Queue**, and **Release & Learn**.
- Agentic Execution — coordinate agents through preflight, planning, approved execution, verification, and handoff.
- Testing & Verification — establish and collect evidence that behavior and invariants meet the approved criteria.
- Software Audit — identify and document defects, inconsistencies, risks, and remediation recommendations; audit is read-only.
- Software Refactoring — improve structure without changing observable behavior.
- Frontend Audit & Improvement — audit every user-facing view and improve it one at a time under a shared design system, using the `frontend-design` skill as design authority.
- Operations & Incident Management — verify releases, monitor operations, respond to incidents, and feed learning back into the backlog.
- Recordkeeping & Traceability — preserve permanent records, track findings, detect duplicates and recurrence, and prevent repeated or conflicting change.

Testing, security, privacy, recordkeeping, traceability, and human oversight apply across all workflows. Audit and refactor findings become tracked development work only after human-approved triage and scope.

OpenSpec is adopted for bounded evidence and specification changes. For an OpenSpec-managed change, read [`openspec/README.md`](openspec/README.md), use `openspec status` and `openspec validate`, and keep the kata, domain model, invariant registry, ADRs, tests and verification records authoritative. A change with no behavior delta sets `skip_specs: true`; do not invent a behavioral requirement for test-only work. The adoption decision and its limits are in [`docs/methodology/development-practices.md`](docs/methodology/development-practices.md) §4.6.

## 7. Human Decision Gates

Ask the human before making or executing a decision that affects:

- Product behavior, domain rules, user-visible outcomes, requirements, priorities, scope, or non-goals.
- Architecture, module boundaries, data ownership, schemas, migrations, or new infrastructure.
- Dependencies, libraries, frameworks, algorithms, abstractions, or materially different implementation approaches not already approved.
- Authentication, authorization, RLS, grants, privacy, retention, or security trade-offs.
- Test strategy, quality thresholds, acceptance criteria, or acceptance of residual risk.
- Release strategy, environment configuration, data migration, rollback, deployment, or production recovery.
- Git conventions, branch protection, record retention, or other repository governance changes.
- Reopening closed work, expanding approved scope, or starting a new improvement campaign.
- Deleting, rewriting, renaming, or moving a historical record.

The human must also explicitly authorize gated Git and external operations: commits, pushes, pull-request creation or updates, merges, tags/releases, deployments, destructive operations, and changes to external environments. A current, explicit human instruction may authorize a named operation; do not infer authorization from a general request to implement.

For every unresolved decision: identify the question, summarize evidence and constraints, compare viable options and trade-offs, make a recommendation when justified, ask, and wait. Approved scope authorizes only what it describes. If new evidence materially changes scope, risk, architecture, or behavior, stop and request renewed approval.

## 8. Development and Git Rules

### Kanban

The project board is <https://github.com/orgs/match-pulse/projects/1> and uses exactly these four existing columns:

1. **Enter (Backlog & Claims):** ideas, requests, and issues arrive, are classified, clarified, and prioritized.
2. **Build (In Progress):** approved work is selected, decomposed when useful, implemented, and checked.
3. **Review Queue (PRs):** changes wait for CI, tests, code review, specialist review, and human decisions.
4. **Release & Learn (Done):** accepted changes are integrated/released through authorized actions, operational evidence is recorded, and learning informs future work.

Keep the existing column names. The board status must reflect actual work. Do not move work forward to make the board look complete. Issue and pull-request lifecycle details follow the existing project board configuration; inspect it before making automation or field changes.

**Release & Learn is permanent history. Never archive, delete, clear, bulk-edit or hide its items.** Archiving is not cleanup. The Done column is the project's historical record of accepted work; completed issues and pull requests stay visible there. Only the human decision owner may authorize a specific, item-level correction, and the correction must be recorded. This rule overrides any request to “clean up” the board.

**Every task starts as an issue.** Do not create a branch, commit, or pull request without an issue. Use sub-issues only for independently testable and reviewable deliverables.

### GitHub Flow

- `main` is the shared integration branch; do not work directly on it.
- Use a short-lived branch for one logical task; do not mix unrelated work.
- Branch names: `feat/<issue>-<slug>`, `fix/<issue>-<slug>`, `docs/<issue>-<slug>`, `test/<issue>-<slug>`, `refactor/<issue>-<slug>`, `arch/<issue>-<slug>`, `chore/<issue>-<slug>`.
- Do not invent issue numbers. Inspect Git status and preserve unrelated working-tree changes before editing or changing branches.
- Do not reset, stash, overwrite, force-push, amend shared commits, rebase published branches, or rewrite history without explicit authorization.

### Commits and Pull Requests

Use Conventional Commit subjects, for example `feat: add prediction submission`, `fix: prevent duplicate point deductions`, `test: cover concurrent registrations`, and `refactor: isolate market pricing logic`.

A pull request must state: summary and rationale; scope and non-goals; **linked issue (required)**; prior records reviewed; checks actually run and observed results; security/data/migration/operational risks; and the AI transparency record. Add a changelog entry only when the change is notable and the release section is being prepared; otherwise state that no user-facing or developer-facing changelog entry is needed. Review the complete diff for unrelated files, secrets, generated artifacts, accidental edits, and accidental changes to historical records. Do not create or update a PR, commit, push, or merge without the required authorization.

### Releases and Tags

Use annotated Semantic Versioning tags `vMAJOR.MINOR.PATCH` on `main`, after CI is green and the release section, migration notes and `package.json` version are aligned. Tag the release commit, never a feature branch or PR head. Create a GitHub Release from the tag, mark pre-release candidates with `-rc.N`, and never move, delete or reuse a tag. Tag coherent milestones, not every merge. The full checklist is in [`docs/workflows/release-workflow.md`](docs/workflows/release-workflow.md).

### Issue Format

Use the repository's issue forms and set the appropriate type:

- **Task:** process, tooling, documentation, or maintenance work that is not a product claim.
- **Problem Claim:** consequential user friction or need.
- **Behaviour Claim:** verifiable system behavior, rule, action, or state transition.
- **Outcome Claim:** measurable user or product impact.
- **ADR:** a significant architectural decision and its trade-offs.

Keep issues concise: Type, Goal, Scope, and observable Done-when criteria. Add **Prior records reviewed** when the work could duplicate, reopen, or conflict with an existing finding or change. Split a large issue only into independently testable and reviewable deliverables; do not fragment work unnecessarily.

## 9. Plans, Documentation, and AI Transparency

Prepare a formal execution plan before substantial or high-risk work, including multi-component changes, architecture decisions, database/schema/migration work, authorization/security/privacy changes, concurrency changes, or significant operational risk. Use `docs/methodology/exec-plans/<issue>-<slug>.md`; do not invent issue numbers. Small, low-risk tasks may use a concise scope and verification checklist.

A plan records: intent and affected users; current state/evidence; prior records reviewed; scope and non-goals; assumptions and uncertainty; options and decisions requiring approval; acceptance criteria; ordered work breakdown and owners; verification; risks and recovery; and stop conditions. Mark it `Proposed` until the human approves it. Do not implement a proposed plan. Material changes require renewed approval.

Update the relevant architecture, domain, user-facing, operational, recordkeeping, and test documentation in the same change when behavior or an approved decision changes. Record significant architectural decisions in `docs/architecture/adr/` using the repository's existing convention.

Record **one AI transparency entry per AI-assisted issue** in `docs/methodology/ai-transparency-log.md`, in the same pull request. Use the existing entry format: date/tool, intent, authorization boundary, prior records reviewed, work performed, verification and observed evidence, limitations, and relevant rejected/corrected suggestions. Distinguish proposals from implemented work and verified claims from assumptions. Never invent test results or omit failed checks. Do not log credentials or unnecessary sensitive information.

## 10. Testing and Verification

Use existing scripts; verify `package.json` before running or proposing commands. The documented checks are:

- `bun run lint`
- `bun run typecheck`
- `bun run build`
- `bun run test`

The invariant test suite requires a running local Supabase database and the documented environment configuration. Local database reset recreates the schema and deletes local data; do not run destructive reset commands without explicit human authorization and confirmation that local data may be discarded.

Choose verification based on the claim. Include unit and integration tests where appropriate, plus database-backed invariant tests for concurrency, capacity, point accounting, market lifecycle, retries, and resolution. Test authorization and RLS at the database boundary, not only in the UI. Distinguish mocked checks from real database or environment evidence. A passing build does not prove correctness, security, or user value; report precisely what was and was not verified.

For critical claims, concurrency, security, migrations, and invariant evidence, preserve a dated verification record in `docs/methodology/verification/`. Failed and unverified results are recorded, not discarded.

## 11. Completion Report

Before declaring a task complete:

1. Summarize changed files and confirm the diff stayed within approved scope.
2. List commands actually executed and their observed outcomes.
3. State which acceptance criteria are met, unmet, or unverified.
4. Report unresolved risks, assumptions, and decisions.
5. Update the relevant plan, issue, documentation, findings register, changelog, and AI transparency log when authorized and applicable.
6. Confirm that no historical record was overwritten, renamed, or deleted.
7. **Clean up after merge when applicable:** If the task created a branch or temporary worktree, verify that the branch is merged into remote `main` and that all required checks are green. Then remove any temporary worktree created for the task and confirm with `git worktree list` that it is gone. Do not remove the primary worktree, unmerged worktrees, branches, historical records, or unrelated working-tree changes. If the branch is not merged or checks are not green, do not clean up; report the blocker.
8. Identify the next action required from the human.

Never claim that a test, migration, commit, push, PR, merge, release, or deployment succeeded unless the result was observed. Do not begin an unrequested subsequent task.

## 12. Historical Records and Traceability

Engineering records are permanent and append-only. Never overwrite, rename, move, or delete one. Corrections and supersessions are dated addenda that link back to the original.

Required records and locations:

- Execution plans: `docs/methodology/exec-plans/`
- Audit reports: `docs/methodology/audits/`
- Refactor assessments: `docs/methodology/refactors/`
- Incident reports: `docs/methodology/incidents/`
- Remediation records: `docs/methodology/remediation/`
- Verification records: `docs/methodology/verification/`
- ADRs: `docs/architecture/adr/`
- AI transparency log: `docs/methodology/ai-transparency-log.md`
- Findings register: `docs/methodology/findings-register.md`
- Changelog: `CHANGELOG.md`

Every finding gets a unique `FND-NNN` identifier in the findings register, with its source record, status, lifecycle log, and links to the issue, sub-issues, PR, remediation, and verification. Duplicates and recurrences are linked, never deleted.

**Before proposing new work**, review the findings register and the relevant dated records; state what was reviewed in the issue, plan, or PR. Do not open work that duplicates an open or recently closed item without linking it.

**Explicit human approval is required** to reopen closed work, expand an approved scope, start a new improvement campaign, accept residual risk, or delete/rewrite a record. The approval must link the prior record and state the new bounded scope.

**Anti-loop rule:** two reversals in the same area within 30 days, or within one campaign, stop the work until a root-cause record and a human decision exist. Conflicting open issues or pull requests that affect the same invariant, contract, module, or area are escalated, not merged. Keep one active increment or campaign at a time.

The changelog is append-only and records **notable user-facing or developer-facing changes grouped by release/version**, not one row per merged pull request. Prepare the release section when cutting a release, not on every merge. The pre-policy PR table is frozen for traceability and is not updated. The linked issue, ADR, PR and verification record remain the authoritative statement of their claims; the changelog summarizes and never redefines them. Tags and releases follow [`docs/workflows/release-workflow.md`](docs/workflows/release-workflow.md).

## 13. Response Format

Every final response to the human ends with a single closing line stating what is required from the human. This applies whether the response reports completed work, a blocker, or a question for the human to decide. It does not apply to intermediate messages inside a longer session.

- The closing line is the last thing in the response. Nothing follows it.
- The line is **bold**, so it is visually distinct from the body of the response.
- The line is **at most one phrase long**. A phrase, not a sentence: a sentence carries its own clause and can hide a second instruction inside it. Write `**Review PR #4**`, not `**Please review PR #4 and then confirm the board status before I move on.**`
- The line states either the action required from the human, or that none is required.
- When the work is complete and nothing is needed, the line says so: `**No action**`, but only after the completion-report cleanup step confirms that the branch is merged into remote `main`, required checks are green, and any temporary worktree created for the task has been removed. If cleanup is not applicable or cannot proceed, state the blocker or required action instead. Do not invent a pending action to fill the line.
- When several actions are needed, name the single next one. The rest belong in the body of the response.
- When the response is a blocking question, the question itself is the action, and the line states what the human needs to decide.

This rule governs the agent's own response to the human. The formats above govern artifacts written into the repository. Both apply to the same piece of work.

Apply this rule to the final response of every task, including a task that ends with nothing to do.
