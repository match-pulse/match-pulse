# Development Workflow

## Overview

The Development Workflow manages software work from intake to accepted delivery using the project's four-stage Kanban board. Issues represent objectives; sub-issues decompose work only when they describe independently reviewable deliverables. Pull requests provide the review and integration boundary. The board reflects actual progress and does not replace human approval.

## Roles

- **Human Developer — Decision Owner:** approves priorities, scope, requirements, material changes, and final acceptance.
- **Orchestrator:** coordinates the work item, dependencies, role assignments, and handoffs.
- **Product & Requirements Analyst:** ensures the issue has a clear goal, scope, and observable Done-when criteria.
- **Implementation Agent:** implements the approved scope in a focused branch.
- **Test Engineer:** defines and executes relevant verification.
- **Code Reviewer:** reviews the complete proposed change and reports actionable findings.
- **Security & Privacy Reviewer / Release & Operations Verifier:** participate when the change affects their respective areas.

## Workflow Stages

1. **Enter (Backlog & Claims):** Ideas, requests, and issues enter the workflow. Every task starts as an issue. Use `Task` for process, tooling, or documentation work; use a Problem Claim, Behaviour Claim, Outcome Claim, or ADR for product work. Document the goal, scope, and observable completion conditions; review the findings register and relevant prior records; identify dependencies and unknowns; and prioritize with the human. No implementation begins while the work remains merely an unapproved proposal.
2. **Build (In Progress):** Select approved work, move it to In Progress, and create sub-issues only for coherent deliverables that can be tested and reviewed independently. Check open issues, open pull requests, and prior records for conflicts or recurrence before starting. Prepare a formal execution plan for substantial or high-risk work. Implement one logical task per branch, keep changes atomic, and run relevant checks as work progresses.
3. **Review Queue (PRs):** Submit the authorized pull request for automated checks, tests, code review, and applicable security, architecture, database, or operations review. Add the changelog row and the AI transparency entry in the same pull request, and link the issue, prior records, findings register update, and verification evidence. Address findings within approved scope. Escalate changed requirements, material risks, and design choices. The human performs final acceptance and authorizes merge; a green CI result is evidence, not approval.
4. **Release & Learn (Done):** After authorized integration and any required release/deployment, verify the resulting state, update the issue and documentation, record operational evidence, and capture follow-up work. Done requires the complete record chain: issue, PR, verification, findings register update where applicable, changelog row, and AI transparency entry. Reopening completed work requires explicit human approval and a link to the prior record. Feed incidents, audit findings, and user feedback back into Enter.

## Human Decision Gates

The human approves priority, requirements, acceptance criteria, material scope changes, architectural or security decisions, migrations, new dependencies, and residual risk. Explicit authorization is required for commits, pushes, pull-request creation or updates, merges, releases, deployments, and destructive operations unless the human's current instruction names the operation. A reviewer or CI system cannot replace the human's final decision.

## Workflow Principles

- **Four-stage Kanban:** use only Enter, Build, Review Queue, and Release & Learn as the lifecycle columns.
- **Small work items:** each issue or sub-issue has one coherent objective and observable acceptance criteria.
- **No artificial progress:** update the board to reflect actual state; never skip stages to make work appear complete.
- **Focused delivery:** one logical task per branch and one coherent change per pull request.
- **Review before integration:** automated checks and human review precede authorized merge.
- **Evidence-based completion:** mark Done only when required implementation, reviews, verification, and delivery conditions are satisfied.
- **Traceability:** link issues, sub-issues, branches, commits, pull requests, tests, findings, verification, and relevant decisions.
- **Permanent records:** add the changelog row and AI transparency entry in the pull request; never rewrite a historical record.
- **No loop:** if the same area reverses twice, stop and follow the Recordkeeping & Traceability Workflow before further change.

## Expected Outcome

A visible and controlled delivery process that moves approved work through four Kanban stages into reviewed, verified, and accepted changes while preserving human decision authority.
