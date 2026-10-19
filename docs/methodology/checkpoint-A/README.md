# Checkpoint A: Context, Claims, and Evidence

## 1. The 60-second pitch

> **MatchPulse** is a football tournament platform. **Tournament organizers** running local competitions are the user. They set a maximum number of participants for a tournament, and when several people register at the same instant they need that limit to hold — no overbooking, no arguing about who got the last place.
>
> Our claim is that enforcing capacity as an **atomic database operation**, rather than as an application check, keeps the limit correct under a burst of simultaneous requests. The uncertainty is whether that actually holds when 100 requests arrive at once for 32 places, or whether the database lets some through.
>
> The non-goal is anything else — no payments, no live scores, no brackets. We only want the limit to be right.

## 2. Document index

- [Bounded Proposal & Scope](./01-bounded-proposal.md)
- [System Invariants](./02-invariants.md)
- [Product Claims & Limits](./03-product-claims.md)
- [Governance & Escalation](./04-governance.md)

## 3. Evidence

The scenario is implemented in `tests/invariants/tournament-capacity.test.ts`: 100 concurrent registration requests against a tournament of capacity 32.

A run was recorded on 2026-10-19:

```text
⏳ Running Invariant Test: Tournament Capacity Burst
1. Simulating 100 concurrent registration requests for 32 slots...
Results: 32 succeeded, 68 rejected, 0 network errors.
✅ PASS: The atomic capacity lock successfully prevented overbooking.
```

### This evidence is currently unverified

The transcript above is a record of a run, **not** a verified result. Two defects were found by inspecting the harness:

1. **The test cannot fail.** It prints `FAIL` and exits 0. Nothing in the process reports the failure, so a green run is indistinguishable from a broken one.
2. **It asserts only response counts.** It never checks the committed registration rows or the stored `current_players` value, so it would not detect a database that accepted 32 registrations but recorded a different counter.

Additionally, the test is not executed by continuous integration.

**Consequence:** the behaviour claim in [`03-product-claims.md`](./03-product-claims.md) is recorded but **unverified**, and no downstream document may treat it as established.

## 4. Decision map and next action

- **Decision owner:** the project owner (human). AI proposes; the human decides and merges.
- **Decision:** the behaviour claim remains open pending evidence that can actually fail.
- **Next actions, in order:**
  1. Make the invariant enforceable and testable in the schema (#51) — including the uniqueness rule that was documented but absent.
  2. Convert the tests so that a violated invariant produces a non-zero exit, assert committed state, and clean up after itself (#54).
  3. Prove the harness can fail, by deliberately breaking a constraint and observing the suite go red (#54).
  4. Only then record the result as evidence and update the claims document.
  5. Connect registration to a user-facing path so the increment is genuinely end-to-end (#53).

**Superseded:** an earlier version of this document stated that the behaviour claim "holds true" and that the next action was to build the registration UI. That conclusion was drawn from evidence that cannot fail. The claim is reopened and the UI step is preceded by making the evidence trustworthy.