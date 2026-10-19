# MatchPulse — Stakeholder Governance & Escalation

## 1. Stakeholder Matrix

| Actor | Interest | Influence | Decision Right | Exposure |
| :--- | :--- | :--- | :--- | :--- |
| **Tournament Organizer** | Fair play, accurate results, and reliable tournament operations. | High within tournament management. | Manages authorized tournament and match operations. | Reputational damage from disputed predictions or incorrect results. |
| **Participant (Fan)** | Fair predictions, reliable points, and redeemable rewards. | Limited individual influence; contributes prediction activity. | Submits or withdraws their own predictions within system rules. | Lost points, failed requests, or misuse of personal data. |
| **Soccer Club** | Useful crowd-sentiment insights and trustworthy analytics. | Influences demand for analytical products. | Accesses analytics permitted by the agreed data-sharing rules. | Misleading insights or inappropriate data disclosure. |
| **Solo Developer / Project Owner** | Correctness, security, maintainability, and project delivery. | High technical and product influence. | Human approval authority for product, architecture, implementation, and operational decisions. | Technical failures, delivery risks, and accountability for project decisions. |

## 2. Actionable Escalation Note

**Observation:** During local stress testing, 50 concurrent requests reportedly triggered a PostgreSQL connection exhaustion error, causing some requests to fail. The test configuration and logs should be retained as evidence.

**Consequence:** Under higher concurrent demand, requests may fail before MatchPulse can return the intended business-level response. The behavior and capacity under a peak of 10,000 concurrent fans remain unverified.

**Uncertainty:** The root cause, effective connection limits, deployment connection pooling, and expected peak workload have not yet been established through a reproducible capacity test.

**Options:**
1. Investigate connection usage, pooling, and transaction duration; repeat the load test.
2. Introduce bounded concurrency or rate limiting with controlled, observable failure responses.
3. Evaluate a queue only if asynchronous processing fits the prediction-submission requirements and preserves deadline and consistency guarantees.
4. Defer launch until agreed capacity and error-rate criteria have been demonstrated.

**Ask:** The human project owner must review the evidence, determine acceptable launch criteria, and explicitly approve the next action. No queue, launch delay, or acceptance of residual risk is assumed without that decision.