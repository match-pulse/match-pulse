# Software Refactoring Workflow

## Overview

The Software Refactoring Workflow improves the internal structure and long-term quality of the codebase without changing its observable behavior, business rules, data meaning, or public contracts. Its goal is to keep code simple, atomic, cohesive, loosely coupled, modular, testable, readable, and maintainable. Refactoring is not feature development and is not a way to hide bug fixes inside structural changes.

## Roles

- **Human Developer — Decision Owner:** approves refactor scope, architectural trade-offs, priorities, and deferred work.
- **Software Architect / Refactor Assessor:** evaluates structure, dependencies, code smells, and measurable quality characteristics; produces a read-only assessment.
- **Refactor Planner:** confirms findings, identifies structural causes, compares options, and prepares an incremental plan.
- **Refactor Implementer:** executes the approved behavior-neutral changes in small, isolated steps.
- **Refactor Verifier:** independently verifies behavioral equivalence, tests, and the intended structural improvement.
- **Code Reviewer:** reviews the diff for accidental behavior changes, unnecessary abstraction, scope expansion, and maintainability regressions.
- **Orchestrator:** coordinates stages and records decisions and evidence.

## Workflow Stages

1. **Structural Assessment:** Inspect the agreed code baseline without modifying it. Review the findings register and prior refactor, audit, and incident records; record what was reviewed. Identify structural friction and assess modularity, coupling, cohesion, separation of concerns, responsibility boundaries, simplicity, atomicity, encapsulation, naming, testability, maintainability, and duplication. Record examples and a baseline; avoid subjective findings without evidence. Write the dated assessment to `docs/methodology/refactors/` using the refactor template.
2. **Refactor Plan:** Validate each finding against the findings register, identify duplicates and recurrence, identify the underlying structural cause, define the intended structural improvement, name affected modules/files, list dependencies, define behavior-equivalence checks, and break the work into small independently verifiable seams. Define a bounded campaign with a stop condition.
3. **Human Approval:** Present the findings, proposed order, alternatives, risks, and verification plan. The human approves the campaign, scope, and any architectural choices before implementation. Reopening a closed campaign requires explicit approval and a link to the prior assessment.
4. **Behavior-Neutral Execution:** Implement one approved seam at a time. Preserve inputs, outputs, side effects, persisted data semantics, error behavior, externally visible interfaces, and business rules. Keep changes atomic and avoid unrelated cleanup.
5. **Equivalence Verification:** Run the existing and added tests, relevant database/invariant checks, type checks, lint, and build as appropriate. Compare behavior before and after using representative fixtures or characterization tests. Preserve the commands, environment, and results in a dated verification record. The Refactor Verifier independently checks the diff and evidence.
6. **Review & Loop Decision:** If behavior is preserved and the intended structural improvement is supported by evidence, report the seam as verified. Reassess only within the approved campaign. Stop at the approved budget or scope boundary and ask before expanding it. Two reversals in the same area within 30 days, or within one campaign, stop the work until a root-cause record and a human decision exist.

## Human Decision Gates

Human approval is required for the refactor campaign and scope, module-boundary changes, public contract or schema changes, new dependencies, architectural pattern changes, altered quality targets, and any residual risk. If the proposed refactor reveals a defect or requires changing behavior, stop and route it through Requirements & Design / Audit / Development as appropriate. Do not silently convert a refactor into a feature or fix.

## Workflow Principles

- **Behavior preservation:** no intended change to observable behavior, business rules, API contracts, persisted meaning, or user outcomes.
- **Simplicity first:** prefer the smallest clear structure; do not replace simple code with patterns, layers, or abstractions without a demonstrated benefit.
- **Atomicity:** keep functions, components, and changes focused on one coherent responsibility.
- **High cohesion and low coupling:** keep related logic together and minimize unnecessary dependencies.
- **Modularity and encapsulation:** make boundaries and ownership explicit; expose only what callers need.
- **Naming clarity:** choose precise names that express domain meaning and intent consistently.
- **Testability and maintainability:** improve isolation, readability, and ease of safe change.
- **No speculative generalization:** abstract only to remove real duplication, isolate a real variation, or encode a real invariant.
- **Equivalence evidence:** passing tests alone may be insufficient; use characterization, regression, and domain-invariant checks appropriate to the change.
- **Permanent records:** preserve the dated assessment and verification evidence; never overwrite them. Corrections are dated addenda.
- **Bounded campaign:** approve a scope, budget, and stop condition before starting; do not expand it silently.
- **No loop:** two reversals in the same area stop the work until a root-cause record and a human decision exist.
- **Separation of duties:** the implementer cannot independently verify its own refactor.

## Expected Outcome

A simpler and more coherent codebase with improved structural qualities and stronger maintainability, supported by evidence that existing observable behavior remains unchanged.
