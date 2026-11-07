# Testing & Verification Workflow

## Overview

The Testing & Verification Workflow establishes evidence that an implementation satisfies approved requirements, preserves domain invariants, and behaves correctly under relevant boundary, failure, and concurrency conditions. Testing is continuous and cross-cutting; it is not postponed until the end of development.

## Roles

- **Human Developer — Decision Owner:** approves acceptance criteria, risk thresholds, and acceptance of unresolved risks.
- **Test Engineer:** translates requirements and invariants into test cases, selects test levels, executes checks, and reports gaps.
- **Implementation Agent:** adds or updates tests within the approved scope and fixes verified defects.
- **Code Reviewer:** checks whether the tests actually exercise the changed behavior and whether claims match evidence.
- **Security & Privacy Reviewer:** verifies relevant authentication, authorization, RLS, grants, and data-handling boundaries.
- **Orchestrator:** coordinates evidence and escalates failures or decisions.

## Workflow Stages

1. **Verification Planning:** Map each acceptance criterion and relevant domain invariant to a verification method. Review prior verification records and the findings register for existing evidence, duplicates, and regressions. Identify affected components, database behavior, trust boundaries, concurrency/failure modes, required test data, and environment constraints before implementation where risk is high.
2. **Test Design:** Select appropriate unit, component, integration, database-invariant, end-to-end, security, accessibility, performance, or operational checks. Include negative cases, retries, concurrency, boundary conditions, and regression cases where relevant.
3. **Execution:** Run the relevant checks using the repository's existing scripts and controlled environment. Tests must not rely on external services or production data unless specifically approved. Protect local data; destructive database resets require explicit authorization. Record the exact command, environment, and observed output. For critical claims, concurrency, security, migrations, or invariant evidence, create a dated verification record in `docs/methodology/verification/`.
4. **Evidence Assessment:** Compare actual results with acceptance criteria. Identify passed, failed, skipped, blocked, and unverified checks. Distinguish mocks from real database/integration evidence and distinguish build success from behavioral proof. Preserve failed and unverified results; never record an unrun check as passed.
5. **Regression & Handoff:** Ensure each confirmed defect fix has a regression guard where feasible. Review coverage gaps and report remaining risks. Link the verification evidence, findings register update, and changelog row before handoff. Return failures to Build; return approved residual-risk or quality-threshold decisions to the human.

## Human Decision Gates

The human approves acceptance criteria, required quality thresholds, new testing tools or dependencies, use of production/sensitive data, destructive test setup, changes that weaken existing checks, and acceptance of residual risk. Agents must never delete, weaken, skip, or rewrite a test merely to obtain a passing result. A test strategy change that materially reduces assurance requires approval.

## Workflow Principles

- **Requirement-linked:** every important test supports an explicit requirement, invariant, or risk.
- **Risk-based:** prioritize business-critical transactions, points accounting, market lifecycle, capacity, concurrency, authorization, and privacy.
- **Layer-appropriate:** test critical rules at the authoritative layer, especially PostgreSQL for database-enforced invariants.
- **Reproducible:** record test data, commands, environment, and observed results; do not claim unrun checks.
- **Meaningful coverage:** coverage percentages do not prove a behavior unless the relevant path and assertion are exercised.
- **Regression protection:** preserve a failing-before/passing-after test for fixes when feasible.
- **Continuous verification:** run focused checks during Build and full relevant checks before integration.
- **Permanent evidence:** preserve commands, environment, results, and limitations; never overwrite a verification record.

## Expected Outcome

A reliable body of test evidence showing which approved behaviors and invariants were verified, how they were verified, and which limitations or risks remain.
