# Refactor Assessment — v3 Server Actions Modularity

- **Assessment ID:** RA-2026-11-11-222
- **Register IDs:** FND-029, FND-030, FND-031, FND-032
- **Baseline:** `5b053ba03b3f5d4212e6593417cbcd2e074b0f22` (`main`, 2026-11-11)
- **Date:** 2026-11-11
- **Assessor:** Software Architect / Refactor Assessor (AI agent; sequential role pass)
- **Status:** Approved for planning — 2026-11-11
- **Behavior-preserving scope:** Server Action names, signatures, form field names, validation order, redirect paths and query keys, error messages, revalidation calls, authorization checks, domain calls and their arguments, and database effects.
- **Read-only confirmation:** No implementation changes were made during this assessment. The only repository changes are this record and the findings-register entries.

## Summary

`src/app/actions/v3.ts` is a single `'use server'` module with 21 exported Server Actions in 502 lines. The actions are thin adapters: they parse `FormData`, call the shared domain contract in `src/lib/domain/`, then redirect with a message or error. Business rules remain in the database and domain wrappers, so the file does not own domain decisions.

The structural problem is file-level cohesion, not function size. The 21 actions span five existing domain modules:

| Existing domain contract | Actions currently in `v3.ts` | Count |
| :--- | :--- | :---: |
| `src/lib/domain/clubs.ts` | `createClubAction`, `requestPlanAction`, `inviteMemberAction`, `acceptInviteAction`, `setMemberRoleAction`, `removeMemberAction` | 6 |
| `src/lib/domain/events.ts` | `createEventAction`, `createTicketTypeAction`, `publishEventAction`, `createMatchAction`, `updateMatchAction`, `setPredictionAction`, `resolveMarketAction` | 7 |
| `src/lib/domain/tickets.ts` | `purchaseTicketAction`, `transferTicketAction`, `checkInAction`, `issueFanCardAction` | 4 |
| `src/lib/domain/analytics.ts` | `createRewardAction`, `redeemRewardAction`, `recordExportAction` | 3 |
| `src/lib/domain/admin.ts` | `assignPlanAction` | 1 |
| **Total** | | **21** |

The file imports all five domain modules plus `src/lib/domain/errors.ts`, `src/lib/domain/types.ts`, `src/lib/session.ts` and `src/lib/supabase/server.ts`. Its name is version-based (`v3`), so it will become less meaningful as the product moves past v3.

The module is used by seven files:

| Import site | Actions imported |
| :--- | :--- |
| `src/app/club/dashboard/page.tsx` | 8 |
| `src/app/club/events/[id]/page.tsx` | 7 |
| `src/app/admin/page.tsx` | 1 |
| `src/app/club/invite/[token]/page.tsx` | 1 |
| `src/app/fan/tickets/page.tsx` | 1 |
| `src/components/EventCheckout.tsx` | 1 |
| `src/components/RewardRedeemForm.tsx` | 1 |

Twenty of the 21 actions have an import site. `recordExportAction` has none; the ELITE export route calls `recordClubExport` directly.

The highest-value, lowest-risk improvement is to split the actions along the domain boundaries that already exist, extract the non-action form plumbing into a server-only helper module, and update the seven import sites. No behavior, UI, schema, RPC, validation message or revalidation target should change.

### Baseline checks

Observed on `5b053ba` before any assessment edit:

| Command | Result |
| :--- | :--- |
| `bun run lint` | Passed (exit 0) |
| `bun run typecheck` | Passed (exit 0) |
| `bun run build` | Passed (exit 0); all routes built |
| `bun run check:architecture` | Passed; five guards reported |
| `bun run test` | Not run — local Supabase/Docker unavailable (`StatusDbInspectError`: Docker API permission denied) |
| `bun run test:e2e` | Not run — requires the same local environment |

This assessment therefore has compile/build evidence, not database-backed or browser evidence. The limitation is carried into the verification plan.

## Prior Assessments and Recurrence Check

Reviewed:

- [`docs/methodology/findings-register.md`](../findings-register.md) — 28 findings. FND-001–FND-005 and FND-009–FND-028 are Verified; FND-006 is Deferred by human decision. No structural, cohesion, module-boundary or dead-code finding exists. No duplicate or recurrence was found.
- [`docs/methodology/refactors/README.md`](README.md) — no prior refactor assessment exists; this is the first.
- [`docs/methodology/audits/2026-11-10-171-v3-audit.md`](../audits/2026-11-10-171-v3-audit.md) — AUD-001–AUD-020 are behavioral, security, privacy and verification findings. AUD-005 referenced the reward action in `v3.ts:449-459`, but that defect was fixed under FND-013. No structural finding.
- [`docs/methodology/incidents/`](../incidents/) — no incident records.
- [`docs/workflows/software-refactoring-workflow.md`](../../workflows/software-refactoring-workflow.md) and its [assessment template](../../workflows/templates/refactor-assessment-template.md).
- ADRs [`001`](../../architecture/adr/001-use-nextjs-and-supabase.md), [`003`](../../architecture/adr/003-authorization-rls.md), [`007`](../../architecture/adr/007-club-tenancy-and-entitlements.md) and [`010`](../../architecture/adr/010-nominal-ticketing-and-attendee-identity.md) — confirm Server Actions are a thin presentation/application seam and the database is the authorization boundary. No ADR defines action-module boundaries.
- [`docs/architecture/01-system-overview.md`](../../architecture/01-system-overview.md) — Server Actions validate input and call the shared domain contract; they do not own domain decisions.
- [`docs/architecture/03-architecture-characteristics.md`](../../architecture/03-architecture-characteristics.md) — modularity, simplicity and maintainability are explicitly not selected as primary quality characteristics. This assessment uses structural evidence and does not claim a new quantified quality target.
- [`docs/architecture/04-code-map.md`](../../architecture/04-code-map.md) — maps all v3 action groups to `v3.ts`, confirming the file is the current navigation hub.
- [`docs/methodology/checkpoint-D/01-ownership-and-change-rights.md`](../checkpoint-D/01-ownership-and-change-rights.md) — module table does not name a v3 action module; the action layer is covered indirectly by "Shared interface" and the domain modules.
- [`docs/methodology/development-practices.md`](../development-practices.md) §4 and [`openspec/README.md`](../../../openspec/README.md) — OpenSpec is for written proposals and multi-step plans. This refactor has no behavior delta and its own workflow records; no OpenSpec change is proposed.
- Open issues: none (`gh issue list --state open` returned an empty list). Open pull requests: none. Worktrees: only the primary worktree.

## Findings

| ID | Register ID | Impact | Area | Structural finding | Evidence | Principle | Recommended change | Verification | Status |
|---|---|---|---|---|---|---|---|---|---|
| REF-001 | FND-029 | Medium | Server Action module boundary | 21 Server Actions from five domains share one version-named module | 502 lines; 21 exports; five domain imports; seven import sites; `v3` name; code map treats the file as a hub | Cohesion, modularity, naming, maintainability | Split by existing `src/lib/domain/` boundaries; update imports; remove `v3.ts` | Import audit, body-move review, typecheck, build, E2E | Open |
| REF-002 | FND-030 | Low | Dead export | `recordExportAction` is exported but unused | 0 import sites; export route calls `recordClubExport` directly at `src/app/api/club/export-v3/route.ts:118` | Encapsulation, simplicity | Delete with approval, or move as-is if strict surface preservation is required | Import audit, build | Open |
| REF-003 | FND-031 | Low | Shared action plumbing | Nine private helpers couple every action to one file | `src/app/actions/v3.ts:30-89`; `attempt` used by all 21 actions; `back` used throughout | Encapsulation, testability, simplicity | Extract non-action helpers to `src/app/actions/form.ts`; keep ticket-specific `attendeeFrom` in the tickets module | Typecheck, build, helper-usage inventory | Open |
| REF-004 | FND-032 | Medium | Validation (out of refactor scope) | `requiredNumber` silently turns a missing/empty field into `0` | `src/app/actions/v3.ts:43-47`; `text` returns `null`; `Number(null) === 0`; `Number.isFinite(0)` passes. `update_club_match` accepts non-negative scores, so missing scores can become 0–0 | Validation correctness, not structure | Route to a separate audit/development issue; do not change in this behavior-neutral refactor | Unit test for the helper, DB-backed match update test, E2E | Open — routed |

## Finding Details

### REF-001 — Mixed domain responsibilities in one Server Action module

- **Impact:** Medium
- **Location:** `src/app/actions/v3.ts`; current domain contracts in `src/lib/domain/clubs.ts`, `events.ts`, `tickets.ts`, `analytics.ts`, `admin.ts`; import sites listed above.
- **Current structure:** One `'use server'` file exports all 21 v3 actions. Each action parses `FormData`, creates a Supabase server client, calls one domain wrapper, and redirects. The file is a cross-domain adapter.
- **Evidence:**
  - 502 lines, 16,317 bytes, 21 exported actions.
  - 21 `createSupabaseServerClient()` calls, 21 `if (!result.ok) back(...)` guards, 24 `revalidatePath` calls.
  - Five domain imports: clubs, events, tickets, analytics, admin.
  - Seven import sites; the club dashboard alone imports eight actions from this one path.
  - The code map (`docs/architecture/04-code-map.md`) lists `v3.ts` as the location for club onboarding, members, fan cards, rewards, events, matches, ticket types, purchase, transfer, check-in, resolution and admin plan/status.
  - The ownership table does not name a v3 action module, so the file crosses several ownership descriptions.
- **Quality characteristic:** Cohesion, modularity, naming clarity, maintainability.
- **Options and trade-offs:**
  1. **Split by existing domain contract and update all import sites.** Each new module has one reason to change; the module path matches `src/lib/domain/`; 7 files change. Recommended.
  2. **Keep `v3.ts` as a compatibility barrel that re-exports the new modules.** Fewer call-site changes, but retains a cross-domain public module, adds indirection, and depends on Next.js allowing server-action re-exports. Not recommended.
  3. **Keep one file and add section comments.** Lowest churn and risk, but does not change the module boundary or the version-based name. Does not address the finding.
  4. **Split by page surface (dashboard, event page, fan, admin).** Fewer modules, but couples action modules to page layout and makes reuse across surfaces harder. Not recommended.
- **Recommended change:** Option 1. Proposed modules, mirroring the domain contract:
  - `src/app/actions/clubs.ts`: 6 club/plan/member/invite actions.
  - `src/app/actions/events.ts`: 7 event/match/ticket-type/resolution actions.
  - `src/app/actions/tickets.ts` (extend the existing file): 4 purchase/transfer/check-in/fan-card actions plus the existing legacy `claimTicket`.
  - `src/app/actions/analytics.ts`: 3 reward/export actions.
  - `src/app/actions/admin.ts`: 1 admin plan action.
  - `src/app/actions/form.ts` (not `'use server'`): shared parsing/redirect/error helpers.
  - Delete `src/app/actions/v3.ts` after all imports move.
- **Behavioral contract to preserve:**
  - All 21 exported action names and `(formData: FormData)` signatures.
  - Every form field name and parsing order.
  - Every redirect path and query parameter, including `?club=`, `?invite=`, `message` and `error`.
  - Every success and error message produced by `fromUnknownError` and the local guards.
  - Every `revalidatePath` target and call order.
  - The `getCurrentUser`/`redirect('/login?next=...')` behavior in `purchaseTicketAction`.
  - Every domain call and argument, including `randomUUID()` fallbacks, `validateAttendees`, and `checked`/`optionalNumber` defaults.
  - No database, schema, RLS, grant, RPC, UI or business-rule change.
- **Equivalence verification:** typecheck/build after each module move; `git diff --color-moved` review; import-site audit; E2E role journeys and accessibility tests if the local environment is available; an independent verifier checks that function bodies moved rather than changed. A compile-only contract check is not a substitute for the E2E evidence.
- **Risks / constraints:**
  - Moving a Server Action to a new file changes its generated action ID. A browser holding a stale bundle could submit an old ID; this is a deployment consideration, not a local behavior change. No production deployment exists.
  - Next.js requires every export from a `'use server'` file to be an async function. Helpers must live in a non-`'use server'` module.
  - There is no direct unit or characterization test for the action wrappers; E2E covers purchase, reward creation, match update/resolution, club dashboard and admin visibility, but not every action.
  - The local Supabase/Docker environment was unavailable during the assessment, so DB/E2E baseline evidence is missing.
- **Related issue / plan / PR:** issue [#222](https://github.com/match-pulse/match-pulse/issues/222); proposed plan [`222-v3-server-action-modularity.md`](../exec-plans/222-v3-server-action-modularity.md).

### REF-002 — Dead exported Server Action

- **Impact:** Low
- **Location:** `src/app/actions/v3.ts:466-478` (`recordExportAction`).
- **Current structure:** The action parses `clubId` and `resource`, calls `recordClubExport`, revalidates `/club/dashboard?club=...`, and redirects. No UI form or module imports it.
- **Evidence:**
  - A repository-wide import audit found zero import sites for `recordExportAction`.
  - `src/app/api/club/export-v3/route.ts:118` calls `recordClubExport(supabase, clubId, 'analytics-v3', {...})` directly after the GET export.
  - The action is not mentioned in the code map, agent playbook, tests or documentation.
- **Quality characteristic:** Encapsulation, simplicity, dead code.
- **Options and trade-offs:**
  1. **Delete it with explicit approval.** Removes an unused internal action endpoint and avoids carrying dead code into a new module. Recommended cleanup, but it is the only non-mechanical change in the campaign.
  2. **Move it as-is to `analytics.ts`.** Strictly preserves the exported surface, including dead code. Recommended only if the human wants a purely mechanical split.
  3. **Leave it in `v3.ts`.** Conflicts with deleting the file and keeps the version-named module alive. Not viable for the recommended split.
- **Recommended change:** Option 1, subject to a separate human decision. If approved, no replacement export is added. The export route remains unchanged because it already records the export directly.
- **Behavioral contract to preserve:** There is no observed caller and no documented API. The only contract is the module export. Removing it changes that internal export but not the export route, the database audit row, or any user-visible flow.
- **Equivalence verification:** Repository-wide import search; `bun run build` to confirm no unresolved import; route table review. If Option 2 is chosen, the same search confirms the action moved.
- **Risks / constraints:** An undocumented external caller could rely on the generated action ID; there is no evidence of one. This is an internal module surface, not a documented public API.
- **Related issue / plan / PR:** issue [#222](https://github.com/match-pulse/match-pulse/issues/222); proposed plan [`222-v3-server-action-modularity.md`](../exec-plans/222-v3-server-action-modularity.md).

### REF-003 — Private action plumbing has no shared seam

- **Impact:** Low
- **Location:** `src/app/actions/v3.ts:30-89`.
- **Current structure:** Nine private helpers support all actions:
  - `text`, `requiredText`, `requiredNumber`, `optionalNumber`, `checked` — `FormData` parsing.
  - `back` — redirects with `message`/`error` query values.
  - `messageFor`, `attempt` — error translation and result capture.
  - `attendeeFrom` — ticket attendee payload construction.
- **Evidence:** `attempt` is used by all 21 actions; `back` is used in every action; `requiredText`/`text`/`checked` are used across all five proposed modules; `attendeeFrom` is used only by purchase and transfer.
- **Quality characteristic:** Encapsulation, testability, simplicity.
- **Options and trade-offs:**
  1. **Extract generic helpers to `src/app/actions/form.ts` (no `'use server'`) and keep `attendeeFrom` in `tickets.ts`.** One shared, focused module; action modules stay thin. Recommended.
  2. **Duplicate the helpers in each new module.** Avoids a shared module but duplicates validation/redirect/error behavior across five files. Rejected.
  3. **Keep the helpers in one action module and import them from the others.** Creates an implicit dependency between action modules and makes one domain own another's plumbing. Rejected.
- **Recommended change:** Option 1. Move `text`, `requiredText`, `requiredNumber`, `optionalNumber`, `checked`, `back`, `messageFor`, `attempt` and the `Attempt<T>` type to `src/app/actions/form.ts`. Keep `attendeeFrom` in `src/app/actions/tickets.ts`. Move the logic verbatim, including the current `requiredNumber` behavior (see REF-004).
- **Behavioral contract to preserve:** Exact parsing, error classification, redirect construction and query encoding. The helper module must never be imported by a client component.
- **Equivalence verification:** typecheck/build; grep audit that all 21 actions use the shared helpers; review that no helper body changed except import path.
- **Risks / constraints:** `form.ts` must not carry `'use server'` because it exports synchronous helpers; action modules keep `'use server'`. `back` uses `next/navigation`'s `redirect`, so the helper module is server-only.
- **Related issue / plan / PR:** issue [#222](https://github.com/match-pulse/match-pulse/issues/222); proposed plan [`222-v3-server-action-modularity.md`](../exec-plans/222-v3-server-action-modularity.md).

### REF-004 — `requiredNumber` silently coerces a missing value to zero

- **Impact:** Medium
- **Location:** `src/app/actions/v3.ts:43-47`; call sites at lines 128, 220–221, 259 and 439–440.
- **Current structure:**
  ```ts
  function requiredNumber(formData: FormData, key: string): number {
    const value = Number(text(formData, key))
    if (!Number.isFinite(value)) {
      throw new DomainError('VALIDATION', `${key} must be a number.`)
    }
    return value
  }
  ```
  `text` returns `null` for a missing or empty field. `Number(null)` is `0`, and `Number.isFinite(0)` is true, so the function returns `0` instead of rejecting the request.
- **Evidence:**
  - `create_club_event` rejects `p_max_capacity < 1`, so a missing event capacity is caught by the database.
  - `create_club_reward` rejects `p_cost_points <= 0` and `p_discount_percent < 1`, so missing reward values are caught by the database.
  - `purchaseTicketAction` rejects `quantity < 1`, so a missing quantity is caught in the action.
  - `update_club_match` only rejects NULL or negative scores. It accepts `0`, so missing `homeScore`/`awayScore` become a valid `0–0` score. The HTML form marks the fields as required, but the server-side boundary does not enforce presence.
- **Quality characteristic:** Validation correctness; this is a defect, not a structural issue.
- **Options and trade-offs:**
  1. **Fix it in a separate issue:** make `requiredNumber` reject `null`/empty before `Number(...)`, add a unit test and a DB-backed match-update test. Recommended.
  2. **Fix it inside this refactor:** rejected; it changes behavior and mixes a bug fix into a behavior-neutral move.
  3. **Leave it and rely on HTML/database checks:** not recommended; the match-update path shows the gap is reachable.
- **Recommended change:** Keep the current behavior in the refactor. Open a separate audit/development issue with the evidence above; the fix should decide the intended error message and add tests.
- **Behavioral contract to preserve:** The refactor must not alter the current coercion. If the separate fix lands first, the refactor should move the fixed helper verbatim and re-baseline.
- **Equivalence verification:** A unit test for missing/empty/non-numeric values; a DB-backed `update_club_match` test for a missing score. These belong to the separate fix, not this campaign.
- **Risks / constraints:** Moving the helper without fixing it preserves a known validation gap. The assessment records it so it is not lost.
- **Related issue / plan / PR:** issue [#222](https://github.com/match-pulse/match-pulse/issues/222); separate issue not yet created; see the human decision in the plan.

## Human Decisions

| Finding | Decision | Approved scope | Human approval / date |
|---|---|---|---|
| REF-001 | Approved | Split by the five existing `src/lib/domain/` boundaries; update seven import sites; delete `v3.ts` | Human decision owner, 2026-11-11 |
| REF-002 | Approved | Delete the unused `recordExportAction`; the export route remains unchanged | Human decision owner, 2026-11-11 |
| REF-003 | Approved | Extract generic helpers to `src/app/actions/form.ts`; keep `attendeeFrom` private in `tickets.ts` | Human decision owner, 2026-11-11 |
| REF-004 | Approved | Separate fix issue; preserve current `requiredNumber` behavior in this refactor | Human decision owner, 2026-11-11 |

## Verification and Loop Decision

| Finding | Diff review | Tests / equivalence evidence | Structural improvement evidence | Verifier | Status |
|---|---|---|---|---|---|
| REF-001 | Not run | Baseline lint/typecheck/build/architecture pass; DB/E2E not run | 21 actions mapped to five domain modules; seven import sites identified | Pending | Open |
| REF-002 | Not run | Import audit found 0 callers; build not run after change | Dead export identified | Pending | Open |
| REF-003 | Not run | Helper usage inventory complete; no behavior test yet | Nine private helpers identified | Pending | Open |
| REF-004 | Not run | Code inspection and RPC checks; no test yet | Not structural | Pending | Open — routed |

This assessment is a proposal, not an approved campaign. No implementation may start until the human approves the scope and the decisions above. The campaign stops if a move requires a behavior, message, path, validation, database or UI change; if Next.js rejects the module split; if the approved budget is reached; or if two reversals occur in the same area.

## Records Produced

- Findings register update: FND-029–FND-032 added.
- Remediation record(s): none yet.
- Verification record(s): none yet; baseline commands recorded above.
- AI transparency entry: Entry 73.
- Changelog row: none; this assessment has no user-facing or developer-facing runtime change.

## Historical Record Check

This is the first refactor assessment in the repository. No existing assessment, finding, ADR or verification record was overwritten, renamed, moved or deleted. The findings register rows were appended; existing rows and lifecycle entries remain unchanged.

## Addendum — 2026-11-11 (approval and implementation)

- The human decision owner approved REF-001–REF-004 and decisions D1–D5 on 2026-11-11. The sentence above describing the assessment as an unapproved proposal is the historical assessment position; the approval is recorded in the Human Decisions table and the execution plan.
- The approved split is implemented on branch `refactor/222-v3-server-actions`: `form.ts` plus five domain modules; `v3.ts` deleted; `recordExportAction` deleted per D2.
- An independent read-only verifier confirmed the 29 retained function bodies are byte-identical and found no code defect or scope creep. Its documentation notes were corrected.
- `bun run lint`, `bun run typecheck`, `bun run build` and `bun run check:architecture` pass. DB-backed tests and E2E remain unverified because Docker/Supabase is unavailable.
- FND-029–FND-031 are implemented and pending final verification; FND-032 remains open and outside this refactor.
- No commit, push or PR exists yet. See the [verification record](../verification/2026-11-11-222-v3-server-actions.md).
