# MatchPulse — Development Practices: Testing, Specification and OpenSpec

- **Date:** 2026-11-07
- **Status:** Recorded from the existing operating model, execution plans and evidence. It makes current practices explicit; it does not introduce a new tool or dependency.
- **Related:** [`checkpoint-B/04-sdlc-decision.md`](./checkpoint-B/04-sdlc-decision.md), [`checkpoint-A/02-invariants.md`](./checkpoint-A/02-invariants.md), [`checkpoint-C/04-test-case-process.md`](./checkpoint-C/04-test-case-process.md), [`../workflows/development-workflow.md`](../workflows/development-workflow.md)

## 1. Why this record exists

The course distinguishes three different things that are easy to conflate:

- the **software development lifecycle** — when the team learns and when it commits;
- **spec-driven development** — how intent is made explicit enough to guide implementation;
- **test-driven development** — how code is driven by a failing check.

MatchPulse has a hybrid lifecycle (recorded in the Checkpoint B addendum), a lightweight specification practice, and an invariant-first testing practice. This record states those choices, their evidence, and their limits. It also records the OpenSpec decision so the choice is deliberate rather than implicit.

## 2. Testing approach

### 2.1 Invariant-first, risk-first, not strict TDD

MatchPulse does **not** claim a strict test-first red-green-refactor cycle for its domain rules. Its primary practice is:

1. Name the failure and who could be harmed.
2. State the behaviour claim and the rule that justifies the expected result (the oracle).
3. Choose the smallest boundary that can expose the failure — usually the database transaction for concurrency rules.
4. Write a check that can fail for the intended reason.
5. Prove the check can fail by injecting the defect, then restore the implementation.
6. Record the observed result, the environment and the limit.

This is **invariant-first / risk-first testing**. It is deliberately different from TDD because the unit of correctness for the most expensive rules is a transaction, not a function. A unit test that mocks the database cannot prove that two concurrent registrations cannot both commit.

### 2.2 Where TDD fits

TDD remains useful for pure local rules where the red-green-refactor cycle is meaningful:

- input validation and parsing;
- formatting and display helpers;
- pure pricing or cooldown calculations extracted from the database;
- small state machines with no shared storage.

If MatchPulse adds such a rule, the expected practice is:

1. **Red:** write the smallest failing example for the next required behaviour.
2. **Green:** make the smallest change that satisfies the example.
3. **Refactor:** improve names and structure without changing behaviour; rerun the same checks.

The course's L10 lecture also says that if the code is already clear, no artificial refactoring step is needed. TDD is a tool for a purpose, not a ritual.

### 2.3 Test levels and the smallest sufficient boundary

| Level | What it proves | Where MatchPulse uses it | Limit |
| :--- | :--- | :--- | :--- |
| **Unit** | A local rule in isolation | Pure helpers; not used to prove database invariants | Cannot prove integration, persistence or concurrency |
| **Integration / database** | A real boundary between the application and PostgreSQL | Registration capacity, uniqueness, market pricing, resolution, cooldown, double-spend | One database instance and test configuration; migrations and production permissions may differ |
| **End-to-end** | A complete user journey across the declared system boundary | Manual smoke and production-server observation; no browser automation yet | Expensive, brittle; a passing journey does not prove every rule |
| **Acceptance** | An agreed criterion for a change | Issue acceptance criteria and Checkpoint evidence | The criterion can be wrong; it needs validation against the user's need |
| **Regression** | Previously supported behaviour still holds | CI invariant suites on every pull request | Covers only the checks that exist |

The rule is: **use the smallest boundary that can expose the failure, not the smallest boundary that is convenient.**

### 2.4 Oracles, cases and evidence

- **Oracle:** the rule or reference that justifies the expected result. For capacity, the oracle is the tournament's `max_capacity` and the rule that a registration consumes one place. For double-spend, the oracle is the profile balance and the rule that a debit cannot make it negative. The implementation is not its own oracle.
- **Equivalence classes:** group inputs expected to behave the same way. For example, valid budget values, zero/negative budgets, non-integer budgets, and budgets above the balance.
- **Boundary values:** test where a rule changes. For the cooldown ladder, test 5 s, 15 s, 30 s, 45 s, the 600 s cap, and the decay boundary.
- **State and sequences:** test what must remain unchanged. Completing one position must not change another; a refused trade must write nothing.
- **Concurrency:** test interleavings, not just sequential calls. Use `Promise.all` or equivalent, and assert committed state, not only responses.
- **Static analysis:** ESLint, TypeScript and code review catch classes of defects that dynamic tests may miss. They do not replace behavioural evidence.
- **Mocks and stubs:** use them to isolate a collaborator or force a failure; declare what they do not prove. A storage stub does not prove that PostgreSQL committed the data.
- **Coverage:** a map of what ran, not a verdict. A function can have 100% line coverage and still accept an invalid title or a negative balance.

### 2.5 Independence, flakiness and repeatability

Tests should create the state they need and clean up their own effects. A test that passes only because another test ran first is not independent evidence.

**Known gap (FND-005).** The capacity suite's second test reads state produced by the first test, and the uniqueness suite's third test depends on the previous two. Both should be made self-contained or merged into a single test that asserts the scenario and its committed state. This is recorded as an open finding, not hidden.

Other rules:

- Use controlled clocks or seeds when time and randomness are not the property under test.
- Investigate flaky tests; rerunning until green does not explain the cause.
- Avoid brittle tests tied to harmless implementation details.
- Record the environment and the values exercised.

### 2.6 AI role in testing

AI may draft test cases, generate data, propose equivalence classes and review assertions. A human must:

- select and justify the oracle;
- decide the boundary and scope;
- verify that the check can fail for the intended reason;
- accept the residual risk.

AI-generated code and tests can share the same wrong assumption. Review must find an independent rule or counterexample, not just a second fluent explanation. This is the central warning of the L11 review lecture and is recorded in the AI transparency log.

## 3. Specification approach (SDD)

### 3.1 Mode: spec-first per slice, spec-anchored for the domain

MatchPulse does not have a separate `openspec/` directory. It nevertheless practises SDD in a lightweight form:

- **Spec-first per slice:** each issue states the claim type, goal, scope, non-goals and observable Done-when criteria. Substantial work also has an execution plan with intent, current state, decisions, work breakdown, verification, risks and stop conditions.
- **Spec-anchored for the domain:** the kata, domain model, invariants registry and ADRs are maintained as the code evolves. They describe intended behaviour retained across changes, not just one task.
- **Not spec-as-source:** code is not generated from a specification as the primary source of truth. The specification guides implementation; the code and tests are reviewed separately.

This is a legitimate SDD stance. The course's L08 slides describe spec-first, spec-anchored and spec-as-source as maintenance choices, not maturity levels.

### 3.2 Mapping OpenSpec artefacts to existing artefacts

| OpenSpec artefact | MatchPulse equivalent | Where it lives |
| :--- | :--- | :--- |
| `proposal.md` — why and what, scope, non-goals | Issue + execution plan | GitHub issues; `docs/methodology/exec-plans/` |
| `specs/<capability>/spec.md` — requirements and scenarios | Kata, domain model, invariant registry, acceptance criteria | `docs/architecture/kata.md`, `02-domain-model.md`, `checkpoint-A/02-invariants.md` |
| `design.md` — technical approach and trade-offs | ADRs + execution-plan decisions + architecture characteristics | `docs/architecture/adr/`, `03-architecture-characteristics.md`, exec plans |
| `tasks.md` — ordered work | Issue work breakdown, PR checklist, slice table | Issues; execution plans |
| `verify` — implementation matches spec | Invariant tests, fault injection, CI, review decision | `tests/invariants/`, CI, Checkpoint C |
| `archive` — consolidate for future changes | Changelog, AI transparency log, evidence records, supersession notes | `CHANGELOG.md`, `docs/methodology/` |

The mapping is not exact. The existing artefacts are spread across issues, plans, ADRs and tests rather than one change folder. The value — explicit intent, scenarios, design, tasks and evidence — is present; the packaging is different.

### 3.3 What is missing

- No single per-slice `spec.md` with Given/When/Then scenarios and an explicit "what this does not cover" section.
- No per-change archive folder that consolidates the proposal, design, tasks and verify result.
- No maintained capability-spec tree separate from the invariant registry.

These gaps are not automatically defects. They are trade-offs in a one-person project that already has a lot of process. The next section records the OpenSpec decision.

## 4. OpenSpec decision

### 4.1 What OpenSpec is

OpenSpec is a lightweight specification framework. Its workflow is:

```text
explore -> propose -> apply -> verify -> archive
```

`propose` creates a change folder with `proposal.md`, `specs/`, `design.md` and `tasks.md`. `apply` implements the tasks; `verify` checks the implementation against the specification; `archive` consolidates the change for future work. It supports OpenCode and is installed as a CLI tool.

### 4.2 Course stance

The course presents OpenSpec and GitHub Spec Kit as examples of SDD, not as standards. The L08 slides explicitly say:

- SDD does not replace the whole lifecycle.
- Different maintenance choices are not maturity levels.
- Tool documentation is not independent evidence of effectiveness.

The professor's demonstration in L08/L09 showed both the value and the limitation: the tool produced a complete proposal and a working application, but a human still had to check whether the proposal matched the customer's need.

### 4.3 Decision

**OpenSpec is not adopted as a required tool in this increment.** The existing issue, execution-plan, ADR, invariant and test artefacts already implement a lightweight spec-first/spec-anchored practice. Adding a second documentation system now would duplicate artefacts and increase the risk of process theatre.

A **bounded trial is allowed** on one small slice when there is a concrete question it can answer, for example:

- Does a per-slice `spec.md` with scenarios catch a missing rule earlier?
- Does `design.md` force a trade-off to be recorded that the issue would have missed?
- Does `verify`/`archive` reduce drift between the spec and the code?

The trial must be recorded as a decision, not just a tool installation. It should state what the tool added, what it duplicated, what changed in the work, and whether the team would keep it.

### 4.4 Trial procedure (if approved)

1. Choose one bounded slice, such as idempotency keys or the authorization increment.
2. Create `openspec/changes/<change-id>/proposal.md`, `specs/<capability>/spec.md`, `design.md` and `tasks.md`.
3. Run the tool's propose/apply/verify/archive flow.
4. Compare the result with the existing issue + execution plan + ADR + tests.
5. Record the outcome in the AI transparency log and a dated decision note.
6. Keep the trial only if it improves a decision or evidence; otherwise retire it and keep the lightweight practice.

### 4.5 What would change the decision

- Repeated drift between the specification and the code across slices.
- AI generating code from a wrong assumption that a scenario would have caught.
- A need for a maintained capability specification that the invariant registry cannot express.
- Team growth or a second contributor who needs the same per-change context.
- A course or assessment requirement that explicitly asks for the OpenSpec artefact structure.

## 5. Review and AI practices

- Review is examination by someone other than the author. In a one-person project, the current practice is structured self-review plus automated checks and agent role passes. This is a real limitation, not an independent human review.
- A review decision is recorded as **approve**, **revise**, **narrow** or **seek context**. "Looks good" is not a decision.
- A useful review comment links the concern, the consequence and the action. A blocker must be resolved before acceptance.
- AI can draft code, tests, documents and reviews. The human remains responsible for the rule, the evidence and the final decision.
- Review must use an independent rule or counterexample, not just a second AI summary. If AI wrote the code and the test, they may share the same wrong assumption.
- AI provenance records what AI contributed and how it was verified, or states non-use. It is not a label of quality.

## 6. Course mapping

| Course concept | MatchPulse practice | Evidence |
| :--- | :--- | :--- |
| TDD / red-green-refactor | Reserved for pure local rules; not claimed for transactional invariants | This record; checkpoint C test-case process |
| Test levels and smallest sufficient scope | Unit / integration-database / end-to-end / acceptance / regression | `tests/invariants/`; Checkpoint C |
| Oracle and testability | Business rule or acceptance criterion, not the implementation | Checkpoint C quality story |
| Static and dynamic analysis | ESLint, TypeScript, review; runtime tests and fault injection | CI; invariant registry |
| Coverage is a map, not a verdict | Invariant coverage and fault injection, not line coverage | Invariant registry |
| SDD / spec-first / spec-anchored | Issue + execution plan + kata/domain/invariants + ADRs | This record |
| OpenSpec | Optional tool; not adopted; bounded trial allowed | This record |
| Review and AI bias | Independent rule, counterexample, decision record, provenance | AI log; Checkpoint C review decision |

## 7. Limits

- This record describes intentions and current practice; it does not prove that the practices are followed in every slice.
- The test suite has known independence gaps and unverified invariants (FND-002, FND-005).
- There is no independent human review (FND-008).
- There is no load, performance or production evidence (FND-004, FND-006).
- A future OpenSpec trial could change this decision; until then, the lightweight practice is the current truth.
