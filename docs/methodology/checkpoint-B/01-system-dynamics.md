# MatchPulse — System Dynamics

## 1. Declared Why vs. Observed Goal

- **Declared Why:** To provide fair and accessible tournament registration for local football fans.
- **Observed Goal (Reality):** The system is built to enforce the venue's physical limit. When demand exceeds capacity, the system's purpose shifts from maximising accepted registrations to refusing them cleanly and visibly. Protecting the organiser from an overbooked venue takes precedence over accepting every applicant.

This gap is not a defect. It is the tension the increment exists to manage, and it is visible to the participant, who receives a rejection rather than a confirmation.

## 2. Stocks, Flows, and Delays

**Stock:** *Available registration slots* — the remaining capacity of a tournament
(`tournaments.max_capacity - tournaments.current_players`).

| Flow | Direction | Description |
| :--- | :--- | :--- |
| **Outflow** | stock decreases | Each **accepted** registration permanently consumes one slot. |
| **Inflow** | stock increases | **There is none.** No cancellation, withdrawal or seat-release operation exists in the system today. |

**Correction to an earlier draft.** The previous version of this document listed *incoming registration requests* as an inflow into available slots. That is wrong: a request does not create capacity. It is better modelled as the **demand stream that the outflow is serviced from**, not as a flow into the stock.

**Delay:** the interval between a user submitting a registration and receiving either a confirmation or a business-level rejection.

**Consequence of having no inflow.** Because nothing replenishes capacity, a tournament is a one-way ratchet: once a place is taken it cannot be returned. Capacity only resets when the tournament is created again. Whether cancellation should exist is a **domain question for the product owner** — it changes what "fair registration" means, and it is not decided here. It is recorded so that a future cancellation feature is not mistaken for a minor addition.

## 3. Competing Mechanisms — why are the excess requests refused?

When 100 users attempt to register for a 32-place tournament simultaneously, requests fail for reasons that look identical from the outside. Two mechanisms could account for the observed refusals:

1. **Mechanism A — capacity guard.** The database refuses the request because capacity is exhausted. The refusal is *correct* and carries a business meaning.
2. **Mechanism B — resource exhaustion.** Requests fail before reaching a business decision, because a connection pool, socket limit or network is saturated. The refusal is *accidental* and the user sees an error, not a message.

**Why this matters.** The two are indistinguishable to a participant and completely different to the organiser. Mechanism A means the tournament is full and the capacity promise held. Mechanism B means the system failed and the capacity promise was never tested. Treating them as the same thing is the specific error this analysis is meant to prevent.

**Discriminating evidence.** Mechanism A implies that refusals stop exactly at capacity and that the stored counter matches the number of stored registrations. Mechanism B implies refusals distributed unpredictably across the burst, a stored count *below* capacity, and a non-zero count of transport-level errors.

**Current status.** The burst test reports a refusal count consistent with Mechanism A and zero transport errors. That is *consistent with* Mechanism A; it does not by itself exclude Mechanism B in an environment that silently drops connections upstream. The discriminating evidence — comparing the stored row count and stored counter against capacity — was not collected, because the test asserted only on response counts. This is corrected in #54.

## 4. Falsifiable Diagnosis

- **Claim:** Under a concurrent burst, capacity is enforced in the database and the refusal is a business outcome rather than an infrastructure failure.
- **What would falsify it:** a stored registration count above capacity; a stored `current_players` disagreeing with the row count; any non-zero transport error; or refusals that do not stop at the capacity boundary.
- **Next evidence source:** the same burst test asserting committed state, plus measurement of connection-pool saturation during the burst — which is the one place Mechanism B remains genuinely open.

## 5. Limits of this analysis

This diagnosis is based on a single local scenario: one tournament, one burst, one database instance. It says nothing about behaviour across multiple application instances, about sustained load, or about what happens when capacity is reached gradually rather than instantaneously. No production telemetry exists, because there is no production deployment.