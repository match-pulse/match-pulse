# MatchPulse — Operating Model (AI-Assisted)

## 1. The chosen approach: human-controlled AI-assisted delivery

This is a **human-controlled, AI-assisted** workflow. It is not AI-driven, and the distinction is not cosmetic.

The course materials distinguish the two. In an AI-driven workflow, AI decides what to build and in what order, and the human reviews the result. In an AI-assisted workflow, the human sets the scope, approves the plan, decides every consequential question, and uses AI to execute and analyse within that boundary.

**Why the assisted model fits this project.** The work being done is dominated by questions that AI has no authority to answer: which business rules are real, which architectural trade-off to accept, which risk is acceptable, and whether the evidence actually supports a claim. Those questions outnumber the implementation questions. A model that lets AI choose the plan would make the portfolio's most valuable evidence — the reasoning — unverifiable.

**What AI is permitted to do:** implement within an approved scope, propose alternatives, draft documents, review code, and run verification commands.

**What remains exclusively human:** business rules, architectural and schema decisions, scope and priority changes, acceptance of residual risk, and every merge.

## 2. Phases and artefacts

| Phase | What happens | Artefact |
| :--- | :--- | :--- |
| **Inception** | Domain, user, claim, uncertainty, non-goals are defined and approved | [`checkpoint-A/01-bounded-proposal.md`](../checkpoint-A/01-bounded-proposal.md), [`kata.md`](../../architecture/kata.md) |
| **Construction** | Work is broken into increments; each is bounded, reviewed and verified before integration | Issues, branches, pull requests, tests, ADRs |
| **Verification** | Each claim is tested against evidence, and the limits of that evidence are recorded | Invariant tests, [`03-product-claims.md`](../checkpoint-A/03-product-claims.md), [`ai-transparency-log.md`](../ai-transparency-log.md) |
| **Operation** | Deployment, observation and recovery | Not yet started — no deployment environment exists |

*Correction to an earlier draft:* the previous version labelled this "AI-Driven Development Lifecycle (AI-DLC)". The described practice was assisted, not driven. The label is corrected. The AI-DLC framing remains relevant only as vocabulary borrowed from the lecture material.

## 3. Flow and feedback

- **Flow:** GitHub Issues, labelled by course (`[DM]`, `[SA]`) and by type (`Setup`, `Test`, `Feature`, `Refactor`). Each issue maps to exactly one branch and one pull request.
- **Work in progress:** one increment open at a time.
- **Feedback:** continuous integration runs on every pull request and every push to `main`.

**Correction to an earlier draft:** the previous version stated that work is tracked on a "GitHub Project Board" with columns `Enter → Build → Review → Release`. No such board was created; the repository had no project scope. Issues are the actual work history, and this document now describes what exists. *Strengthen this:* the pull-request and issue history is genuine evidence of a work flow and of how it changed — it should be read as such, not as decoration.

**What the feedback loop does not yet cover:** continuous integration currently runs lint and build only. It does **not** run the domain invariant tests, so a green check does not yet mean the business rules hold. Adding that is the point of issue #54. Until then, "CI is green" is not evidence of correctness, and must not be reported as such.

## 4. Change absorption policy

If an increment produces more defects than it delivers value, the increment is reduced — never the verification. Cutting tests, loosening an invariant, or relaxing a schema constraint to obtain a passing result is prohibited, at any cost of schedule.

Where a claim turns out to be unsupported by evidence, the claim is corrected or withdrawn in the documentation. It is not softened until it becomes indefensible to remove.

## 5. Who can change a commitment

Short cycles only create real adaptability if commitments can actually change. In this project:

| Commitment | Who may change it | Mechanism |
| :--- | :--- | :--- |
| Increment scope | Project owner | Close or amend the issue; the branch follows |
| Architecture | Project owner | New or superseding ADR |
| Domain rules | Project owner | Update the kata and the invariants registry |
| Delivery sequence | Project owner | Reorder issues |
| Residual risk acceptance | Project owner only | Explicit statement, recorded with rationale |

AI can propose a change to any of these. It cannot apply one.

## 6. Limits of this operating model

- Single developer: there is no second reviewer, so "review" means structured self-review plus automated checks. This is a real weakness — it is why enabling required review on `main` was considered and then declined as infeasible with one account.
- One AI-assisted contributor means the portfolio cannot demonstrate multi-person collaboration, which the course assesses. This is a limitation of the current setup, not a solved problem.
- The verification loop has been weaker than this document described, and is only now being corrected.