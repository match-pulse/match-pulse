# Checkpoint C — Review Decisions

- **Date:** 2026-11-07
- **Status:** Recorded from the AI transparency log entries dated 2026-10-19. The review decisions below are reconstructions of the recorded decisions, not new approvals.
- **Purpose:** Answer the Checkpoint C question: *what did review change, or what did it deliberately keep?*

The course defines review as a structured examination of a proposed change by someone other than its author. MatchPulse is a one-person project; the current practice is structured self-review plus automated checks and agent role passes. The reviews below are therefore **not independent human peer reviews**. That limitation is recorded rather than hidden (FND-008).

## 1. Review decision 1 — lock order in `close_trade`

### Context

The market engine's approved lock order is:

```text
market -> profile -> cooldown -> position
```

This order is part of decision D9 in the live-market execution plan and ADR-002. It exists to avoid deadlock and to preserve the double-spend guard: the profile row must be locked before a balance is debited, and the position row must not be locked before the profile.

### What review found

The AI's first `close_trade` draft locked the position before the profile. That contradicted the approved lock order. The defect was caught by checking the code against D9 before commit. A single-user test would not have revealed the deadlock risk.

### Decision

**Revise.** Change the draft to lock the profile before the position, preserving the approved order.

### Reason

- The approved order is the contract recorded in ADR-002 and the execution plan.
- Reversing the order can introduce a deadlock between concurrent trades that touch the same market/profile in different sequences.
- The single-user test cannot prove the absence of deadlock; the lock order is a design control, not a test result.

### What changed / what was deliberately kept

| Item | Decision |
| :--- | :--- |
| Lock order | **Changed** in the draft to market → profile → cooldown → position |
| Domain rule | **Kept** — no rule was changed to make the code fit |
| Tests | Existing concurrency tests kept; no new test claimed to prove deadlock absence |
| Scope | Kept within the approved market engine slice |

### AI contribution and independent check

- **AI contribution:** drafted the `close_trade` function and its tests.
- **Human/agent review:** compared the draft against the approved decision D9 and the documented lock order.
- **Independent check:** code inspection + the concurrency suite. The concurrency suite exercises the double-spend and same-market burst, but it does not prove deadlock freedom.
- **Remaining limit:** no independent human reviewer; a single-user test cannot exercise every lock interleaving.

### Revisit condition

Revisit if lock contention is measured, if a deadlock is observed, or if the lock order must change. A change requires an ADR update and a re-run of the concurrency evidence.

## 2. Review decision 2 — cooldown-exit evidence

### Context

The cooldown rule is per user × market: entries are gated by the ladder, but **exits are never blocked**. The existing cooldown suite exercised the gate, ladder, cap, scope and no-escalation behaviour, but it did not assert the exit exemption.

### What review found

The implementation was correct; the evidence was incomplete. A rule that is never asserted is not protected by the suite. The review identified a missing check, not a code defect.

### Decision

**Revise the evidence, keep the implementation.** Add a test that enters a position, keeps the cooldown active, exits the full position, and asserts that the exit succeeds and the cooldown is unchanged.

### Reason

- The exit exemption is part of D8/ADR-002.
- A future change to `close_trade` could accidentally read the cooldown row; the new test would catch it.
- The implementation did not need to change, so the review deliberately kept it.

### Evidence

The recorded result: `bun test --env-file=.env.local tests/invariants/market-lifecycle.test.ts` passed 5 tests with 61 assertions, including the new exit-during-cooldown assertion. The full suite then passed 17 tests with 160 assertions.

### What changed / what was deliberately kept

| Item | Decision |
| :--- | :--- |
| Implementation | **Kept** — `close_trade` never reads the cooldown row |
| Test evidence | **Changed** — added the exit-during-cooldown assertion |
| Domain rule | **Kept** — exits remain exempt |
| Scope | Kept within the lifecycle/cooldown suite |

### AI contribution and independent check

- **AI contribution:** implemented the original cooldown logic and the test additions.
- **Human/agent review:** identified the missing assertion and specified the scenario.
- **Independent check:** the test exercises a different path from the entry gate; the full suite was re-run.
- **Remaining limit:** the exit exemption was not fault-injected. It has a passing test, not an observed-red injection. This is recorded honestly.

### Revisit condition

Revisit if `close_trade` gains a new gate, if the cooldown policy changes, or if a fault injection is added for the exit exemption.

## 3. Review decision summary

| Decision | Type | What changed | What was kept | Limit |
| :--- | :--- | :--- | :--- | :--- |
| Lock order in `close_trade` | Revise | Code lock order corrected to match D9 | Domain rule and approved order | No deadlock proof; no independent human reviewer |
| Cooldown-exit evidence | Revise evidence | Added exit-during-cooldown test | Implementation and rule | Passing test, not fault-injected |

Both decisions are recorded in the AI transparency log (Entry 11 and Entry 15). The review did not merely approve; it changed a defect in one case and changed the evidence in the other. That is the behaviour Checkpoint C asks for.

## 4. What this does not prove

- It does not prove that every review catches every defect.
- It does not make the review independent of the author; the author and reviewer are the same human plus agent role passes.
- It does not prove that the lock order is deadlock-free under every schedule; it records a design review and the available tests.
- It does not replace the need for peer review. FND-008 remains open.
