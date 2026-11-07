# MatchPulse Engineering Workflows

## Purpose

This folder defines the operating contracts for an iterative, human-governed, agent-assisted software engineering process. The workflows are complementary: some define how work enters and moves through the lifecycle; others coordinate agents or provide cross-cutting quality, recordkeeping, and operational controls.

The human developer remains the sole decision owner. An AI recommendation is not an approval, and a completed agent task is not accepted until the required human decisions and evidence are recorded.

## Repository Integration

The root [`AGENTS.md`](../../AGENTS.md) is the entry point and routes procedural detail to this folder. Do not create a second root agent-instructions file. These workflows supplement, and do not replace, the existing `docs/architecture/` and `docs/methodology/` content.

Historical records are indexed in [`docs/methodology/README.md`](../methodology/README.md). The change history is in [`CHANGELOG.md`](../../CHANGELOG.md).

## Workflow Index

| File | Responsibility | Type |
|---|---|---|
| [`requirements-design-workflow.md`](requirements-design-workflow.md) | Turn an idea or request into clear, approved requirements and design constraints. | Upstream workflow |
| [`development-workflow.md`](development-workflow.md) | Manage work through the four Kanban stages: Enter, Build, Review Queue, Release & Learn. | Lifecycle workflow |
| [`agentic-execution-workflow.md`](agentic-execution-workflow.md) | Coordinate specialist agents and bounded execution under human authority. | Coordination workflow |
| [`testing-verification-workflow.md`](testing-verification-workflow.md) | Establish and collect evidence that requirements, behavior, and invariants are satisfied. | Cross-cutting workflow |
| [`software-audit-workflow.md`](software-audit-workflow.md) | Find, classify, document, and route defects, inconsistencies, risks, and remediation. | Assessment workflow |
| [`software-refactoring-workflow.md`](software-refactoring-workflow.md) | Improve internal structure while preserving observable behavior. | Improvement workflow |
| [`operations-incident-workflow.md`](operations-incident-workflow.md) | Establish release readiness, monitor operations, respond to incidents, and learn. | Downstream workflow |
| [`recordkeeping-traceability-workflow.md`](recordkeeping-traceability-workflow.md) | Preserve permanent records, track findings, detect duplicates and recurrence, and prevent loops. | Cross-cutting workflow |

## How They Fit Together

```text
Requirements & Design
        |
        v
Development: Enter -> Build -> Review Queue -> Release & Learn
                   ^             |                  |
                   |             v                  v
             Audit / Refactor  Testing &        Operations /
             findings         Verification     Incident Management
                   |                                |
                   +-------- feedback --------------+

Recordkeeping & Traceability applies to every workflow.
Agentic Execution coordinates approved tasks across the workflows.
Human approval gates apply at every consequential decision.
```

Development is the source of truth for the Kanban lifecycle. Agentic Execution does not create a parallel board or replace the workflow owners. Testing, security, privacy, recordkeeping, and traceability apply throughout the lifecycle. Audit and Refactoring do not bypass Development: their approved remediation work is represented by issues and pull requests. Operational findings return to **Enter** as new or updated work.

## Shared Structure and Rules

Every workflow document uses the same core sections: **Overview**, **Roles**, **Workflow Stages**, **Human Decision Gates**, **Workflow Principles**, and **Expected Outcome**. The Recordkeeping & Traceability Workflow adds an **Anti-Loop Rules** section.

### Human Decision Authority

- The human approves requirements, scope, priorities, architectural and security decisions, quality thresholds, material plans, residual risk, and release/deployment actions.
- Agents investigate and recommend. They execute only within explicitly approved scope.
- Silence, ambiguity, previous recommendations, and lack of objection never count as approval.
- A changed requirement, material risk, new dependency, architectural choice, migration decision, or scope expansion stops the affected work until the human decides.
- Reopening completed work, expanding an approved scope, or starting a new improvement campaign requires explicit human approval and a link to the prior record.
- Agents must not approve or independently verify their own work. If separate agents are unavailable, sequential role passes must be disclosed as such.

### Recordkeeping and Traceability

Records are permanent and append-only. Never overwrite, rename, move, or delete a historical record. Corrections are dated addenda; superseded records keep the original and link forward.

| Record | Location | Naming |
|---|---|---|
| Execution plans | `docs/methodology/exec-plans/` | `<issue>-<slug>.md` |
| Audit reports | `docs/methodology/audits/` | `<YYYY-MM-DD>-<issue>-<slug>.md` |
| Refactor assessments | `docs/methodology/refactors/` | `<YYYY-MM-DD>-<issue>-<slug>.md` |
| Incident reports | `docs/methodology/incidents/` | `<YYYY-MM-DD>-<slug>.md` |
| Remediation records | `docs/methodology/remediation/` | `<YYYY-MM-DD>-<issue>-<slug>.md` |
| Verification records | `docs/methodology/verification/` | `<YYYY-MM-DD>-<issue>-<slug>.md` |
| ADRs | `docs/architecture/adr/` | Existing `NNN-<slug>.md` |
| AI transparency log | `docs/methodology/ai-transparency-log.md` | Append-only `## Entry N` |
| Findings register | `docs/methodology/findings-register.md` | `FND-NNN`, never reused |
| Changelog | `CHANGELOG.md` | One row per merged PR |

The recordkeeping workflow defines the full rules. Before proposing new work, review the findings register and the relevant records; state what was reviewed in the issue, plan, or PR. Every finding gets a register ID, a lifecycle entry, and links to its issue, sub-issues, PR, remediation, and verification. Duplicates and recurrences are linked, never deleted.

### Common Templates

- [`templates/execution-plan-template.md`](templates/execution-plan-template.md)
- [`templates/audit-report-template.md`](templates/audit-report-template.md)
- [`templates/refactor-assessment-template.md`](templates/refactor-assessment-template.md)
- [`templates/incident-report-template.md`](templates/incident-report-template.md)
- [`templates/ai-transparency-entry-template.md`](templates/ai-transparency-entry-template.md)
- [`templates/remediation-plan-template.md`](templates/remediation-plan-template.md)
- [`templates/verification-record-template.md`](templates/verification-record-template.md)

Use the existing repository's issue forms, ADR format, and AI transparency log where they already define a contract. These templates supplement rather than silently replace them.

## Operating Notes

1. Read the root [`AGENTS.md`](../../AGENTS.md) and relevant architecture/domain documentation before acting.
2. Choose the workflow appropriate to the requested work; not every task needs every role or document.
3. Prepare a formal execution plan for substantial or high-risk work and wait for human approval.
4. Move work through the four Kanban columns according to actual evidence; do not skip review or release gates.
5. Record only observed evidence. Mark unavailable checks as unverified, not passed.
6. Add the changelog row and the AI transparency entry in the same pull request as the change.
7. Keep workflows brief and update them only through a human-approved methodology change.
