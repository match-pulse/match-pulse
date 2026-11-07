# Checkpoint C — Risk Control Map

- **Date:** 2026-11-07
- **Status:** Proposed evidence record for Checkpoint C. Residual risks require human acceptance; AI does not accept risk.
- **Scope:** The five risks that matter most for the current MatchPulse increments. The map is not a generic checklist; it is tied to the domain rules, the enforcement mechanisms and the evidence that exists.

## 1. Method

Each risk is assessed by:

- **who could be harmed** — user, operator, business or developer;
- **likelihood and impact** — a qualitative judgment, not a measured probability;
- **detection delay** — how long it takes to notice the failure;
- **recovery difficulty** — whether the effect can be reversed, including changed data;
- **control** — what prevents, reveals, contains or helps recover from the failure;
- **control type** — test or non-test;
- **residual risk** — what remains after the control, owned by the human.

The ranking is a judgment for this increment. It is not a universal risk score.

## 2. Risk inventory

| ID | Risk / failure | Who is harmed | Likelihood × impact | Detection delay | Recovery difficulty | Control(s) | Control type | Effort | Residual risk | Owner |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **R-01** | Anyone who can reach the database can act as any participant and call `resolve_market`; there is no authentication, RLS or grant restriction. | Fans (points theft), organizer (false resolution), business (trust, data integrity) | High × Critical | Immediate if observed, but silent otherwise; no audit trail | High — points and market state may need manual reconstruction | **None today.** Planned: Supabase Auth, role model, RLS policies, grants, `auth.uid()`-based RPCs, organizer check in `resolve_market`, authorization tests. | Non-test (planned configuration and access control) | High | **Critical, open** — FND-001 | Human owner |
| **R-02** | Concurrent registrations exceed `max_capacity`; two participants believe they hold the last place. | Organizer (overbooked venue), fans (dispute, denied entry) | Medium × High | Low — visible at the venue or in a dispute; may be silent in the database if only responses are checked | Medium — remove a registration, refund/notify, repair counter | Pessimistic tournament-row lock + capacity check + insert + increment in one transaction; `CHECK (current_players <= max_capacity)`; unique registration constraint; fault-injected test; CI. | Test + non-test (database constraint and transaction) | Low | **Controlled, local evidence** — one database instance, one scale; no multi-instance or sustained-load proof | Human owner |
| **R-03** | Two concurrent entries spend the same balance; the balance becomes negative or one position is silently lost. | Fan (lost points), business (ledger corruption), other traders (unfair market) | Medium × High | Low — a negative balance or missing trade is visible only on inspection; no alert | High — manual ledger repair, trust loss | Profile row lock + conditional debit + `points_after >= 0` check; single transaction for position, trade and balance; `market-concurrency.test.ts`; fault injection A observed the balance at −40 when the guards were removed; CI. | Test + non-test (row lock and transaction) | Medium | **Controlled, local evidence**; **FND-003** idempotency remains open: a retry after cooldown is a new entry | Human owner |
| **R-04** | A market is resolved twice or a winner is paid twice; losing shares pay out. | Fans (incorrect payout), organizer (accountability), business (ledger trust) | Low × Critical | Low — payout duplication may be noticed only by reconciliation; no ledger alert | High — reverse duplicate payouts, audit all holders | Terminal `RESOLVED` status check + `market_payouts` primary key `(market_id, user_id)` + one transaction; `market-lifecycle.test.ts`; fault injection B accepted a second resolution and turned the test red; restored; CI. | Test + non-test (unique key and terminal status) | Medium | **Controlled, local evidence**; **R-01** means anyone can call `resolve_market` today | Human owner |
| **R-05** | Pricing, share bookkeeping or rounding is inconsistent: Σ position shares ≠ `q`, over-sell, negative holdings, or a hidden fee. | Fans (unfair price/payout), business (market credibility), auditor (unexplained dust) | Medium × High | Medium — a bookkeeping mismatch may surface only at resolution or audit | Medium — recompute positions, reconcile trades, explain dust | Single transaction for `q`, position, trade and balance; `shares >= 0` constraint; over-sell guard; `ceil` debit / `floor` credit; no fee path; `market-pricing.test.ts`; CI. | Test + non-test (constraints and transaction) | Medium | **Controlled, passing tests, not fault-injected** — FND-002 | Human owner |

### Non-test controls in this map

The checkpoint requires at least one non-test control. The map contains several:

- **Database constraints and transactions** — `CHECK` constraints, unique keys, row locks and one transaction per RPC. These prevent states that should be unrepresentable.
- **CI** — lint, typecheck, build and the invariant suites run on every pull request. This is an automated control, not a domain test.
- **Review and decision records** — the lock-order review and the review decision record catch design errors that tests may not exercise.
- **Branch protection** — required checks and linear history; a green check is evidence, not approval.

## 3. Ranking and rationale

1. **R-01 — unauthorized access and resolution.** It is ranked first because it has **no control today**, the anon key is reachable, and the impact is critical: points can be moved and markets resolved without authority. A controlled ledger with an open door is not a controlled ledger.
2. **R-02 — overbooking.** The control is strong and fault-injected, but the consequence is public and trust-damaging. The remaining risk is scale and multi-instance behaviour, not the local invariant.
3. **R-03 — double-spend.** The control is fault-injected and the failure is silent. The remaining risk is retry/idempotency, which the cooldown does not solve.
4. **R-04 — duplicate resolution.** The control is fault-injected, but the same lack of authorization (R-01) makes it reachable by anyone. The terminal check protects against accidental duplication, not against an unauthorized caller.
5. **R-05 — accounting and rounding.** The tests pass, but the mechanisms have not been observed failing under injection. The absence of a points ledger makes reconciliation harder.

## 4. Residual risk summary

| Residual risk | Finding | Severity | Status | Proposed next action |
| :--- | :--- | :--- | :--- | :--- |
| No authentication, RLS or grants; open RPC access | FND-001 | Critical | Open | Implement the auth/RLS increment with authorization tests |
| Five market invariants and the M-INV7 details (ladder, cap, decay, scope, no-escalation, exit exemption) are not fault-injected | FND-002 | Major | Open | Add injections for M-INV1, M-INV2, M-INV3, M-INV5, M-INV8 and the M-INV7 details |
| No idempotency keys; a retry after cooldown is a new entry | FND-003 | Major | Open | Add a client request ID and a unique constraint |
| No load or p95 latency measurement | FND-004 | Major | Open | Run a defined workload and record p95, error rate and environment |
| Capacity and uniqueness tests are not fully independent | FND-005 | Minor | Open | Make each test create its own state or merge the dependent assertions |
| No deployment, observability or recovery evidence | FND-006 | Major | Open | Build the Checkpoint E delivery/operations slice |
| The problem claim has no real organizer observation | FND-007 | Major | Open | Interview or observe one organizer; update the claim with evidence and limits |
| No independent human review | FND-008 | Minor | Open | Arrange a peer review of one PR; record the review decision |

## 5. What this map does not prove

- It does not prove that the likelihood or impact judgments are correct. They are qualitative.
- It does not prove that the controls work in production; the evidence is local, single-instance and test-based.
- It does not accept any residual risk. Acceptance is a human decision, recorded separately.
- It does not cover every possible failure; it covers the five that matter most for the current increments.
- It does not replace the invariant registry. The registry is authoritative for enforcement and evidence status; this map is the risk view.

## 6. Review condition

Revisit this map when:

- authentication/RLS lands or the identity model changes;
- a new invariant, market outcome or points path is added;
- a fault injection fails to turn a test red;
- a production incident or user report reveals a new failure;
- the system is deployed and operational evidence becomes available;
- a residual risk is accepted, deferred or closed.

The map is a living record. Changes are dated addenda; historical rows are not rewritten.

## 7. Addendum 2026-11-07 — R-01 control landed

The authorization increment (#95 / PR #96) adds the control that R-01 did not
have: Supabase Auth, `profiles.role`, RLS, least-privilege grants,
`auth.uid()`-based RPCs and an organizer check in `resolve_market`. CI run
[42397891717](https://github.com/match-pulse/match-pulse/actions/runs/42397891717)
passes the six authorization tests and the existing invariant suites (21 tests
across 6 files).

R-01 is mitigated for the local platform boundary. The residual operational
concerns are the missing organizer management UI, production session/rate-limit
hardening and service-role handling. R-04 (test independence) is fixed; R-02,
R-03, R-05 and the broader operational risks remain open. No risk is accepted by
this addendum.

## 8. Addendum 2026-11-08 — R-03 idempotency residual closed

The idempotency increment (#107 / PR #108) adds the request-key control to
entry and exit. CI run
[42425131584](https://github.com/match-pulse/match-pulse/actions/runs/42425131584)
passes 28 tests, including six M-INV9 idempotency tests. FND-003 is fixed.

The R-03 double-spend control now has two layers: the profile lock/conditional
debit and the request-key replay. Remaining limits: the legacy null-key path is
non-idempotent, no request-key retention/cleanup policy exists, and fault
injection for the unique constraint was not observed locally. R-02, R-05 and the
operational risks remain open; no risk is accepted by this addendum.
