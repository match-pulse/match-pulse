# MatchPulse — Product Claims & Limits

Three claims, kept separate because they carry different weight and different evidence. Evidence does not have to prove the product will succeed; it has to support or challenge a specific claim.

## 1. Problem claim

**Claim.** Tournament organizers need a registration system that respects the capacity they set. If concurrent requests can exceed it, organizers face overbooked venues and the platform loses their trust.

**Evidence.** None yet. This is a stated problem hypothesis, not an observation. No organizer has been interviewed and no incident has been recorded.

**Limit.** Nothing here establishes that overbooking currently occurs, how often it occurs, or how strongly organizers care. It identifies a risk that would be expensive if realised and cheap to prevent — which is the justification for addressing it early, not evidence that it is a real problem.

**What would strengthen it:** one recorded incident, an organizer interview, or a support history showing capacity disputes.

## 2. Behaviour claim

**Claim.** Given a tournament with a maximum capacity of 32, one hundred concurrent registration requests must produce at most 32 accepted registrations. The stored registration count must be 32, the stored `current_players` value must be 32, and it must never exceed `max_capacity`.

**Evidence.** `tests/invariants/tournament-capacity.test.ts` runs this scenario against the local database. A run was recorded on 2026-10-19 reporting 32 accepted, 68 rejected and 0 transport errors.

**Status of that evidence: unverified.** Two reasons, both established by inspecting the harness rather than by re-running it:

1. **The test cannot fail.** It writes `FAIL` to the console and exits 0. A passing exit status therefore carries no information about the invariant, and the recorded output cannot be distinguished from a fabricated one.
2. **It asserts too little.** It counts responses. It never queries the committed registration rows or the stored counter, so even a correct-looking run would not establish that the database is internally consistent.

**Limit even once the harness can fail.** A green run would establish only that this scenario holds, on this machine, against a single database instance. It would not establish behaviour under sustained load, across multiple application instances, or where connections are dropped upstream before reaching a business decision.

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
| Behaviour | Recorded, unverified. Harness cannot fail. → #54 |
| Outcome | Asserted. No evidence. Not claimed as delivered. |