# Software Audit Workflow

## Overview

The Software Audit Workflow examines the software product to identify defects, inconsistencies, design mistakes, architectural weaknesses, security and privacy risks, and other quality problems. Every finding is supported by evidence, classified by severity, and paired with remediation recommendations. The audit itself is read-only; approved fixes are delivered through the Development Workflow.

## Roles

- **Human Developer — Decision Owner:** approves audit scope, remediation priorities, accepted risks, and decisions not to fix a finding.
- **Audit Agent:** inspects the agreed baseline, identifies and documents findings, and proposes remediation options. It does not modify code, tests, issues, or pull requests during the audit.
- **Audit Planner:** validates findings against current code, removes duplicates/stale items, identifies root causes, compares remediation options, and prepares a traceable remediation plan.
- **Implementation Agent:** fixes approved findings through normal Development stages.
- **Test Engineer:** creates regression and invariant tests for approved fixes.
- **Audit Verifier:** independently checks that the finding is resolved and no unacceptable regression was introduced.
- **Orchestrator:** coordinates the audit, decision gates, and traceability.

## Workflow Stages

1. **Audit Scope & Baseline:** Agree the system area, commit or environment, audit objectives, constraints, and exclusions. Review the findings register and prior audit, refactor, and incident records; record what was reviewed. Inspect implementation, configuration, migrations, tests, and relevant documentation without modifying them.
2. **Finding Identification:** Examine correctness, domain invariants, error handling, consistency, data integrity, concurrency, security, privacy, architecture, code quality, performance, and operational assumptions as relevant to scope. Separate confirmed defects from potential risks and optional improvements.
3. **Classification & Reporting:** Record each finding with a unique ID, title, severity, affected area/location, description, evidence, impact, reproduction or verification method, remediation options, recommended action, and status. Write the dated report to `docs/methodology/audits/` using the audit template, assign a `FND-NNN` register ID to every finding, and add it to the findings register.
4. **Remediation Planning:** The Audit Planner verifies each finding against current code, deduplicates it against the findings register, identifies recurrence, identifies root cause, compares feasible fixes, and links it to proposed issue/sub-issue work, a remediation record, and verification criteria.
5. **Human Triage & Approval:** The human accepts, prioritizes, defers, rejects, or requests more evidence for findings and approves the remediation scope. No code changes or issue creation based on the audit proceed without required authorization.
6. **Remediation & Verification:** Approved work moves through Development and Testing. The Audit Verifier independently checks the fix, its regression evidence, and the impact on the original finding. Findings become Verified only when a dated verification record supports closure, and the closure is recorded in the report, the remediation record, and the findings register.

## Finding Severity

- **Critical:** immediate or severe threat to core functionality, data integrity, security, privacy, or essential business invariants.
- **Major:** substantial defect or weakness affecting important functionality, reliability, architecture, security, or product quality.
- **Minor:** limited defect, inconsistency, or maintainability problem with contained impact.
- **Informational:** observation, non-urgent improvement, or recommendation without a confirmed immediate defect.

Severity describes impact, not implementation effort. Do not inflate or downgrade severity to influence prioritization.

## Human Decision Gates

The human approves audit scope where it affects sensitive systems, finding priorities, remediation options that alter behavior/architecture/data, security and privacy trade-offs, residual risk, and any `Won't Fix` or equivalent disposition. Critical findings must be escalated promptly, but agents still cannot authorize destructive containment or production changes. An audit recommendation is not permission to implement it.

## Workflow Principles

- **Read-only assessment:** the Audit Agent observes and records; it does not fix what it finds.
- **Evidence-based findings:** include reproducible evidence or label the finding as a hypothesis requiring confirmation.
- **Actionable remediation:** explain root cause, impact, and at least one recommended remedy; compare alternatives for consequential findings.
- **Severity discipline:** classify by impact and likelihood using project context, not personal preference.
- **Traceability:** link findings to source evidence, issues, plans, PRs, tests, and verification.
- **Permanent records:** write the dated report to `docs/methodology/audits/`; never overwrite or discard it. Corrections are dated addenda.
- **Duplicate and recurrence:** check the findings register before reporting; link related, duplicate, or recurrent findings instead of creating unrelated entries.
- **Independent closure:** the person/agent that implements a fix does not mark its own finding Verified.
- **No audit/refactor confusion:** defects and behavior changes go through remediation; behavior-neutral structural improvements go through Refactoring.

## Expected Outcome

A prioritized, evidence-backed audit report and approved remediation plan, followed by independently verified closure or an explicit human decision to defer or accept a finding.
