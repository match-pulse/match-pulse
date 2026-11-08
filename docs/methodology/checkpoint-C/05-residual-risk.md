# Checkpoint C — Residual Risk and Decisions

- **Date:** 2026-11-07
- **Status:** **Proposed for human decision.** No residual risk is accepted by this document. Under the repository's governance, only the human owner may accept, defer or close a material risk.
- **Related:** [`01-risk-control-map.md`](./01-risk-control-map.md), [`../findings-register.md`](../findings-register.md), [`../checkpoint-A/02-invariants.md`](../checkpoint-A/02-invariants.md)

## 1. What residual risk means here

A control reduces a risk; it does not eliminate it. The residual risk is what remains after the control, including:

- the limits of the evidence (local database, single instance, one developer);
- the failure modes the control does not address (retries, authorization, production load);
- the cost and delay of detecting or recovering from the failure.

The table below names the residual risk and the proposed next action. It does **not** claim that the risk is acceptable. The human owner must decide.

## 2. Residual risk register

| ID | Residual risk | Finding | Severity | Why it remains | Proposed action | Owner | Decision status |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **RR-01** | Anyone with the anon key can act as any participant and call `resolve_market`; there is no authentication, RLS or grant restriction. | FND-001 | Critical | Auth/RLS was deliberately excluded from the first increments; the system is not a security boundary. | Implement Supabase Auth, a role model, RLS, grants, `auth.uid()`-based RPCs, organizer authorization for resolution, and database-level authorization tests. | Human owner | **Proposed — not accepted** |
| **RR-02** | A retry after the entry cooldown expires is accepted as a new entry; there are no idempotency keys. | FND-003 | Major | The cooldown is a churn control, not a request key. | Add a client-generated request ID and a unique constraint on `(user_id, request_id)`; test sequential and concurrent retries. | Human owner | **Proposed — not accepted** |
| **RR-03** | M-INV1, M-INV2, M-INV3, M-INV5 and M-INV8, plus the M-INV7 ladder, cap, decay, scope, no-escalation and exit exemption, have passing tests but no observed-red injection. | FND-002 | Major | Time was prioritised for the highest-risk mechanisms; the registry keeps the honest status. | Add fault injections for the window, over-sell, bookkeeping, rounding/no-fee and the M-INV7 details; update the registry only after observed failure. | Human owner | **Proposed — not accepted** |
| **RR-04** | Capacity and uniqueness tests are not fully independent; a test can pass only because another test ran first. | FND-005 | Minor | The suites were written as a sequence around a shared fixture. | Make each test create its own tournament/state, or merge the dependent assertions into one self-contained test. | Human owner | **Proposed — not accepted** |
| **RR-05** | No load or p95 latency measurement; the elasticity target is unmeasured. | FND-004 | Major | No deployment or load harness exists. | Define a workload, run a local or deployed load test, record p95, throughput, error rate, environment and duration. | Human owner | **Proposed — not accepted** |
| **RR-06** | No deployment, observability or recovery evidence; operation is proposed, not observed. | FND-006 | Major | The project is local-only; Checkpoint E is not started. | Add a deploy target, release workflow, health/logging, SLO, rollback/backup/restore runbook and one tabletop exercise. | Human owner | **Proposed — not accepted** |
| **RR-07** | The problem claim has no real organizer observation; it is a hypothesis. | FND-007 | Major | No interview or incident has been recorded. | Interview or observe one organizer; update the problem claim with evidence and limits; adjust the scope if the problem is not confirmed. | Human owner | **Proposed — not accepted** |
| **RR-08** | There is no independent human review; review is structured self-review plus automated checks. | FND-008 | Minor | The project has one developer. | Arrange a peer review of one PR; record the review decision. If unavailable, label the AI review as not independent. | Human owner | **Proposed — not accepted** |

## 3. What is controlled, and what that means

| Risk | Control | What the control establishes | What it does not establish |
| :--- | :--- | :--- | :--- |
| Overbooking (R-02) | Pessimistic lock + capacity check + insert + increment + CHECK constraint + unique constraint | The local burst scenario cannot exceed capacity or consume a second place; observed red under injection | Multi-instance, sustained load, dropped connections, production permissions |
| Double-spend (R-03) | Profile lock + conditional debit + one transaction | Two concurrent cross-market entries cannot both commit; balance observed at −40 when the guard was removed | Retry/idempotency, authorization, multi-instance, production latency |
| Duplicate resolution (R-04) | Terminal status + payout primary key + one transaction | A second resolution is refused and a winner is paid once in the tested scenario | Unauthorized caller, production recovery, full audit trail |
| Accounting/rounding (R-05) | Transaction + constraints + over-sell guard + ceil/floor + no fee path | The tested pricing and bookkeeping scenarios hold | Fault-injected proof for every mechanism; full ledger reconciliation |

The controls are real. The residual risks are the part the controls do not reach.

## 4. Decision requested

The human owner is asked to decide, for each row:

- **Accept** — the risk is understood, the control is proportionate, and the residual is accepted for the current increment.
- **Defer** — the risk is recorded but the work is scheduled after the current checkpoint.
- **Mitigate now** — the risk must be reduced before the next checkpoint or release.
- **Close** — the risk is no longer applicable, with a reason and a link to the evidence.

No row is accepted by default. The status remains **Proposed** until the human records a decision.

## 5. Proposed priority

If the goal is the strongest final portfolio, the order I would propose is:

1. **RR-01 — authorization.** It is the only critical residual risk and the only one that invalidates the trust story of a points ledger.
2. **RR-07 — real user evidence.** It is cheap, it strengthens the 12-point context criterion, and it may change the product claim.
3. **RR-02 — idempotency.** It closes the retry gap that the cooldown cannot cover.
4. **RR-06 — delivery/operations.** It is the largest remaining rubric gap and the subject of Checkpoint E.
5. **RR-03 and RR-04 — quality hardening.** Add the missing injections and make the tests independent.
6. **RR-05 — load/p95.** It turns the elasticity target from a specification into evidence.
7. **RR-08 — independent review.** It strengthens collaboration and knowledge without changing the product.

This is a proposal, not an approved plan.

## 6. Review condition

Revisit the residual risk register when:

- an authorization or idempotency control lands;
- a new invariant or points path is added;
- a fault injection changes a status;
- a deployment or production observation exists;
- a user/organizer report changes the problem or outcome claim;
- a peer review is completed.

The register is append-only for history. Decisions are recorded as dated entries, not by rewriting the original risk.

## 7. Addendum 2026-11-07 — RR-01 mitigated

The authorization increment (#95 / PR #96) is implemented and verified in CI run [42397891717](https://github.com/match-pulse/match-pulse/actions/runs/42397891717).

- **RR-01:** mitigated for the platform boundary. Supabase Auth, `profiles.role`, RLS, least-privilege grants, `auth.uid()`-based RPCs and the organizer check in `resolve_market` are in place. The authorization suite passes: anonymous private reads and mutations denied, fan own-row isolation, organizer-only resolution, direct writes denied. Remaining operational concerns: organizer management UI, production session/rate-limit hardening, service-role handling.
- **RR-04:** fixed. The capacity suite is one self-contained scenario; the uniqueness tests create their own user and tournament. CI passes 21 tests across 6 files.
- **RR-02, RR-03, RR-05, RR-06, RR-07 and RR-08** remain open. No residual risk is accepted by this addendum; the human decision is still required.

The original table above remains the historical record of the risk before the control. This addendum records the closure evidence and the new residual state.

## 8. Addendum 2026-11-08 — RR-02 mitigated

The idempotency increment (#107 / PR #108) is implemented and verified in CI run [42425131584](https://github.com/match-pulse/match-pulse/actions/runs/42425131584): 28 tests pass, 0 failures, including six request-key tests.

- **RR-02:** mitigated. A retried entry or exit with the same request key replays the recorded trade; a different payload is refused; the request and trade commit or roll back together. The legacy null-key path remains non-idempotent and is not used by the application.
- **Remaining limits:** no request-key retention/cleanup policy; no auth-version M-INV4 re-injection; no independent human review; no load/operational evidence.
- **RR-01** remains mitigated by the authorization increment. **RR-03, RR-05, RR-06, RR-07 and RR-08** remain open.

No residual risk is accepted by this addendum; the human decision is still required.

## 9. Addendum 2026-11-08 — RR-05 and RR-06 partly mitigated

The delivery baseline (#111 / PR #112) is verified in CI run
[42435007354](https://github.com/match-pulse/match-pulse/actions/runs/42435007354).

- **RR-05:** partly mitigated. The 100-request capacity burst now records
  p50/p95/max; the observed CI value is p50 245.46 ms, p95 463.11 ms and max
  479.64 ms against the proposed 1,000 ms target. Sustained load, throughput and
  a hard CI gate remain open.
- **RR-06:** partly mitigated. `/api/health`, JSON stdout logs, `bun run smoke`,
  a `Delivery smoke` CI job, an operations runbook, proposed SLOs and a
  rollback/backup procedure exist. There is still no hosted deployment,
  external monitoring/alerting or production recovery drill.
- **Backup/restore:** documented but unexercised because Docker/Postgres is not
  available in the implementation environment.
- **RR-03, RR-07 and RR-08** remain open.

No residual risk is accepted by this addendum; the human decision is still
required.
