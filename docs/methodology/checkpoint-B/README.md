# Checkpoint B: Operating Model & Feedback

## 1. Document index

- [System Dynamics](./01-system-dynamics.md) — stock, flow, delay and competing mechanisms
- [Operating Model](./02-operating-model.md) — lifecycle, flow, feedback and change rights
- [Flow Evidence](./03-flow-evidence.md) — measured cycle times, waiting, WIP and merge-to-evidence
- [AI Transparency Log](../ai-transparency-log.md)

## 2. Evidence status

Checkpoint B previously reused the Checkpoint A burst test as its evidence. That reuse is withdrawn as a source of operating-model evidence, for three reasons:

1. **It does not measure what an operating model is about.** It reports a database result. It says nothing about cycle time, queue length, work-in-progress, or how long a decision waited for evidence.
2. **It is the same unverified run.** The harness cannot fail and asserts only response counts (see [`../checkpoint-A/README.md`](../checkpoint-A/README.md)). Using one unverified result to support two independent claims doubles its apparent weight without adding any.
3. **It was reused because it was available.** Evidence was selected for convenience rather than because it answered the question at hand. That is the specific failure this checkpoint should catch, and it is recorded rather than hidden.

**What genuine evidence for this checkpoint requires** — now produced in [Flow Evidence](./03-flow-evidence.md) from the repository's own history, within the limits stated there:

| Question | Evidence needed |
| :--- | :--- |
| How long does an increment take from issue to merge? | Timestamps across issues and pull requests |
| Where does work wait? | Time spent in review, and time spent blocked on a decision |
| How long from merge to evidence? | Time between merge and an observed test result |
| Which decisions changed because of evidence? | A dated decision record, not a retrospective claim |

## 3. What the evidence does establish

One genuine, if limited, observation: **the feedback loop was weaker than the operating model claimed.**

The operating model described continuous integration as protection against regressions. In fact CI ran lint and build only, so it could not detect a broken business rule at all. The documentation asserted a control that did not exist. That is a real finding about this project's verification system, and it was corrected in #60 (merged 2026-10-19): the "Domain invariants" job now runs the suites on every pull request.

## 4. Decision

| Belief | Evidence | Limit | Decision |
| :--- | :--- | :--- | :--- |
| Capacity is enforced under burst | Response counts only | Cannot fail; stored state unchecked; single machine | **Reopen.** Build evidence that can fail before believing it. |
| CI protects domain correctness | CI ran; it passed | It never executed a domain test | **Corrected.** Invariant execution added to CI (#60, merged 2026-10-19). |
| Verification keeps pace with claims | Documents asserted guarantees not implemented | — | **Corrected.** Invariants now carry explicit status (#52). |
| Work is tracked on a board | None | No board existed | **Corrected.** Issues are the actual work history. |

## 5. Limits

Everything above is derived from one local environment and one developer. There is no production telemetry, no deployment, and no second reviewer. Claims about operational behaviour beyond this setup remain unverified. The flow measurements in [Flow Evidence](./03-flow-evidence.md) come from the GitHub history of the same single developer.