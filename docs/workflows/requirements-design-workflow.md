# Requirements & Design Workflow

## Overview

The Requirements & Design Workflow turns an idea, problem, or request into a clear and bounded engineering proposal. It establishes who needs the change, what outcome is expected, which behavior is required, what is explicitly excluded, and which design constraints must guide implementation. It does not authorize implementation by itself.

## Roles

- **Human Developer — Decision Owner:** approves product intent, priorities, scope, acceptance criteria, and consequential design choices.
- **Product & Requirements Analyst:** investigates the problem, users, workflows, domain rules, assumptions, and edge cases.
- **Software Architect:** evaluates system boundaries, data ownership, quality characteristics, and technical alternatives.
- **Orchestrator:** consolidates evidence, exposes conflicts, prepares the proposal, and requests decisions.

## Workflow Stages

1. **Intake:** Capture the request as an issue using the repository's type and issue format. Use `Task` for process, tooling, or documentation work; use a claim type for product work. Review the findings register and relevant prior records, and state what was reviewed. Identify the affected actor and the problem or opportunity.
2. **Discovery:** Inspect current behavior and documentation. Identify user needs, domain rules, constraints, evidence, unknowns, edge cases, and explicit non-goals. Separate facts from assumptions.
3. **Requirements:** Define a thin end-to-end outcome, observable acceptance criteria, failure behavior, data/privacy implications, and relevant invariants. Resolve ambiguity with the human; do not invent business rules.
4. **Design:** Compare viable implementation options and their consequences. Identify affected modules, database objects, interfaces, tests, operational concerns, and architecture decisions. Prepare an ADR when a significant decision is proposed.
5. **Approval & Handoff:** Present the requirements, scope, non-goals, design recommendation, risks, and verification approach. After human approval, hand the bounded work to Development with links to the issue, prior records, approved design, and execution plan where required.

## Human Decision Gates

Human approval is required for product behavior, domain rules, user-visible outcomes, priorities, scope, non-goals, acceptance criteria, data/privacy rules, module boundaries, schemas, significant implementation alternatives, and any ADR. An unresolved ambiguity blocks the affected specification; agents must not choose silently.

## Workflow Principles

- **Problem before solution:** establish the user need before choosing implementation details.
- **Evidence before claims:** distinguish observed behavior, reported pain, assumptions, and desired outcomes.
- **Thin end-to-end scope:** prefer a small complete increment over speculative infrastructure or broad feature bundles.
- **Explicit acceptance:** criteria must be observable and verifiable.
- **Domain integrity:** preserve approved business rules and identify conflicts rather than bypassing them.
- **Traceability:** link requirements, decisions, issues, plans, implementation, and verification.
- **Prior records:** review the findings register and relevant records before proposing; link duplicates and recurrences instead of restating them.
- **Human ownership:** AI analysis and recommendations never constitute product approval.

## Expected Outcome

An approved, testable, and traceable definition of the problem and intended change, with clear scope, acceptance criteria, constraints, design rationale, non-goals, and verification expectations.
