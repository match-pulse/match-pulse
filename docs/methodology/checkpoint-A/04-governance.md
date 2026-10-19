# MatchPulse — Stakeholder Governance & Escalation

## 1. Stakeholder Matrix

| Actor | Interest | Influence | Decision Right | Exposure |
| :--- | :--- | :--- | :--- | :--- |
| **Tournament Organizer** | Fair play, accurate results, and reliable tournament operations. | High within tournament management. | Manages authorized tournament and match operations. | Disputes over predictions, schedules, or results. |
| **Participant (Fan)** | Fair predictions, reliable points, and redeemable rewards. | Limited individual influence; contributes prediction activity. | Submits or withdraws their own predictions within system rules. | Lost points, failed requests, or misuse of personal data. |
| **Soccer Club** | Useful crowd-sentiment insights and trustworthy analytics. | Influences demand for analytical products. | Accesses analytics permitted by approved data-sharing rules. | Misleading insights or inappropriate data disclosure. |
| **Human Project Owner / Developer** | Correctness, security, maintainability, and project delivery. | High technical and product influence. | Approves product, architecture, implementation, and operational decisions. | Technical failures, delivery risks, and project accountability. |

## 2. Proposed Risk Assessment — Concurrent Request Capacity

**Status:** Proposed risk assessment. Connection exhaustion has not been established as a verified incident in this document. Record it as an observed incident only after reproducing the failure or reviewing supporting test evidence.

**Observation:** Concurrent prediction requests may exhaust available database connections or cause request failures. Reproducible test results and logs are needed to determine whether this occurs in the current configuration.

**Consequence:** Under peak demand, prediction requests could fail before the system returns an appropriate business-level response. The capacity required for expected tournament traffic has not yet been established.

**Uncertainty:** The root cause, effective connection limits, connection-pooling configuration, transaction duration, and expected peak workload remain to be verified.

**Options:**

1. Measure connection usage, pooling, and transaction duration, then repeat a controlled load test.
2. Evaluate bounded concurrency or rate limiting, with observable failures and appropriate retry behavior.
3. Consider a queue only if asynchronous processing satisfies prediction-deadline and consistency requirements.
4. Establish launch-readiness criteria based on measured capacity, latency, and error rates before accepting production traffic.

**Ask:** The human project owner must review the evidence, agree on acceptable capacity and error-rate targets, and approve the next action. No mitigation, launch delay, or acceptance of residual risk is authorized by this assessment alone.

## 3. Escalation Record

When the risk has been investigated, update this document with:

- **Evidence:** Reproducible test commands, configuration, measured results, and relevant logs.
- **Decision:** The human-approved action and its rationale.
- **Owner:** The person responsible for carrying out the decision.
- **Follow-up:** The verification criteria and observed result.

Do not present hypothetical traffic figures, unverified failures, or proposed mitigations as established facts or approved decisions.
