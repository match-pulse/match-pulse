# Recordkeeping & Traceability Workflow

## Overview

The Recordkeeping & Traceability Workflow preserves the permanent engineering record and keeps it usable. It applies to every other workflow. Its purpose is to make each decision, finding, change, verification, and outcome traceable, to prevent duplicate or conflicting work, and to stop repeated fix–revert–refactor cycles.

Records are append-only. A historical record is never overwritten, renamed, moved, or deleted. Corrections and supersessions are dated addenda that link back to the original.

## Roles

- **Human Developer — Decision Owner:** approves reopening completed work, scope expansion, new improvement campaigns, accepted risks, and any deletion or rewrite of a record.
- **Orchestrator:** owns the record index, the findings register, and the traceability chain; verifies that links resolve before handoff.
- **Audit Agent / Refactor Assessor / Incident Responder:** produce the dated source record and the finding entries.
- **Implementation Agent:** adds the changelog row, AI transparency entry, and links; does not verify its own record.
- **Test Engineer:** produces verification records and preserves failed and unverified results.
- **Code Reviewer:** checks that the records match the diff and that no historical record was silently changed.

## Workflow Stages

1. **Pre-work record review:** Search [`findings-register.md`](../methodology/findings-register.md), the relevant dated records, open issues, and open pull requests. Record what was reviewed and what was found in the issue, execution plan, or PR. Do not propose work that duplicates an open or recently closed item without linking it.
2. **Record creation:** Create the issue first, using `Task` for process, tooling, or documentation work, or the appropriate claim type for product work. Add the execution plan when required. Assign a `FND-NNN` identifier to every finding before remediation starts.
3. **Records during execution:** Write dated records as work happens. Use the templates. Keep the source record, the findings register, the issue, and the PR linked. When a correction is needed, append a dated addendum; never rewrite the original.
4. **Closure and verification:** A finding becomes `Verified` only when a verification record supports closure. The implementer does not verify its own work. Record remediation, verification, residual risk, and any human decision to defer or accept it.
5. **Index and changelog:** Add the `CHANGELOG.md` row and the AI transparency entry in the same pull request as the change. Update the findings register lifecycle log. The PR must link its issue, records, and verification.
6. **Consistency review:** Periodically check for duplicates, recurrences, stale findings, broken links, missing verification, and superseded records. Add findings for the records themselves rather than repairing history silently.

## Human Decision Gates

Human approval is required to:

- Reopen a closed finding, issue, pull request, or campaign.
- Expand an approved scope or start a new improvement campaign.
- Accept residual risk or defer a material finding.
- Delete, rewrite, rename, or move a historical record.
- Resolve a conflict between two open changes that affect the same invariant, contract, or area.

Approval must link the prior record and state the new bounded scope. Silence is not approval.

## Anti-Loop Rules

- **Two reversals stop the work.** Two reversals in the same area within 30 days, or within one campaign, require a root-cause record and an explicit human decision before further change.
- **No conflicting changes.** Before starting, compare open issues and pull requests that touch the same invariant, contract, module, or area. If they conflict, stop and escalate; do not merge both.
- **One active increment or campaign.** Preserve the existing WIP = 1 convention. A new campaign starts only after the previous one is closed, deferred, or cancelled by the human.
- **Link, do not repeat.** A recurrence is linked to the original finding, with the new evidence. It is not opened as an unrelated issue.
- **Record the decision.** Every exception, deferral, and reversal decision is dated and linked to the affected records.

## Workflow Principles

- **Permanent record:** records outlive the task and are never silently changed.
- **Single identity:** one `FND-NNN` per finding, never reused.
- **Evidence over assertion:** link commands, outputs, commits, and review evidence.
- **Separation of duties:** the implementer cannot verify its own work or close its own finding.
- **Proportionality:** record what the claim requires; do not create ceremony that adds no evidence.
- **Human authority:** agents maintain records and recommend; the human decides.

## Expected Outcome

A complete, durable, and searchable engineering record in which every change and finding can be traced from issue to evidence, duplicates and recurrences are visible, and repeated or conflicting changes are stopped before they become loops.
