# Frontend Audit & Improvement Workflow

## Overview

The Frontend Audit & Improvement Workflow is a design-led, evidence-backed improvement campaign across every user-facing route, page, view, shared layout, and significant UI component. It improves visual hierarchy, typography, layout, interaction, responsiveness, and accessibility while preserving application functionality, domain rules, authorization, and architectural conventions.

Anthropic's official `frontend-design` skill is the design authority throughout this workflow. Load it before discovery and keep applying it during audit, implementation, critique, and consistency review.

This is an improvement workflow, not a read-only audit, a behavior-neutral refactor, or feature development. It deliberately changes presentation and interaction design within an approved campaign. It must not change product behavior, business rules, data contracts, authentication, authorization, routes, or architecture without the corresponding human decision.

Invoke it with: **"Run the Frontend Audit & Improvement Workflow"** or **"Run the frontend improvement workflow."**

The work enters through the normal Development lifecycle as an issue with Type, Goal, Scope, and observable Done-when criteria. The human approves the campaign scope and improvement plan once; views then proceed sequentially without per-view approval unless a human decision gate below is triggered.

## Roles

- **Human Developer — Decision Owner:** approves the campaign scope, priorities, acceptance criteria, material design direction, and any gated decision; authorizes commits, pushes, pull requests, merges, and releases.
- **Orchestrator:** builds the frontend inventory, sequences the views, maintains the campaign record and completion ledger, consolidates evidence, and escalates decisions.
- **Frontend Design Lead:** loads and applies the `frontend-design` skill, establishes the design language and token plan, audits the interface, and critiques the rendered result.
- **Implementation Agent:** implements the approved improvements directly in the application, one view at a time, within the approved scope.
- **Code Reviewer:** independently reviews the complete diff for correctness, regressions, scope expansion, accessibility problems, and consistency with the design system.
- **Test Engineer / Verifier:** verifies rendering, responsiveness, interaction behavior, accessibility, and relevant automated checks; records observed evidence and distinguishes it from assumptions.
- **Security & Privacy Reviewer:** reviews any view change that touches authentication, sessions, protected data, client-side exposure, or authorization behavior.

One agent may perform several roles. Disclose sequential role passes and do not claim independent review or verification when the same agent performed the implementation. The implementer must not mark its own critical work as independently verified.

## Workflow Stages

### 1. Phase 1 — Discovery

Inspect the existing frontend architecture and understand the application before proposing changes.

- Inventory all user-facing routes, including public and authenticated pages, dynamic and nested routes, layouts, loading, error and not-found states, and any significant view states such as empty, error, pending, and success.
- Map each route to its page, layout, shared shell, navigation, data dependencies, and the significant UI components it uses.
- Inventory shared layouts, navigation, forms, dialogs, tables, cards, status displays, and design primitives.
- Identify the existing design language: typography, color, spacing, radii, borders, shadows, motion, iconography, content voice, and responsive behavior.
- Understand the component architecture, styling approach, state management, and how the UI interacts with Server Actions and the database boundary.
- Review the findings register and relevant prior audit, refactor, verification, and design records; state what was reviewed.
- Render the application in a real browser and capture screenshots when the environment supports it. Do not rely only on source inspection for visual judgments.

Write a complete frontend inventory with the route-to-view-to-layout-to-components mapping and note which views are authenticated or privileged.

### 2. Phase 2 — Audit and Plan

Evaluate the current frontend using the principles and design guidance from `frontend-design`.

- Assess each view for visual hierarchy, layout, typography, spacing, color use, contrast, responsive behavior, interaction clarity, state communication, content quality, accessibility, and consistency.
- Identify the common generic-design tells described by the skill, including templated card grids, undifferentiated type, decorative eyebrows, arbitrary numbered markers, default shadows, and motion that does not communicate change.
- Distinguish **global design-system issues**, **shared component issues**, and **view-specific issues**.
- Separate confirmed observations from subjective judgments. A finding should state the view, evidence, impact, and recommended improvement.
- Route material defects, inconsistencies, or risks through the Software Audit Workflow and give them `FND-NNN` entries in the findings register. Keep purely aesthetic improvement opportunities in the campaign plan rather than inflating them into defects.
- Establish a prioritized improvement plan based on impact and consistency, ordered so shared foundations are fixed before dependent views.
- Produce a compact design plan before implementation: 4-6 named palette values with roles; typefaces and roles; a layout concept with alignment guidance; and the principles that make this product's interface specific to its subject rather than a generic template.
- Review the design plan against the brief and revise anything that reads as a generic default before writing code.

Record the audit, design plan, prioritized view order, acceptance criteria, risks, and stop conditions in an execution plan under `docs/methodology/exec-plans/`, or in a concise campaign record for small work. Keep the plan `Proposed` until the human approves it.

### 3. Phase 3 — Improvement

Work through the identified views sequentially, one at a time. Do not skip ahead or improve several views in parallel.

At the start of the phase, the human approves the campaign scope and plan. Once approved, implement visual, layout, typographic, and component-level decisions autonomously within that scope. Do not interrupt for approval between views unless a human decision gate is triggered.

For each view:

1. **Examine the current state.** Read the implementation and render the view in a browser. Capture the current appearance and identify its states and breakpoints.
2. **Identify the most important improvements.** Focus on meaningful hierarchy, clarity, usability, accessibility, and design-system coherence rather than superficial restyling.
3. **Apply `frontend-design`.** Revisit the design plan, choose the strongest treatment for this view's real content, and review the proposal against the brief before coding.
4. **Implement directly in the application.** Preserve existing functionality, routes, Server Actions, data contracts, authorization, and architectural conventions. Avoid unnecessary rewrites and unrelated changes.
5. **Review the result.** Check the rendered interface at relevant viewport sizes, with keyboard navigation, focus states, reduced motion, realistic content, and error/empty states. Take screenshots and critique the work against the design plan.
6. **Mark the view complete.** Record what changed, any evidence captured, and any deferred issue in the campaign ledger before proceeding to the next view.

If a change belongs in a shared component or design token, fix it centrally and recheck already-completed views for regressions. Do not fork the same visual rule across views or create view-specific variants of a shared primitive without a documented reason.

### 4. Phase 4 — Consistency Review

After all views are improved, review the application as a whole.

- Compare typography, spacing, color, borders, radii, shadows, surfaces, iconography, control sizing, and motion across every view.
- Check navigation, page headers, forms, validation, dialogs, tables, cards, empty states, errors, and status communication for consistent patterns and vocabulary.
- Verify that shared components and tokens form one coherent visual system and that no view has drifted into a local variant.
- Revisit every view at the common responsive breakpoints.
- Fix inconsistencies introduced or discovered during individual view work, then recheck the affected views.
- Update the design plan or shared tokens rather than leaving undocumented exceptions.

### 5. Phase 5 — Validation

Verify the improved frontend and confirm that functionality has not been compromised.

- Inspect `package.json` and use the repository's existing scripts. The documented checks are `bun run lint`, `bun run typecheck`, `bun run build`, and `bun run test`.
- Run the relevant browser, end-to-end, and accessibility checks where configured. Verify keyboard focus, reduced motion, contrast, responsive layouts, loading, empty, error, and success states.
- Check for visual regressions, broken interactions, console errors, layout overflow, inaccessible controls, and unintended changes to routes or user flows.
- If a view change touches server-side behavior, run the relevant integration or database-backed checks; distinguish mocked checks from real database evidence.
- Do not run destructive database commands without explicit human authorization.
- Record observed commands, environments, and results in a dated verification record for consequential claims. Failed or unavailable checks are recorded as failed or unverified, never reported as passed.

### 6. Phase 6 — Final Report

Produce a concise report containing:

- Views audited and improved.
- Main design-system improvements.
- Important component and architectural changes.
- Validation performed and what it does and does not prove.
- Remaining issues, deferred views, assumptions, and recommendations.

Update the issue, execution plan, campaign ledger, verification record, findings register, and AI transparency log as applicable. Add a changelog entry only when a notable change is being prepared for release, following the repository's release rules. Never overwrite, rename, move, or delete a historical record.

## Human Decision Gates

The human approves the campaign scope, the ordered view list, acceptance criteria, material design direction, and the plan before implementation begins. After that approval, visual and component-level decisions inside the approved scope are delegated to the implementation agent, and the workflow continues between views without further approval.

Stop and ask before:

- Adding a dependency, font license, external asset source, or build/tooling change.
- Changing architecture, shared module boundaries, routing, data contracts, authentication, authorization, RLS, grants, privacy behavior, or persisted meaning.
- Changing product behavior, business rules, user-visible outcomes, or copy in a way that changes meaning rather than clarity.
- Expanding the approved view list or scope, reopening completed work, or accepting a material residual risk.
- Resolving a conflict with a documented invariant or a prior decision by changing the rule.
- Performing a commit, push, pull request update, merge, tag, release, deployment, or any gated external operation.

If a view reveals a required change outside the approved scope, pause that view, present the evidence and options, and wait. Do not silently convert a visual improvement into a feature, fix, or architectural change.

## Workflow Principles

- **Design authority:** `frontend-design` governs aesthetic and interaction decisions throughout; consult it rather than defaulting to generic patterns.
- **Subject over template:** make choices specific to this football tournament product, its audience, and its real content; reject choices that would suit any dashboard.
- **Systematic, one view at a time:** finish, review, and mark each view complete before starting the next.
- **Meaningful improvement:** prioritize hierarchy, clarity, usability, accessibility, and coherence over cosmetic restyling.
- **Consistency:** shared typography, spacing, color, components, and interaction patterns form one visual system.
- **Preserved functionality:** existing behavior, domain rules, data flows, authorization, routes, and architecture remain intact unless a human approves a change.
- **Quality floor:** responsive down to mobile, visible keyboard focus, reduced-motion support, accessible contrast, and clear empty, error, and success states.
- **Real evidence:** use browser rendering and screenshots when available; never invent visual or test results.
- **Centralized fixes:** change shared tokens and components once, then revalidate dependent views.
- **Bounded scope:** do not expand into backend, infrastructure, or unrelated refactoring.
- **Review separation:** the implementer does not independently verify its own consequential work.
- **Traceability and records:** keep the campaign plan, completion ledger, validation evidence, findings, and report linked and permanent.
- **No silent exceptions:** document deliberate deviations from the design system and resolve them in the consistency review.

## Expected Outcome

A cohesive, distinctive, accessible, and responsive frontend across every user-facing view, implemented and validated with preserved functionality and architecture. The result includes an approved design direction, a completed view-by-view improvement ledger, observed validation evidence, and a concise report of remaining issues and recommendations.
