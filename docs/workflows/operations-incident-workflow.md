# Operations & Incident Management Workflow

## Overview

The Operations & Incident Management Workflow governs release readiness, authorized deployment, operational monitoring, incident response, recovery, and post-incident learning. It ensures that production changes are deliberate, observable, recoverable, and connected to the development backlog. Local or CI success must never be presented as production evidence.

## Roles

- **Human Developer — Decision Owner:** authorizes releases, deployments, production changes, recovery actions, and acceptance of residual risk.
- **Release & Operations Verifier:** checks release prerequisites, migration/configuration risks, monitoring, and rollback or recovery readiness.
- **Incident Responder:** coordinates triage, evidence collection, containment recommendations, root-cause investigation, and follow-up work.
- **Security & Privacy Reviewer:** participates in incidents involving access control, sensitive data, credentials, privacy, or vulnerabilities.
- **Implementation Agent / Test Engineer:** deliver and verify approved corrective changes through Development and Testing.
- **Orchestrator:** maintains coordination, status, and human decision requests.

## Workflow Stages

1. **Release Readiness:** Check the approved scope, CI results, relevant tests, environment configuration, secrets handling, migration order and compatibility, data backup/recovery assumptions, monitoring, and rollback plan. Identify what has only been tested locally versus in the target environment.
2. **Release Approval:** Present the readiness evidence, unresolved risks, deployment steps, expected impact, and recovery procedure. Wait for explicit human authorization before release, deployment, migration, or production changes.
3. **Deploy & Verify:** Execute only the approved deployment steps. Verify health, critical user journeys, database connectivity, and relevant invariants in the target environment. Record observed results; stop and escalate if behavior differs from the approved expectation.
4. **Operate & Monitor:** Observe errors, latency, availability, database behavior, capacity, failed transactions, security signals, and user-impact indicators appropriate to the system. Record operational evidence and distinguish actual incidents from anomalies or hypotheses.
5. **Incident Triage & Response:** Establish scope, user impact, start time, affected services/data, severity, and available evidence. Review the findings register and prior incident reports for related or recurrent incidents. Recommend containment and recovery options. Obtain human authorization before actions that are destructive, externally visible, affect data, change permissions, or alter production state.
6. **Recovery & Learning:** Verify service restoration and data integrity. Write a dated incident report to `docs/methodology/incidents/` using the incident template, register findings in the findings register, and prepare a remediation record for approved corrective work. Include the timeline, impact, root cause or contributing factors, detection gaps, recovery actions, related or recurrent incidents, and follow-up recommendations. Route approved corrective work into Enter on the Development board.

## Human Decision Gates

The human explicitly authorizes production releases, deployments, migrations, rollbacks, permission changes, data repair, service shutdown, external communications, and other consequential operational actions. Agents may gather evidence and recommend urgent mitigations but must not act beyond previously approved emergency procedures. Acceptance of residual risk and closure of a material incident require human review.

## Workflow Principles

- **Release discipline:** every release has an identified scope, verification record, and recovery approach.
- **Environment honesty:** local, CI, staging, and production evidence are distinct.
- **Observability:** operational claims are supported by recorded signals and time-bounded observations.
- **Data protection:** prioritize integrity, confidentiality, least privilege, and safe recovery.
- **Least destructive response:** prefer reversible containment and preserve evidence where feasible.
- **Incident learning:** identify system and process contributors rather than assigning blame.
- **Permanent records:** preserve the dated incident, remediation, and verification records; never overwrite them. Corrections are dated addenda.
- **Recurrence check:** link related or recurrent incidents and findings instead of treating them as new.
- **Backlog feedback:** corrective actions become traceable issues and follow the normal Development workflow.
- **Human authorization:** agents do not independently deploy, roll back, repair production data, or accept operational risk.

## Expected Outcome

A controlled release and operations process that protects users and data, responds systematically to incidents, verifies recovery, and turns operational evidence into prioritized engineering improvements.
