# MatchPulse — SDLC Decision (Checkpoint B Addendum)

- **Date:** 2026-11-07
- **Status:** Recorded from the existing operating model and owner decisions D1–D9. This record makes the lifecycle choice explicit; it does not introduce a new product or architecture decision.
- **Checkpoint:** B — operating model and feedback
- **Related:** [`02-operating-model.md`](./02-operating-model.md), [`03-flow-evidence.md`](./03-flow-evidence.md), [`../development-practices.md`](../development-practices.md), [`../../architecture/adr/002-live-prediction-market.md`](../../architecture/adr/002-live-prediction-market.md)

## 1. Purpose

Checkpoint B asks for more than a description of meetings and tools. It asks for a testable design of how work moves from a claim to use and feedback. This record answers the L08 questions that the operating model left implicit:

- What is the main uncertainty?
- Which lifecycle approach fits it, and why?
- How does one item move from idea to use and feedback?
- What condition allows each transition, and who owns it?
- Who supplies feedback, and which decision can that feedback change?
- Which statements are observed, proposed, or still unknown?
- What observation would make the team revise the method?

The answer is a **hybrid lifecycle**: plan-driven for the domain contract, iterative and incremental for delivery, and adaptive for scope and priority.

## 2. Context and main uncertainty

The first increment was the tournament-registration slice. Its uncertainty was **solution and integration uncertainty**, not problem uncertainty:

> Given a tournament with capacity 32, can one end-to-end registration path enforce the limit under 100 concurrent requests, without relying on an application-level check?

The problem claim — that organizers need this limit to hold — remains a hypothesis until a real organizer is observed or interviewed. That is recorded honestly in [`../checkpoint-A/03-product-claims.md`](../checkpoint-A/03-product-claims.md).

The second increment was the live prediction market. Its uncertainty was **solution uncertainty plus a value hypothesis**:

> Can the system price, enter, exit and resolve a three-outcome market with correct point accounting under concurrency, and does the resulting crowd signal have value for fans and clubs?

The lifecycle therefore had to support fast technical evidence for stable domain rules, while leaving product value and scope open to later evidence. A fully plan-driven lifecycle would commit too early to an unvalidated product. A fully adaptive lifecycle would put the concurrency invariants at risk. The hybrid choice is the response to both.

## 3. Chosen lifecycle

| Layer | Choice | What it covers | Why |
| :--- | :--- | :--- | :--- |
| **Domain contract** | **Plan-driven** | Kata, domain model, invariants registry, schema constraints, ADRs, RPC contracts | These rules are stable, expensive to change, and must be agreed before implementation. Changing them requires a decision and a migration. |
| **Delivery** | **Iterative and incremental** | Issue → branch → implementation → tests → PR → CI → review → merge | The solution and the evidence are uncertain. Small slices let the team learn before the next commitment. |
| **Scope and priority** | **Adaptive** | Backlog order, non-goals, market pivot, residual-risk decisions | New evidence can change product direction. The human owner decides whether the change is justified. |

This is not a label applied after the fact. It explains why the project has both a strong domain contract and a sequence of small, independently verified slices.

## 4. Why this lifecycle fits

1. **The expensive uncertainty is reduced early.** The capacity and point-accounting invariants are tested at the database boundary, where the failure would be silent and costly. The team did not wait for a production incident.
2. **Feedback arrives before the commitment becomes expensive.** CI runs lint, build, typecheck and the invariant suites on every pull request. A broken rule is caught before merge, not after release.
3. **The work is small enough to review.** One implementation issue maps to one branch and one pull request. Work in progress is limited to one increment at a time.
4. **The domain contract does not drift with the delivery cadence.** The kata, domain model, invariants registry and ADRs are maintained as the current specification, while the delivery slices remain iterative.
5. **The owner can absorb change without hiding it.** Scope changes, architecture changes and residual-risk acceptance are explicit human decisions, recorded in the issues, ADRs, plans and AI log.

## 5. Flow of one item

The item is a **slice**, not a whole feature. The slice moves through these states:

| Stage | Activity | Transition condition | Owner | Artefact / evidence |
| :--- | :--- | :--- | :--- | :--- |
| **Intake** | A claim or task enters the board with a type, goal, scope and observable Done-when criteria. | The issue is accepted into *Enter*; prior records and the findings register are checked. | Human decision owner | Issue; claim type; prior-records note |
| **Plan** | The slice is bounded; uncertainty, non-goals, acceptance criteria, verification, risks and stop conditions are stated. | The plan is approved; substantial or high-risk work waits for explicit approval. | Human decision owner; orchestrator drafts | Execution plan; issue acceptance criteria |
| **Build** | One branch, one implementation slice, local checks as work progresses. | The scope is unchanged and local checks pass; a new decision stops the slice. | Implementation agent | Branch; commits; local check output |
| **Verify** | Invariant tests, fault injection, static checks, manual smoke where needed. | The check is capable of failing; evidence is recorded with its limits. | Test engineer; human accepts | Test result; fault-injection transcript; verification record |
| **Review** | The complete diff, tests, docs, security and operational consequences are examined. | CI is green and a review decision is recorded; the reviewer's scope is stated. | Code reviewer; security reviewer when relevant | PR; review decision; CI run |
| **Integrate** | The accepted change is merged under branch protection. | The human authorizes the merge; required checks pass. | Human decision owner | Merge commit; changelog row; AI log entry |
| **Learn** | The evidence is linked, the board is updated, and the next decision is made. | The record chain is complete: issue, PR, verification, findings, changelog, AI transparency. | Orchestrator; human accepts | Evidence record; flow measurement; next issue |

**Waiting points.** The main queues are review/CI, human authorization, the local Docker/Supabase environment, and product decisions such as resolving a market or accepting a residual risk. The flow evidence in [`03-flow-evidence.md`](./03-flow-evidence.md) measures these waits rather than hiding them.

## 6. Feedback loops and decisions they change

| Feedback source | Signal | Decision it can change | Owner | Status |
| :--- | :--- | :--- | :--- | :--- |
| CI: lint, typecheck, build | A change no longer compiles or violates a static rule | Block merge; revise the change | Human / reviewer | Observed |
| CI: domain invariants | A business rule fails under test | Reopen the claim; fix the implementation or the test | Human / test engineer | Observed |
| Fault injection | The suite still passes when the guard is removed | Demote the evidence; add a stronger check; record residual risk | Human / test engineer | Observed |
| Code review | A lock-order, authorization or scope defect | Revise the code or narrow the change | Reviewer / human | Observed |
| Flow evidence | Work waits in review or authorization | Change WIP policy, review ownership or slice size | Human | Observed, one cycle |
| AI transparency log | AI output was rejected, corrected or misunderstood | Change the AI boundary or verification step | Human | Observed |
| Organizer / fan feedback | The problem or outcome claim is wrong or rare | Revise the claim, backlog or non-goals | Human | **Missing** — problem claim untested |
| Production monitoring | Latency, errors or recovery behaviour differs from expectation | Change release, operations or architecture | Human / operations | **Missing** — no deployment |

A feedback loop counts only when it changes a decision. The table records the decision, not just the meeting or tool.

## 7. Decision rights

The detailed change-rights table is in [`02-operating-model.md`](./02-operating-model.md) §5. In summary:

- The **human owner** approves scope, architecture, domain rules, residual risk and merges.
- **AI agents** may propose, implement within an approved scope, review and run verification. They cannot approve their own work or accept risk.
- **Branch protection** requires both CI jobs and linear history. A green check is evidence, not approval.
- **Review** is currently structured self-review plus automated checks and agent role passes. There is no independent human reviewer; that limitation is recorded in the operating model and in the findings register.

## 8. Observed, proposed, unknown

| Statement | Status | Evidence / limit |
| :--- | :--- | :--- |
| The registration capacity invariant holds under a 100-request burst on the local database. | **Observed** | `tournament-capacity.test.ts`; fault-injected; CI. Limit: one database instance, one machine, one scale. |
| The double-spend guard prevents a negative balance across two markets. | **Observed** | `market-concurrency.test.ts`; observed red under injection A; CI. Limit: no retries, no idempotency, no multi-instance. |
| Resolution pays once and is terminal. | **Observed** | `market-lifecycle.test.ts`; observed red under injection B; CI. Limit: no authorization on `resolve_market`. |
| The lifecycle is a hybrid of plan-driven, iterative/incremental and adaptive. | **Proposed** | This record. It explains the existing practice; it is not a controlled experiment. |
| Work in progress is limited to one implementation slice. | **Observed** | Flow evidence: every PR opened after the previous merge. Limit: one developer, two cycles. |
| Organizers actually experience overbooking and value this control. | **Unknown** | No interview, incident or observation. The problem claim is a hypothesis. |
| The system behaves correctly under sustained load, multiple instances or dropped connections. | **Unknown** | No load test, no deployment, no production telemetry. |
| The market signal has value for fans or clubs. | **Unknown** | No outcome evidence; club analytics is not implemented. |

## 9. What would make the team revise the lifecycle

| Trigger | Revision |
| :--- | :--- |
| **Problem/adoption uncertainty dominates** | Move discovery earlier: organizer interviews, observed registration attempts, a smaller MVP, or a landing-page test before more engineering. |
| **Solution uncertainty dominates** | Add a prototype or technical spike before committing to a full slice. |
| **Integration/dependency uncertainty dominates** | Add contract tests, dependency spikes or an earlier integration point. |
| **Environment uncertainty dominates** | Add monitoring, review triggers and a rollback plan; shorten the release path. |
| **The system becomes production-critical** | Add plan-driven security, release and recovery gates; independent review; operational SLOs. |
| **The flow evidence shows a persistent queue** | Change WIP policy, review ownership or slice size; measure again. |

The method is not sacred. It must be revised when the evidence says the uncertainty has moved.

## 10. Limits

- One developer, one repository, one AI assistant. There is no independent human reviewer, so “review” means structured self-review plus automated checks and agent role passes.
- The flow evidence covers two cycles on one day. It is a record of what happened, not a stable process baseline.
- There is no deployment, production telemetry, load measurement or recovery evidence. Operation is proposed, not observed.
- The problem and outcome claims are not yet supported by a real organizer or fan. The lifecycle is fit for the technical uncertainty; it is not yet fit for the product uncertainty.
- This record describes the lifecycle; it does not prove that the lifecycle produced better outcomes than an alternative.

## 11. Relationship to TDD, SDD and OpenSpec

The lifecycle is not the same thing as a testing practice or a specification tool:

- **TDD** is an engineering practice inside the delivery loop. MatchPulse uses invariant-first/risk-first testing for transactional rules; TDD is reserved for pure local rules where red-green-refactor is meaningful. See [`../development-practices.md`](../development-practices.md).
- **SDD** is how intent is made explicit inside the lifecycle. MatchPulse uses spec-first per slice and spec-anchored for the domain; it does not use spec-as-source.
- **OpenSpec** is one implementation of SDD. It is not adopted as a required tool in this increment. A bounded trial on one slice is allowed; the decision is recorded in [`../development-practices.md`](../development-practices.md).

This separation matters: adopting a tool does not replace the lifecycle choice, and a lifecycle label does not prove that the work is specified or tested.
