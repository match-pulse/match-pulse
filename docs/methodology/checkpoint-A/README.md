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

```text
$ bun run test
bun test v1.4.2 (744846f84)

 7 pass
 0 fail
 26 expect() calls
Ran 7 tests across 3 files. [768.00ms]
```

Environment: local Supabase, PostgreSQL 17.11, all migrations replayed onto an empty schema, seed applied.

### The suite was observed failing

A green run proves little on its own. Two defects were deliberately reintroduced and the suite re-run:

| Injected defect | Observed | Exit |
| :--- | :--- | :--- |
| Uniqueness constraint removed, original function restored | `Expected: 1, Received: 10` duplicate admissions | 1 |
| Capacity guard and CHECK constraints removed | `Expected: 32, Received: 100`; committed state `Expected: <= 32, Received: 100` | 1 |

Both were reverted by replaying the migrations; the suite returned to 7 pass / 0 fail.

**Finding.** Under the first injection the capacity tests **still passed**. The original capacity guard was already correct — it took a row lock. The real defect was uniqueness, and the earlier documentation had attributed it to capacity. This is why fault injection matters more than a green run.

Full detail in [`02-invariants.md`](./02-invariants.md) §3.

## 4. Decision map and next action

- **Decision owner:** the project owner (human). AI proposes; the human decides and merges.
- **Decision:** the behaviour claim (capacity) and the uniqueness claim are now **verified by a suite demonstrated capable of failing**.
- **Completed:** #51 schema enforcement, #53 end-to-end path, #54 enforceable tests and CI.
- **Next:**
  1. Live market increment: M-INV1–M-INV8 are specified in `02-invariants.md`; enforcement and failable evidence land in #65/#66.
  2. INV-05, authentication and Row Level Security. Until this is done the system is **not** a security boundary, and nothing here should be read as a security claim.
- **Superseded (2026-10-19):** INV-03 and INV-04 were withdrawn when the owner replaced fixed-score predictions with a live market that opens at kickoff. See [`../../architecture/adr/002-live-prediction-market.md`](../../architecture/adr/002-live-prediction-market.md).
- **Superseded:** an earlier version of this document stated the behaviour claim "holds true" and moved straight to building the UI. That conclusion came from evidence that could not fail. The claim was reopened, the evidence made trustworthy, and only then re-closed.