# Checkpoint D — Technical Debt and Evolution

- **Status:** Pre-read; proposal.
- **Purpose:** Make the remaining debt visible, classify it, and state what evolves next.

## 1. Debt register

| ID | Debt | Type | Impact | Current status | Next action |
| :--- | :--- | :--- | :--- | :--- | :--- |
| FND-002 | M-INV1/2/3/5/8 and M-INV7 details lack observed-red fault injection | Verification debt | Passing tests are weaker evidence than they look | Open | Add injections; update registry only after observed failure |
| FND-003 | No idempotency keys; retry after cooldown is a new entry | Domain/reliability debt | Duplicate charge/position on retry | **Fixed** — #107 / PR #108 | Verified in CI run 42425131584; keep the legacy null-key limit documented |
| FND-004 | No load/p95 measurement | Performance debt | Elasticity target is unmeasured | Open | Define workload and measure |
| FND-006 | No deployment, observability or recovery evidence | Operational debt | Not production-ready | Open | Checkpoint E increment |
| FND-007 | No real organizer observation | Context debt | Problem claim is a hypothesis | Open | Interview/observe one organizer |
| FND-008 | No independent human review | Collaboration debt | Review evidence is self-review | Open | Peer review one PR |
| — | No organizer management UI | Product/UI debt | Resolution is RPC/test-only | Deferred | Decide if the course/product needs it |
| — | No points ledger | Auditability debt | Balances/trades/payouts are transactional but not a ledger | Deferred | Add append-only ledger or reconciliation query |
| — | `matches` not linked to `tournaments` | Domain-model debt | Tournament and match aggregates are independent | Accepted for current scope | Link or document as a non-goal |
| — | No portfolio index | Documentation debt | Assessor must reconstruct the story | Open | Final deliverable |
| — | No production session/rate-limit hardening | Security operations debt | Local auth only | Deferred | Checkpoint E/security follow-up |

## 2. Classification

- **Verification debt:** FND-002, FND-008.
- **Domain/reliability debt:** FND-003, points ledger, tournament-match link.
- **Performance/operational debt:** FND-004, FND-006, session/rate-limit hardening.
- **Context/product debt:** FND-007, organizer UI.
- **Documentation debt:** portfolio index.

This is a diagnostic lens, not a score. Some debt is deliberate scope control; some is an evidence gap.

## 3. Priority

1. **Idempotency (FND-003)** — closes the top remaining risk and is the D change scenario.
2. **Missing market injections (FND-002)** — strengthens the quality story.
3. **Delivery/operations (FND-006)** — largest remaining rubric gap; Checkpoint E.
4. **Real organizer evidence (FND-007)** — strengthens context and validation.
5. **Load/p95 (FND-004)** — turns the elasticity target into evidence.
6. **Independent review (FND-008)** — strengthens collaboration and review.
7. **Organizer UI / points ledger** — only if the course or product needs them; do not add features speculatively.

**Update 2026-11-08:** item 1 (idempotency) is fixed by #107 / PR #108. The current top debt is FND-002 (unverified market injections), then FND-006 (delivery/operations), FND-004, FND-007 and FND-008.

## 4. Evolution path

| Milestone | Scope | Evidence |
| :--- | :--- | :--- |
| **v1.2.0** | Idempotent entry/exit; request IDs; retry tests; compatibility note | New invariant suite, fault injection, auth suite still green |
| **v1.3.0** | Delivery/observability/recovery; Checkpoint E | Deployment/release evidence, health/logging, SLO, rollback, backup/restore |
| **Final** | Portfolio index, real organizer evidence, remaining injections, independent review | Rubric-aligned portfolio with limits |

This is a proposal. The human decides scope and priority.

## 5. What not to do

- Do not add rewards, club analytics, brackets or a points ledger just to look complete.
- Do not split the modular monolith into services without a measured requirement.
- Do not replace the database invariants with application checks.
- Do not weaken a test, guard or RLS policy to make a change pass.
- Do not treat a local prototype as production-ready.

## 6. Revisit triggers

- A new domain rule, market outcome or points path.
- A deployment or production observation.
- A peer review finding.
- A user/organizer report.
- A release that changes a contract.
- A security or privacy change.

## 7. Decision requested

- Approve the priority order for the next increment.
- Confirm whether idempotency or delivery/operations is the next release.
- Confirm which debt is accepted, deferred or scheduled.
