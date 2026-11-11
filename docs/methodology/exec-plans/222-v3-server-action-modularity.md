# Execution Plan — v3 Server Action Modularity

- **Issue:** [#222](https://github.com/match-pulse/match-pulse/issues/222)
- **Status:** In Progress — implementation complete; independent static verification passed with notes; commit/PR pending
- **Owner:** Human decision owner
- **Date:** 2026-11-11
- **Workflow:** Refactoring
- **Assessment:** [`refactors/2026-11-11-222-v3-server-actions.md`](../refactors/2026-11-11-222-v3-server-actions.md)

## 1. Intent

Improve the internal structure of the v3 Server Action layer without changing observable behavior. The current `src/app/actions/v3.ts` is a 502-line, 21-action, version-named module that spans five existing domain contracts. The intended outcome is five domain-aligned action modules plus one focused server-only helper module, with the same action names, form fields, redirects, messages, revalidation targets, authorization checks and database calls.

Affected users: none directly. The change is internal; fans, club staff and platform admins should see no difference.

## 2. Current State and Evidence

- Baseline commit: `5b053ba03b3f5d4212e6593417cbcd2e074b0f22` on `main`.
- `src/app/actions/v3.ts`: 502 lines, 16,317 bytes, 21 exported Server Actions, five domain imports, seven import sites.
- The 21 actions map to `src/lib/domain/clubs.ts` (6), `events.ts` (7), `tickets.ts` (4), `analytics.ts` (3) and `admin.ts` (1).
- `recordExportAction` has no import site; the export route calls `recordClubExport` directly.
- Nine private helpers in `v3.ts:30-89` support the actions; `attempt` is used by all 21.
- The file is a thin adapter. Business rules remain in the database and domain wrappers; no domain rule moves in this refactor.
- Baseline checks observed before the assessment edit: `bun run lint`, `bun run typecheck`, `bun run build` and `bun run check:architecture` all passed. DB-backed tests and E2E were not run because the local Supabase/Docker environment was unavailable.

**Prior records reviewed:**

- [`findings-register.md`](../findings-register.md) — FND-029–FND-032 were added by this assessment; FND-001–FND-028 are Verified or Deferred and contain no duplicate structural finding.
- [`refactors/2026-11-11-222-v3-server-actions.md`](../refactors/2026-11-11-222-v3-server-actions.md) — this campaign's assessment.
- [`audits/2026-11-10-171-v3-audit.md`](../audits/2026-11-10-171-v3-audit.md) — behavioral/security findings only; AUD-005's reward-action defect is fixed.
- [`docs/workflows/software-refactoring-workflow.md`](../../workflows/software-refactoring-workflow.md) — approval, seam, equivalence and independent-verification rules.
- [`docs/architecture/01-system-overview.md`](../../architecture/01-system-overview.md), [`04-code-map.md`](../../architecture/04-code-map.md), [`03-architecture-characteristics.md`](../../architecture/03-architecture-characteristics.md) and [`checkpoint-D/01-ownership-and-change-rights.md`](../checkpoint-D/01-ownership-and-change-rights.md) — confirm the Server Action seam and the domain boundaries; modularity is not a selected quantified quality target.
- Open issues and pull requests: none. Worktrees: only the primary worktree.
- OpenSpec: no change folder proposed; the refactor has no behavior delta and is governed by this plan and the assessment.

## 3. Scope and Non-Goals

**In scope**

- Extract `text`, `requiredText`, `requiredNumber`, `optionalNumber`, `checked`, `back`, `messageFor`, `attempt` and `Attempt<T>` to `src/app/actions/form.ts` (no `'use server'`).
- Create `src/app/actions/clubs.ts`, `events.ts`, `analytics.ts` and `admin.ts`; extend `src/app/actions/tickets.ts` with the v3 ticket actions. Keep `attendeeFrom` private in `tickets.ts`.
- Move each action body verbatim. Preserve names, signatures, form field names, validation order, defaults, redirects, messages, revalidation calls, authorization checks, domain calls and arguments.
- Update the seven import sites to the new modules.
- Delete `src/app/actions/v3.ts` after all actions move.
- Decide whether to delete the unused `recordExportAction` or move it as-is.
- Update the code map and any architecture navigation text that names `v3.ts`.
- Add the verification record, findings-register updates and AI transparency entry.

**Out of scope**

- Any behavior, validation, error-message, redirect, authorization, RLS, RPC, schema, migration or UI change.
- Fixing REF-004 (`requiredNumber` coercion). That is a separate audit/development issue.
- Refactoring `market.ts`, `organizer.ts`, `register.ts`, `auth.ts`, the CLI or the page components.
- Renaming actions, introducing a generic action framework, adding dependencies, changing the architecture pattern or creating a barrel layer unless a decision below selects it.
- Any release, deployment or production operation.

## 4. Assumptions and Uncertainty

- The five `src/lib/domain/` modules are stable ownership boundaries. Evidence: the code map and domain wrappers already separate clubs, events, tickets, analytics and admin.
- Next.js 16.4.2 accepts multiple `'use server'` modules and a non-`'use server'` helper module imported by them. This is verified by `bun run build` after the first seam; if it fails, the plan stops and a new decision is required.
- Moving actions changes their generated Server Action IDs. This is a deployment consideration; there is no hosted production environment. Local forms and E2E resolve the new IDs from the build.
- The local database/E2E environment may remain unavailable. Static evidence (typecheck, build, architecture guard, diff review) can prove the move compiles but cannot prove browser behavior; the plan marks E2E unverified unless the environment is available.
- The action bodies are small enough to move verbatim; no action needs to be redesigned.
- No OpenSpec change is needed because there is no behavioral specification delta.

## 5. Decisions and Human Approval

| Decision | Options / trade-offs | Recommendation | Human decision | Date |
|---|---|---|---|---|
| D1. Module split | (a) Split by existing domain contract and update imports; (b) keep `v3.ts` as a barrel; (c) keep one file with section comments; (d) split by page surface | (a) Domain-aligned split | Approved (a) | 2026-11-11 |
| D2. Dead `recordExportAction` | (a) Delete with approval; (b) move as-is to `analytics.ts`; (c) leave in place | (a) Delete, because no caller exists and the export route already records directly. Choose (b) if strict surface preservation is required. | Approved (a) | 2026-11-11 |
| D3. REF-004 `requiredNumber` | (a) Separate fix issue, preserve current behavior here; (b) fix inside this refactor; (c) leave and rely on HTML/database | (a) Separate issue; the refactor must stay behavior-neutral | Approved (a) | 2026-11-11 |
| D4. Verification depth | (a) Proceed with static evidence and mark DB/E2E unverified; (b) wait until local Supabase/Docker is available and run DB/E2E; (c) run only the subset that the environment supports | (b) if the environment can be restored; otherwise (a) with explicit unverified status | Approved; local environment remains unavailable, so static evidence with unverified DB/E2E | 2026-11-11 |
| D5. Delivery shape | (a) One branch/PR with three reviewable commits (helpers, module moves, cleanup); (b) one PR per seam; (c) one branch with a single commit | (a) One bounded PR; stop after each commit if the human requests review | Approved (a) | 2026-11-11 |

No implementation begins until D1–D5 are decided. Approval of this plan authorizes the named scope only; it does not authorize a commit, push, PR or merge.

## 6. Acceptance Criteria

- [x] The 20 retained action names and `(formData: FormData)` signatures are unchanged; `recordExportAction` is deleted per approved D2.
- [x] Each retained action lives in the agreed domain module; `src/app/actions/v3.ts` is deleted.
- [x] The seven import sites resolve; the repository has no remaining code import of `@/app/actions/v3`.
- [x] Form field names, validation order, defaults, redirect paths, query keys, error/success messages and `revalidatePath` targets are unchanged.
- [x] Authorization checks and domain calls/arguments are unchanged.
- [x] `bun run lint`, `bun run typecheck`, `bun run build` and `bun run check:architecture` pass.
- [x] An independent verifier confirmed move-only changes, not rewrites, with documentation notes that were then corrected.
- [ ] DB-backed tests and E2E either pass, or are explicitly recorded as unverified with the reason and the residual risk. Static verification is complete; DB/E2E remain unverified because Docker/Supabase is unavailable.
- [x] FND-029–FND-031 are updated with evidence; FND-032 is routed to separate issue #223. Register lifecycle entries are added.
- [ ] The verification record, AI transparency entry and code-map update are present in the same PR. They are present in the working tree; no PR exists yet.
- [x] No historical record is overwritten, renamed or deleted.

## 7. Work Breakdown

| Step | Deliverable | Responsible role | Dependencies | Affected areas |
|---|---|---|---|---|
| 1 | Confirm D1–D5; create branch `refactor/222-v3-server-actions` after authorization | Orchestrator / human | Plan approval | Git |
| 2 | Add `form.ts`; move the eight generic helpers and `Attempt<T>`; keep `attendeeFrom` for the tickets step | Implementer | D1, D3 | `src/app/actions/form.ts`, `v3.ts` |
| 3 | Create `clubs.ts`; move 6 club/plan/member/invite actions; update dashboard and invite imports | Implementer | Step 2 | `actions/clubs.ts`, dashboard, invite page, `v3.ts` |
| 4 | Create `events.ts`; move 7 event/match/ticket-type/resolution actions; update event-page imports | Implementer | Step 2 | `actions/events.ts`, event page, `v3.ts` |
| 5 | Extend `tickets.ts`; move purchase/transfer/check-in/fan-card actions and private `attendeeFrom`; update dashboard, event, fan-ticket and checkout imports | Implementer | Step 2 | `actions/tickets.ts`, four import sites, `v3.ts` |
| 6 | Create `analytics.ts`; move reward/export actions; update dashboard and reward-form imports; apply D2 | Implementer | Step 2, D2 | `actions/analytics.ts`, dashboard, `RewardRedeemForm`, `v3.ts` |
| 7 | Create `admin.ts`; move `assignPlanAction`; update admin import | Implementer | Step 2 | `actions/admin.ts`, admin page, `v3.ts` |
| 8 | Delete `v3.ts`; run an import audit; update the code map | Implementer | Steps 3–7 | `src/app/actions/`, `docs/architecture/04-code-map.md` |
| 9 | Run verification; write the dated verification record | Test Engineer / Refactor Verifier | Step 8, D4 | `docs/methodology/verification/` |
| 10 | Independent diff/equivalence review | Refactor Verifier / Code Reviewer (not the implementer) | Step 9 | Whole diff |
| 11 | Update findings register, AI transparency log and PR records | Orchestrator | Steps 9–10 | `docs/methodology/` |

## 8. Verification

| Claim / criterion | Method | Command or evidence | Result |
|---|---|---|---|
| New action modules compile and Next.js accepts them | Typecheck and production build | `bun run typecheck`; `bun run build` | Passed: both exit 0; build compiled and generated 24/24 pages |
| Lint and architecture guards still pass | Static checks | `bun run lint`; `bun run check:architecture` | Passed: both exit 0; five architecture guards reported |
| All action exports and import sites moved | Import audit and TypeScript | Repository search for `@/app/actions/v3`; compare the 21 export names before/after | Passed: no code import remains; 20 retained actions mapped to five modules; `recordExportAction` deleted |
| Bodies moved rather than rewritten | Diff review | Independent verifier extracts old/new function bodies and compares exact text | Passed: 29 retained bodies byte-identical; `recordExportAction` is the only deletion |
| Form behavior is unchanged | Browser journeys | `bun run test:e2e` (role journeys + accessibility) if the environment is available | Not run: local Supabase/Docker unavailable |
| Database contract is unchanged | DB-backed regression | `bun test --env-file=.env.local tests/integration/v3-club-tenancy.test.ts` if the environment is available | Not run: local Supabase/Docker unavailable |
| Dead export handling is intentional | Import audit and D2 decision | Zero-caller search; build; decision record | Passed: no caller; D2 approved deletion; build passes |
| No historical record changed | Diff and record check | `git diff --name-status`; confirm append-only edits | Passed: historical records untouched; register and AI log appended |

## 9. Risks and Recovery

- **Behavior drift during the move.** Mitigation: move bodies verbatim, one module at a time, and stop for review after each commit. Recovery: revert the affected commit; the previous module is still intact until `v3.ts` is deleted.
- **Next.js rejects the module layout.** Mitigation: build after the helper seam and after the first action module. Recovery: fall back to the approved barrel option or stop and request a new decision.
- **Server Action IDs change.** Mitigation: no production deployment exists; the new build serves new IDs. Recovery: deploy a fresh bundle; do not cache old action forms.
- **No DB/E2E evidence.** Mitigation: record the limitation, do not overclaim behavior preservation, and prefer waiting for the environment if the human requires it.
- **Dead export removal surprises an undocumented caller.** Mitigation: explicit D2 approval; the export route is unaffected. Recovery: restore the action as-is in a follow-up.
- **Validation defect is mistaken for refactor scope.** Mitigation: REF-004 is explicitly excluded and routed separately.
- **Scope creep into other action files or page decomposition.** Mitigation: the stop conditions below.

## 10. Stop Conditions

- A move requires a behavior, message, path, validation, database or UI change.
- Next.js rejects the `'use server'` module layout and the approved fallback is not available.
- A baseline check or E2E test fails and the cause is not clearly environmental.
- The local environment is unavailable and the human requires DB/E2E evidence before proceeding.
- A new finding duplicates or conflicts with an open finding, issue or PR.
- The work expands beyond the five action modules, `form.ts`, the seven import sites and the code map.
- The approved budget or delivery shape is reached.
- Two reversals occur in the same area.

## 11. Completion Evidence

Implemented on branch `refactor/222-v3-server-actions`; no commit, push or PR exists yet.

**Code changes**

- Added `src/app/actions/form.ts` with the shared parsing, redirect and error helpers.
- Added `src/app/actions/clubs.ts` (6 actions), `events.ts` (7), `analytics.ts` (2) and `admin.ts` (1).
- Extended `src/app/actions/tickets.ts` with 4 v3 ticket actions and private `attendeeFrom`; legacy `claimTicket` is unchanged.
- Deleted `src/app/actions/v3.ts` and the unused `recordExportAction` (approved D2).
- Updated the seven import sites and `docs/architecture/04-code-map.md`.

**Observed checks**

| Command | Result |
|---|---|
| `bun run lint` | Exit 0 |
| `bun run typecheck` | Exit 0 |
| `bun run check:architecture` | Exit 0; five guards passed |
| `bun run build` | Exit 0; compiled, TypeScript finished, 24/24 pages generated |
| `git diff --check` | Exit 0 |
| `bunx supabase status` | Exit 1; Docker API permission denied, so DB/E2E were not run |

**Equivalence evidence:** The independent verifier extracted all old and new function bodies and confirmed that the 29 retained functions are byte-identical and appear exactly once. `recordExportAction` is the only deletion. No changed literals, paths, messages, revalidation calls, domain calls, authorization checks or defaults were found.

**Independent review:** A separate read-only verifier session returned `PASS WITH NOTES`. The notes were documentation-only: a broken code-map table, a stale "21 actions" acceptance criterion, an empty completion section, an assessment paragraph still saying the campaign was unapproved, and missing implementation/verification transparency evidence. All were corrected; a follow-up verifier pass returned final verdict `PASS`. No code defect or scope creep was found.

**Limitations:** DB-backed tests and E2E were not run; Docker/Supabase is unavailable. Runtime redirects, form submissions, Server Action ID resolution, revalidation and RLS/RPC behavior remain unverified. No CI run exists because there is no commit or PR.

**Records produced:** refactor assessment `2026-11-11-222-v3-server-actions.md`; findings FND-029–FND-032; this execution plan; verification record `2026-11-11-222-v3-server-actions.md`; AI transparency Entries 73–74; no changelog row (internal refactor, no user-facing behavior change).

**Historical record check:** No existing assessment, finding, ADR or verification record was overwritten, renamed or deleted. The findings register and AI transparency log were appended.
