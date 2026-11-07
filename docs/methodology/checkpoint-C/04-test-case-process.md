# Checkpoint C — Test-Case Process

- **Date:** 2026-11-07
- **Status:** Process record for the current increments. It describes how test cases are created and where they fit in the quality cycle; it does not claim that every case has been written.
- **Related:** [`../development-practices.md`](../development-practices.md), [`02-quality-story.md`](./02-quality-story.md), [`../checkpoint-A/02-invariants.md`](../checkpoint-A/02-invariants.md)

## 1. Purpose

Checkpoint C asks for a process for creating test cases, even when AI generates them. A test count or a coverage number is not a process. The process must say:

- what starts a test case;
- who selects the oracle;
- where the case sits in the quality cycle;
- how the case is proven capable of failing;
- how the evidence is recorded and reviewed;
- what the case does not cover.

## 2. Process

| Step | Activity | Output | Owner |
| :--- | :--- | :--- | :--- |
| **1. Risk** | Name a possible failure and who could be harmed. Decide whether it deserves evidence. | Risk entry in the risk control map | Human + test engineer |
| **2. Claim** | State the behaviour claim, initial conditions, action and expected observable result. | Testable claim | Test engineer; human approves |
| **3. Oracle** | State the rule or reference that justifies the expected result. Do not use the current implementation as the oracle. | Explicit oracle | Human |
| **4. Boundary** | Choose the smallest boundary that can expose the failure: unit, integration/database, end-to-end or acceptance. | Boundary decision | Test engineer |
| **5. Cases** | Select representative inputs: equivalence classes, boundary values, state/sequence, concurrency, authorization, negative cases. | Case list | Test engineer; AI may draft |
| **6. Assertion** | Write the check with an explicit failure message that includes the input, expected and observed values. | Executable check | Implementation/test engineer |
| **7. Falsification** | Inject a deliberate defect or remove the guard; observe the check fail for the intended reason; restore. | Observed-red evidence | Test engineer |
| **8. Review** | Review the oracle, scope, assertion and limits. Confirm that the check is not circular and that it does not depend on another test. | Review decision | Reviewer; human accepts |
| **9. Record** | Record the command, environment, expected/observed result and limit in the invariant registry and Checkpoint evidence. | Evidence record | Test engineer |
| **10. CI** | Run the suite on every pull request and every push to `main`. | CI run | Automation |
| **11. Revisit** | Re-run when the behaviour changes; add an injection when a rule becomes load-bearing; retire the check when the behaviour is removed. | Updated evidence | Human + test engineer |

## 3. Where test cases sit in the quality cycle

```text
risk -> claim -> oracle -> boundary -> cases -> assertion
     -> local verification -> fault injection -> PR / CI
     -> review decision -> evidence record -> residual risk
     -> production observation (when available) -> revisit
```

- **Before implementation:** the risk, claim, oracle and boundary are decided. This prevents a test from being written to fit the code after the fact.
- **During implementation:** the check is written with the code or immediately after it; the important property is that it can fail, not that it was typed before the first line of implementation.
- **Before merge:** local checks and fault injection provide the strongest evidence; CI re-runs the restored code.
- **After merge:** the evidence is linked from the invariant registry, Checkpoint record and PR. The residual risk is recorded.
- **After deployment:** production monitoring and incident findings can create new risks and cases. This stage is not implemented yet (FND-006).

## 4. Case-selection guidance

| Technique | When to use | MatchPulse example |
| :--- | :--- | :--- |
| **Equivalence class** | Inputs expected to behave the same way | Valid budget, zero/negative budget, non-integer budget, budget above balance |
| **Boundary value** | A rule changes at an edge | Cooldown 5 s, 15 s, 30 s, 45 s, 600 s cap; capacity 32/33 |
| **State / sequence** | A prior action changes what is allowed | Refused trade writes nothing; completing one position does not change another; resolution is terminal |
| **Concurrency** | Shared state can interleave | Two markets spending the same balance; 100 registrations for 32 places; same-market burst |
| **Authorization** | An identity may or may not act | Anon cannot write; a fan cannot resolve a market; a user cannot act as another |
| **Negative / absence** | The important result is that nothing happens | A full tournament writes no row and no counter change; an over-sell writes no partial state |
| **Regression** | Previously supported behaviour could break | The full invariant suite on every PR |

## 5. AI role

AI may:

- draft candidate cases, data and assertions;
- propose equivalence classes and boundary values;
- review a test for missing cases or a weak assertion;
- generate a first version of the test file.

A human must:

- select and justify the oracle;
- decide the boundary and the accepted scope;
- verify that the check can fail for the intended reason;
- confirm that the test is independent and repeatable;
- accept the residual risk.

AI-generated code and tests can share the same wrong assumption. A second AI summary is not independent evidence. The review must find an independent rule or counterexample, as described in the L11 lecture and recorded in the AI transparency log.

## 6. Evidence template

```text
Risk:            R-xx / finding FND-xxx
Claim:           Given ..., when ..., then ...
Oracle:          the business rule or reference that justifies the expectation
Boundary:        unit / integration-database / end-to-end / acceptance
Cases:           equivalence classes, boundaries, state, concurrency, authorization
Injection:       the defect introduced to prove the check can fail
Expected:        the result the oracle requires
Observed:        the actual result, including the failing line when red
Limit:           what the check does not cover
Evidence:        command, environment, date, CI run
Residual risk:   the finding that remains
```

## 7. Known gaps

| Gap | Finding | Consequence |
| :--- | :--- | :--- |
| Capacity second test depends on the first; uniqueness third test depends on the previous two | FND-005 | A test that passes only in sequence is not independent evidence |
| M-INV1, M-INV2, M-INV3, M-INV5 and M-INV8, plus the M-INV7 details, are not fault-injected | FND-002 | Passing tests, but no observed-red proof for those mechanisms |
| No authorization tests at the database boundary | FND-001 | The system is not a security boundary; hiding a button is not enforcement |
| No load/p95 test | FND-004 | Performance and elasticity targets are unmeasured |
| No browser-level end-to-end automation | FND-006 | The UI smoke is manual/observed, not repeatable in CI |

## 8. Review condition

Revisit this process when:

- a new invariant or failure mode is identified;
- a fault injection cannot turn a test red;
- a test is flaky, brittle or dependent on another test;
- the system is deployed and production evidence becomes available;
- AI generates a larger share of the tests or code.

The process is a control, not a guarantee. If it stops producing failable evidence, it should be changed.
