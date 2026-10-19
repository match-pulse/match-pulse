# MatchPulse — Product Claims & Limits

Three claims, kept separate because they carry different weight and different evidence. Evidence does not have to prove the product will succeed; it has to support or challenge a specific claim.

## 1. Problem claim

**Claim.** Tournament organizers need a registration system that respects the capacity they set. If concurrent requests can exceed it, organizers face overbooked venues and the platform loses their trust.

**Evidence.** None yet. This is a stated problem hypothesis, not an observation. No organizer has been interviewed and no incident has been recorded.

**Limit.** Nothing here establishes that overbooking currently occurs, how often it occurs, or how strongly organizers care. It identifies a risk that would be expensive if realised and cheap to prevent — which is the justification for addressing it early, not evidence that it is a real problem.

**What would strengthen it:** one recorded incident, an organizer interview, or a support history showing capacity disputes.

## 2. Behaviour claim

**Claim.** Given a tournament with a maximum capacity of 32, one hundred concurrent registration requests must produce at most 32 accepted registrations. The stored registration count must be 32, the stored `current_players` value must be 32, and it must never exceed `max_capacity`.

**Evidence.** `tests/invariants/tournament-capacity.test.ts` runs this scenario against the local database (PostgreSQL 17.11). Observed:

```text
$ bun run test
 7 pass
 0 fail
 26 expect() calls
Ran 7 tests across 3 files. [768.00ms]
```

**Status: verified, with a stated method.** The suite is not merely green — it was observed failing. Reintroducing the capacity defect produced `Expected: 32, Received: 100` on the response split and `Expected: <= 32, Received: 100` on committed state, with exit code 1. Details in [`02-invariants.md`](./02-invariants.md) §3.

**Limit even so.** This establishes the scenario on this machine, against one database instance, at this scale. It does not establish behaviour under sustained load, across multiple application instances, or where connections are dropped upstream before reaching a business decision.

**Second claim, also verified.** A repeated registration by the same participant is refused and consumes no second place (INV-02), confirmed by the same fault-injection method.

## 3. Outcome claim

**Claim.** Enforcing capacity correctly reduces registration errors and disputes about who holds a place.

**Evidence.** None. This is an expectation about user and organiser behaviour.

**Limit.** Correct capacity enforcement does not demonstrate increased trust, engagement, attendance or revenue. Those are separate claims requiring separate evidence, and no such evidence exists. Stating the outcome here records what the work is *for*; it does not make it a finding.

## 4. Uncertainty being reduced

The active uncertainty is the **behaviour claim**: can a database operation prevent concurrent requests from exceeding capacity, and can that guarantee be demonstrated by a test that is capable of failing?

This is the right uncertainty to prioritise because the decision depends on it. If a row-level conditional update cannot enforce capacity, the increment's approach changes entirely — the guard would have to move to a reservation or queue model, and the effort already spent would be discarded. Waiting costs nothing beyond effort, because no other claim can be evaluated until this one is settled.

**What would falsify the claim:** a stored registration count above capacity; a stored counter disagreeing with the row count; or a fault-injected run in which the suite still passes.

## 5. Status

| Claim | Status |
| :--- | :--- |
| Problem | Asserted. Untested. |
| Behaviour (capacity) | **Verified**, by a suite observed failing under fault injection. → #54 |
| Behaviour (uniqueness) | **Verified** by the same method. |
| Outcome | Asserted. No evidence. Not claimed as delivered. |