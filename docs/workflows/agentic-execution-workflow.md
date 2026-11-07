# Agentic Execution Workflow

## Overview

The Agentic Execution Workflow coordinates specialized AI agents to carry out approved engineering work. It defines how agents are selected, assigned bounded responsibilities, exchange findings, execute tasks, and report evidence. It is a coordination workflow, not a separate product backlog or decision authority.

## Roles

- **Human Developer — Decision Owner:** approves the objective, scope, execution plan, consequential decisions, and final acceptance.
- **Orchestrator:** coordinates the task, assigns roles, manages dependencies, detects disagreements, and presents decisions to the human.
- **Product & Requirements Analyst:** clarifies expected behavior and acceptance criteria.
- **Software Architect:** evaluates structural and architectural consequences.
- **Implementation Agent:** changes code only within approved boundaries.
- **Test Engineer:** verifies behavior and domain invariants.
- **Code Reviewer:** independently reviews the change.
- **Security & Privacy Reviewer:** examines relevant trust boundaries and data exposure.
- **Release & Operations Verifier:** evaluates delivery and operational readiness.

## Workflow Stages

1. **Read-only Preflight:** The Orchestrator reads applicable instructions, repository status, documentation, relevant source, migrations, tests, and current issue/PR context. It reviews the findings register and relevant dated records, identifies prior or duplicate work, and records what was reviewed. It identifies scope, non-goals, dependencies, risks, and decisions. No files are changed.
2. **Analysis & Planning:** Relevant specialist roles investigate in bounded scopes. The Orchestrator consolidates evidence, checks for duplicate or conflicting work, marks uncertainties, compares options, and prepares a plan with acceptance criteria, tasks, owners, verification, risks, and stop conditions. The plan links the prior records reviewed.
3. **Human Approval:** The plan and all unresolved decisions are presented to the human. Work requiring a formal plan remains blocked until it is explicitly approved. Approval applies only to the stated scope.
4. **Controlled Execution:** The Implementation Agent performs small, reviewable changes. Other agents may investigate in parallel only when their scopes do not overlap. Only one implementation agent writes to a given file or workstream at a time. A new decision, conflicting requirement, unexpected migration, or material scope/risk change stops the affected work.
5. **Independent Verification:** The Test Engineer, Code Reviewer, and applicable specialists examine the result. Findings are consolidated as confirmed defects, potential defects, failed checks, unverified claims, or residual risks. Verification evidence is preserved in the PR and, for critical claims, in a dated verification record. The implementer does not independently verify its own work.
6. **Evidence & Handoff:** The Orchestrator reviews the full diff, records actual checks and limitations, updates approved plans and transparency records, adds the changelog row, updates the findings register, links the issue/PR, and reports what changed and what remains for the human. Records are append-only; corrections are dated addenda. It does not start an unrequested next task.

## Human Decision Gates

The human approves requirements, plans, priority, scope changes, architectural and technical alternatives that are not already settled, dependencies, data/schema/security decisions, quality thresholds, material residual risk, and final acceptance. Commits, pushes, PR creation or updates, merges, releases, deployments, and destructive operations require explicit authorization. If a decision is not specified by an approved rule or plan, ask and wait.

## Workflow Principles

- **Bounded autonomy:** agents work only within explicit responsibilities and approved scope.
- **Role clarity:** each task has an owner, inputs, expected output, and boundary.
- **Evidence exchange:** agents share findings with source references, affected areas, and confidence/limitations.
- **No false independence:** sequential role passes are not represented as independent agents or reviews.
- **Single-writer discipline:** avoid concurrent writes to the same files or workstream.
- **Failure transparency:** do not hide failed tests, conflicts, uncertainty, or incomplete work.
- **Record permanence:** preserve dated plans, evidence, and decisions; never overwrite or silently discard a record.
- **No duplicate work:** check the findings register and prior records before proposing; link duplicates and recurrences instead of reopening them as new work.
- **Human authority:** agents may recommend and execute approved work but cannot approve themselves.

## Expected Outcome

A coordinated, transparent, and verifiable execution process in which specialist agents contribute bounded work while the human retains control over consequential decisions and final acceptance.
