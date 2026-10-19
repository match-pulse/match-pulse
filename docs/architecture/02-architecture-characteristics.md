# MatchPulse — Architecture Characteristics

This document derives architectural characteristics from the MatchPulse kata, selects a minimal set, and states how each one will be measured. It deliberately does **not** claim the system maximises every characteristic.

## 1. Status vocabulary

Every claim in this document carries one of these labels. A characteristic with no evidence is labelled, never implied.

| Label | Meaning |
| :--- | :--- |
| **Specified** | A target is defined and agreed. No observation yet. |
| **Measured** | An observation exists, with a named environment and scope. |
| **Unverified** | Asserted somewhere in the repository with no supporting evidence. |
| **Not implemented** | The requirement is documented; the code does not enforce it. |

## 2. Domain concerns → candidate characteristics

| Domain concern (from the kata) | Candidate characteristics |
| :--- | :--- |
| **Integrity of participation and points** — capacity must never be exceeded, balances must stay consistent when requests arrive simultaneously | Integrity under concurrency, Security/authorisation |
| **Fairness** — a prediction must be refused from the moment of kickoff | Integrity under concurrency |
| **Time to market** — a solo developer must ship increments without infrastructure work | Deployability, Testability |
| **Match-time traffic** — "hundreds of concurrent spectators" | Elasticity, Performance |
| **Club analytics privacy** — aggregated data sold to clubs must not expose individuals | Security/authorisation, Modularity |

## 3. Selected characteristics (minimal set)

Three characteristics are selected. Selection criterion: a characteristic is only selected if failing it would break a documented business rule or make progress unverifiable.

### 3.1 Elasticity

**Why it matters.** The kata states traffic peaks during matches with hundreds of concurrent spectators. Two moments concentrate load: tournament registration launch, and kickoff, when spectators submit last predictions. Neither is a gradual ramp, so the system must absorb a step change rather than a steady increase.

**How it is measured.** A scripted burst test issues concurrent registrations against a tournament with a known capacity, against the real database (`supabase/migrations/` — `register_for_tournament`). It records accepted, rejected and errored responses, plus p95 latency.

**Target.** Given 100 concurrent requests against a tournament of capacity 32: exactly 32 accepted, exactly 68 rejected with a business reason, 0 unhandled errors, p95 response time under 1 second.

**Status.** Partially measured. The burst test exists and now **asserts committed state** (`tests/invariants/tournament-capacity.test.ts`) — accepted, refused, committed rows, stored counter and `counter <= capacity`. It was demonstrated capable of failing by fault injection (recorded in the invariants registry). It runs on every pull request in CI ("Domain invariants" job, ~2.5 min). The p95 latency figure in the target is still **not measured** — the suite does not record latency, so that part of the target remains unverified.

**Explicitly not claimed.** The figure of "10,000 fans logging in at kickoff" previously stated here was an unsourced illustrative number, not a requirement. It is removed. The only stated scale is the kata's "hundreds of concurrent spectators", which is itself an unvalidated estimate — see §6.

### 3.2 Deployability

**Why it matters.** MatchPulse is built by one person across two assessment deadlines. The characteristic that matters is not zero-downtime at scale, but *whether an increment can reach a running environment without infrastructure work standing in the way*.

**How it is measured.** Elapsed time from merge on `main` to a successful running deployment; count of manual steps required to deploy a schema change; failed deployments per month.

**Target.** Merge to running environment in under 15 minutes. Schema changes are applied only through files under `supabase/migrations/` — never by hand. No manual database step in any release.

**Status.** Unverified. No deployment is configured in this repository. `.github/workflows/ci.yml` builds and lints on every pull request but does not deploy. The earlier claim that "Next.js + Vercel provides instant CI/CD" described a capability of the chosen platform, not an observed property of this system, and is withdrawn. Measured time is not available because no deployment exists to measure.

### 3.3 Testability

**Why it matters.** The MatchPulse business rules are concurrency rules. They cannot be verified by looking at the interface, and they are the rules most likely to be believed rather than proven. Without automated, failable tests, every architectural claim in this document is unfalsifiable.

**How it is measured.** For each enforced domain invariant: does an automated test exist that **fails** when the invariant is violated? This is verified by fault injection — deliberately weakening a constraint and observing the suite go red — rather than by observing a green run.

**Target.** Every domain invariant recorded in [`docs/methodology/checkpoint-A/02-invariants.md`](../methodology/checkpoint-A/02-invariants.md) has an automated test that fails when the invariant is violated. The suite runs on every pull request. The suite completes in under 3 minutes.

**Status.** Measured, with stated scope. Both enforced invariants (INV-01, INV-02) have automated tests that were **observed failing** under fault injection — the weaker claim "the suite runs and passes" was deliberately not accepted as proof. The suite runs on every pull request (CI job "Domain invariants") and completes in ~2.5 minutes, inside the 3-minute target. INV-03/INV-04/INV-05 are not implemented and marked accordingly in the registry, so the "every enforced invariant" wording holds rather than over-claims.

## 4. Deliberately not selected, and why

| Characteristic | Why not selected |
| :--- | :--- |
| **Scalability** | Nothing in the kata requires growth beyond one deployment. Elasticity covers the actual risk (bursts), which is a different property. |
| **Performance** (sub-second page loads) | No latency requirement exists in the kata. Inventing one would be optimising an unmeasured concern. |
| **Modularity / evolvability** | Valuable, but no current requirement forces a change of shape. Revisit if sentiment analysis is extracted; see §5. |
| **Availability / fault tolerance** | There is no evidence of an availability requirement, and no deployment to measure against. |

Selecting these later is cheap. Selecting them now, without a driver, adds cost and complexity for no stated benefit — which the course explicitly warns against.

## 5. Trade-offs

**Elasticity vs. integrity.** The capacity guard takes a pessimistic lock on the tournament row (`register_for_tournament` in `supabase/migrations/`). Concurrent registrations for the same tournament therefore serialise. This *reduces* peak throughput in exchange for an invariant that is trivially auditable: the check, the insert and the increment all happen under one lock. For a tournament with tens of places this is the right trade — we are optimising for an invariant we can prove, not for a throughput figure nobody has measured.

**Testability vs. time to market.** Writing tests that can actually fail costs days before any user-visible feature exists, and delays the first increment. We accept that cost **for domain invariants only**. We do not extend the same rigour to every function, because the domain rules are where correctness failures are silent and expensive.

**Deployability via managed services vs. control and cost.** Supabase and Vercel were chosen for deployability and time to market. This trades away infrastructure control, deep connection management, and introduces vendor lock-in. Accepted at this stage; §3.2 records that the benefit is intended rather than measured.

**No CQRS or event sourcing.** A relational model with transactional functions satisfies every invariant currently stated. Event sourcing would add an operational surface, a projection rebuild path and a second failure mode, none of which address a requirement we have. This is a decision to defer, not a claim that the system is unbounded — the removed "99% of tournaments" figure was never supported.

**Future extraction, not current property.** If club analytics becomes a separate workload, the sentiment pipeline could be extracted into its own deployable and scaled independently. That is a *possible future state under stated conditions*, not a property the present modular monolith has. Components inside one deployment do not scale independently today.

## 6. Open questions requiring a human decision

1. **Is data integrity under concurrency missing from the selected set?** §2 maps it as the first domain concern, and the entire Checkpoint A increment exists to test it — yet §3 does not select it. The current set is inherited from an earlier draft. Either it should be selected as a first-class characteristic, or the omission needs a stated rationale. *Not decided here.*
2. **What is the real scale?** "Hundreds of concurrent spectators" in the kata is an estimate, not a measurement. Every elasticity target depends on it.
3. **Is deployment part of the deliverable?** §3.2 cannot be measured until a deployment target environment exists.

## 7. Conclusion

The selected characteristics are Elasticity, Deployability and Testability. Testability is **measured** for enforced invariants (failing observed, CI-run); Elasticity is partly measured (scenario and committed-state assertions hold in CI; p95 latency unmeasured); Deployability remains unverified until a deployment target exists. The remaining gap is not missing structure but missing measurement: latency figures and a running deployment are still to be produced.