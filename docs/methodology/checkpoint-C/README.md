# Checkpoint C — Quality and Residual Risk

- **Date:** 2026-11-07
- **Status:** Proposed evidence package for the Checkpoint C discussion. It is not a new evaluation; residual risks require the human owner's decision.
- **Current presentation state:** read [`07-current-state.md`](./07-current-state.md) first. It updates the risk ranking after authentication/RLS and `v1.1.0`; the sections below remain the original package. Use [`08-presentation-pack.md`](./08-presentation-pack.md) for the 3-minute script, Q&A bank and fallbacks.
- **Course checkpoint:** C (L12) — quality and residual risk
- **Related:** [Risk control map](./01-risk-control-map.md), [Quality story](./02-quality-story.md), [Review decisions](./03-review-decision.md), [Test-case process](./04-test-case-process.md), [Residual risk](./05-residual-risk.md), [Documentation review](./06-documentation-review.md), [Development practices](../development-practices.md)

## 1. The four questions

Checkpoint C asks four questions. A test count or a coverage number is not an answer; the answer is a traceable story from risk to evidence to residual risk.

### 1.1 Which risk matters most, and why?

**R-01 — unauthorized access and resolution.** Anyone who can reach the database with the anon key can act as any participant and call `resolve_market`. There is no authentication, RLS or grant restriction. The impact is critical: points can be moved and markets resolved without authority. The likelihood is high because the key is reachable and the RPCs are exposed. The detection delay is low only if someone inspects the data; there is no audit trail. Recovery is expensive because points and market state may need reconstruction.

This risk is ranked first because it has **no control today**. The other critical invariants are controlled and, in several cases, observed failing under fault injection. A controlled ledger with an open door is not a controlled ledger.

See [`01-risk-control-map.md`](./01-risk-control-map.md) and [`05-residual-risk.md`](./05-residual-risk.md) RR-01.

### 1.2 What behaviour did you test, and what happened?

**M-INV4 — double-spend prevention across two markets.** Given one profile with 60 points and two distinct markets, two concurrent 50-point entries cannot both commit. Exactly one entry is accepted, the other is refused for insufficient points, the balance never becomes negative, and exactly one trade and one position exist.

The test is `tests/invariants/market-concurrency.test.ts`. It asserts committed state, not only responses. The suite was observed failing under fault injection A: with the profile lock and both balance guards removed, both entries were accepted, the balance reached **−40**, and the test failed with `Expected: 1 Received: 2`; the function was restored and the suite returned green.

The limit: one machine, one database instance, two markets, no network retry and no idempotency. The cooldown is not a request key. See [`02-quality-story.md`](./02-quality-story.md).

### 1.3 What did review change, or what did it deliberately keep?

Two review decisions:

1. **Lock order in `close_trade` — revise.** The first draft locked the position before the profile, contradicting the approved order `market → profile → cooldown → position`. Review changed the code before commit. The domain rule and the lock order were kept. A single-user test would not reveal the deadlock risk; the concurrency suite does not prove deadlock freedom.
2. **Cooldown-exit evidence — revise the evidence, keep the code.** The implementation already allowed exits during an active cooldown, but the suite never asserted it. Review added a test for the exit exemption and kept `close_trade` unchanged. The new test passed; the full suite passed.

Neither review is an independent human peer review. The project is one developer plus agent role passes; that limitation is recorded as FND-008. See [`03-review-decision.md`](./03-review-decision.md).

### 1.4 What remains uncertain, and what happens next?

The residual risks are recorded in [`05-residual-risk.md`](./05-residual-risk.md):

- **RR-01 / FND-001:** no authentication, RLS or grants. Proposed next: implement the authorization increment with database-level tests.
- **RR-02 / FND-003:** no idempotency keys; a retry after cooldown is a new entry. Proposed next: request IDs and a unique constraint.
- **RR-03 / FND-002:** five market invariants and the M-INV7 details (ladder, cap, decay, scope, no-escalation, exit exemption) are not fault-injected. Proposed next: add the missing injections.
- **RR-04 / FND-005:** capacity and uniqueness tests are not fully independent. Proposed next: make them self-contained or merge the dependent assertions.
- **RR-05 / FND-004:** no load or p95 measurement. Proposed next: define a workload and measure.
- **RR-06 / FND-006:** no deployment, observability or recovery. Proposed next: build the Checkpoint E slice.
- **RR-07 / FND-007:** the problem claim has no real organizer observation. Proposed next: interview or observe one organizer.
- **RR-08 / FND-008:** no independent human review. Proposed next: peer-review one PR.

The next decision is the human owner's. No residual risk is accepted by this record.

## 2. AI-use decision

- **What AI contributed:** historical implementation and test drafts (AI transparency log Entries 5–15), and this documentation package (Entry 18). AI did not rerun the suite for this record.
- **What the human decides:** the risk ranking, the quality-story selection, the review decisions, the residual-risk status and the next increment. This package proposes; it does not record human acceptance.
- **How AI output was checked:** the quality story uses a business-rule oracle and a recorded fault injection, not a generated summary. The lock-order review was checked against decision D9/ADR-002. The cooldown-exit test was run and recorded. AI-generated code and tests can share assumptions, so the independent rule and the observed-red injection are the check.
- **What was rejected or corrected:** AI's first `close_trade` lock order was corrected; AI proposals that conflicted with the owner's rules were rejected (see Entries 5, 10 and 11). This documentation package did not invent test results; it cites the records and marks the change as not rerun.
- **Limit:** there is no independent human review. The AI log is a provenance record, not a quality certificate.

## 3. Evidence index

| Record | What it establishes | Limit |
| :--- | :--- | :--- |
| [`01-risk-control-map.md`](./01-risk-control-map.md) | Five risks, controls, control types, residual risks | Likelihood/impact are qualitative; not a production risk assessment |
| [`02-quality-story.md`](./02-quality-story.md) | Double-spend control, expected/observed, fault injection A | Local, single-instance, no retries |
| [`03-review-decision.md`](./03-review-decision.md) | Two review decisions: lock order and cooldown-exit evidence | Not independent human review |
| [`04-test-case-process.md`](./04-test-case-process.md) | How cases are created, where they fit, AI role, evidence template | Process record, not proof that every case exists |
| [`05-residual-risk.md`](./05-residual-risk.md) | Residual risks and proposed decisions | Decisions are proposed, not accepted |
| [`06-documentation-review.md`](./06-documentation-review.md) | Record types, readers, findability, stale guidance | No portfolio index yet |
| [`07-current-state.md`](./07-current-state.md) | Post-v1.1.0 risk ranking, updated script, readiness checklist | M-INV4 injection not re-run on auth version; no independent review |
| [`08-presentation-pack.md`](./08-presentation-pack.md) | 3-minute script, one-page handout, Q&A bank, demo path and fallbacks | Presentation aid, not new evidence |
| [`../development-practices.md`](../development-practices.md) | TDD fit, SDD mode and the OpenSpec decision | Descriptive; not proof that every slice followed it |
| [`../checkpoint-A/02-invariants.md`](../checkpoint-A/02-invariants.md) | Authoritative invariant status and fault-injection transcript | As of 2026-10-19; not rerun for this change |
| [`../checkpoint-B/04-sdlc-decision.md`](../checkpoint-B/04-sdlc-decision.md) | Lifecycle choice and flow | One developer, two cycles |

## 4. Three-minute presentation script

Use this as the spoken structure for the checkpoint discussion. It is a guide, not a script to read verbatim.

> “This is MatchPulse. The primary user is a tournament organizer; the first increment was registration capacity, and the second was a live prediction market.
>
> The risk that matters most is authorization: there is no authentication, RLS or grant restriction, so anyone with the anon key can act as any participant and call `resolve_market`. That is the top residual risk, and it is why I do not claim the system is a security boundary.
>
> The behaviour I can show is double-spend prevention. Two concurrent 50-point entries against a 60-point balance cannot both commit. The test asserts committed state. I proved it can fail by removing the profile lock and both balance guards: both entries were accepted, the balance reached minus 40, and the test went red. The limit is that this is one local database, no retry and no idempotency.
>
> Review changed two things. It caught a lock-order defect in `close_trade` before commit, and it added the missing exit-during-cooldown evidence while keeping the implementation. Neither is an independent human review; that is a recorded limitation.
>
> The next actions are authorization, idempotency, the missing fault injections, load measurement, delivery/operations, and one real organizer observation. The residual risks are proposed for the owner's decision, not accepted.”

## 5. What this package does not prove

- It does not prove that the system is secure; it proves the opposite is currently true.
- It does not prove that the controls work in production; the evidence is local and test-based.
- It does not prove that the risk ranking is correct; it is a qualitative judgment.
- It does not prove user value; the problem and outcome claims remain hypotheses.
- It does not accept any residual risk.

## 6. Decision requested

The human owner is asked to:

1. Review the risk control map and decide whether the five risks are the right five.
2. Decide the status of each residual risk in [`05-residual-risk.md`](./05-residual-risk.md): accept, defer, mitigate now or close.
3. Approve the next increment. The recommended next increment is the authorization/RLS slice, because it is the only critical residual risk and it is the largest credibility gap in the quality story.

The checkpoint is a discussion, not a grade. The purpose is to make the quality story coherent before the final deliverable.

## 7. Addendum 2026-11-07 — RR-01 mitigated

The authorization increment (#95 / PR #96) is implemented and verified in CI run [42397891717](https://github.com/match-pulse/match-pulse/actions/runs/42397891717). The authorization suite covers anonymous access, fan own-row isolation, organizer-only resolution, denied direct writes and the identity-free public trade feed. RR-01 is mitigated for the platform boundary; the organizer management UI, production session hardening and service-role handling remain operational concerns. RR-04 (test independence) is fixed. The other residual risks remain open, and no residual risk is accepted by this addendum. See [`05-residual-risk.md`](./05-residual-risk.md) §7.
