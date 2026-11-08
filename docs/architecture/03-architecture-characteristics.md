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
| **Fairness** — the market opens only at kickoff, exits are never blocked, and re-entry is cooled down so the crowd signal is not churned | Integrity under concurrency |
| **Time to market** — a solo developer must ship increments without infrastructure work | Deployability, Testability |
| **Match-time traffic** — "hundreds of concurrent spectators" | Elasticity, Performance |
| **Club analytics privacy** — aggregated data sold to clubs must not expose individuals | Security/authorisation, Modularity |

## 3. Selected characteristics (minimal set)

Five characteristics are selected. Selection criterion: a characteristic is only selected if failing it would break a documented business rule or make progress unverifiable.

### 3.1 Elasticity

**Why it matters.** The kata states traffic peaks during matches with hundreds of concurrent spectators. Two moments concentrate load: tournament registration launch, and kickoff, when the market opens and spectators enter positions. Neither is a gradual ramp, so the system must absorb a step change rather than a steady increase.

**How it is measured.** A scripted burst test issues concurrent registrations against a tournament with a known capacity, against the real database (`supabase/migrations/` — `register_for_tournament`). It records accepted, rejected and errored responses, plus p95 latency.

**Target.** Given 100 concurrent requests against a tournament of capacity 32: exactly 32 accepted, exactly 68 rejected with a business reason, 0 unhandled errors, p95 response time under 1 second.

**Status.** Partially measured. The burst test exists and now **asserts committed state** (`tests/invariants/tournament-capacity.test.ts`) — accepted, refused, committed rows, stored counter and `counter <= capacity`. It was demonstrated capable of failing by fault injection (recorded in the invariants registry). It runs on every pull request in CI ("Domain invariants" job, ~2.5 min). The test records p50/p95/max latency for the 100 requests and prints them as a JSON line; CI run [42435007354](https://github.com/match-pulse/match-pulse/actions/runs/42435007354) observed **p50 245.46 ms, p95 463.11 ms, max 479.64 ms**, below the 1-second target in that environment. The target is recorded, not asserted, so it is not yet a passing gate.

**Explicitly not claimed.** The figure of "10,000 fans logging in at kickoff" previously stated here was an unsourced illustrative number, not a requirement. It is removed. The only stated scale is the kata's "hundreds of concurrent spectators", which is itself an unvalidated estimate — see §6.

### 3.2 Deployability

**Why it matters.** MatchPulse is built by one person across two assessment deadlines. The characteristic that matters is not zero-downtime at scale, but *whether an increment can reach a running environment without infrastructure work standing in the way*.

**How it is measured.** Elapsed time from merge on `main` to a successful running environment; count of manual steps required to deploy a schema change; failed deliveries per month. For the course baseline, the `Delivery smoke` CI job starts Supabase, applies migrations, builds, starts the app, waits for health and runs `bun run smoke`; a failed delivery shows as a red job.

**Target.** Merge to a running, verified environment in under 15 minutes for the local/CI baseline. Schema changes are applied only through files under `supabase/migrations/` — never by hand. No manual database step in any release.

**Status.** Measured for the **local/CI baseline**, not for production. `Delivery smoke` runs on every pull request and `main`; `docs/operations/runbook.md` records the release, rollback and recovery steps. The earlier claim that "Next.js + Vercel provides instant CI/CD" described a capability of the chosen platform, not an observed property of this system, and is withdrawn. There is no hosted deployment, so production deploy time and availability remain unmeasured.

### 3.3 Testability

**Why it matters.** The MatchPulse business rules are concurrency rules. They cannot be verified by looking at the interface, and they are the rules most likely to be believed rather than proven. Without automated, failable tests, every architectural claim in this document is unfalsifiable.

**How it is measured.** For each enforced domain invariant: does an automated test exist that **fails** when the invariant is violated? This is verified by fault injection — deliberately weakening a constraint and observing the suite go red — rather than by observing a green run.

**Target.** Every domain invariant recorded in [`docs/methodology/checkpoint-A/02-invariants.md`](../methodology/checkpoint-A/02-invariants.md) has an automated test that fails when the invariant is violated. The suite runs on every pull request. The suite completes in under 3 minutes.

**Status.** Measured, with stated scope. Both enforced invariants (INV-01, INV-02) have automated tests that were **observed failing** under fault injection — the weaker claim "the suite runs and passes" was deliberately not accepted as proof. The suite runs on every pull request (CI job "Domain invariants") and completes in ~2.5 minutes, inside the 3-minute target. Three market mechanisms were also observed failing under injection: the profile lock (double-spend), terminal resolution and the entry-cooldown gate. The remaining market invariants have passing tests but no injection, so they stay Enforced, unverified. The authorization boundary now has its own characteristic and suite (§3.5); all statuses remain explicit in the registry.

### 3.4 Integrity under concurrency

**Why it matters.** Every business rule that moves points — capacity, balances, holdings, one-shot resolution — is a concurrency rule. The kata states two of them directly (participation must never exceed capacity; balances must stay consistent under simultaneous requests); the market adds three more (holdings never negative, market state sums consistent, resolution paid exactly once). A failure here is silent and corrupts the ledger instead of raising an error.

**How it is measured.** For each enforced market invariant: an automated test exists, and the enforcing mechanism is observed **failing under fault injection** — the lock, constraint or guard is deliberately weakened and the suite must go red. Same method as §3.3, applied to the payment paths.

**Target.** The recorded mechanisms (profile lock, terminal resolution, cooldown gate) stay injected-and-red, and every invariant the registry marks "Enforced, unverified" either gains an injection or keeps that label. No payout path may be called Verified from a green run alone.

**Status.** Measured, with stated scope. The profile lock (M-INV4), terminal resolution (M-INV6) and the entry-cooldown gate (M-INV7) were each observed failing under deliberate weakening — a negative balance, an accepted second resolution, and a burst that bypassed the ladder. The remaining market invariants (M-INV1, M-INV2, M-INV3, M-INV5, M-INV8) have passing tests but no injection and stay Enforced, unverified in the [registry](../methodology/checkpoint-A/02-invariants.md).

### 3.5 Security and authorization

**Why it matters.** The system moves points and resolves markets. Before this
increment, anyone with the anon key could act as any participant and call
`resolve_market`. The kata's club-analytics privacy concern also requires an
authorization model that can later distinguish a club reader from a fan.

**How it is measured.** The authorization suite exercises the database as the
anonymous role, two different fans and an organizer. It checks public reads,
private own-row reads, cross-user isolation, organizer-only resolution, denied
direct table writes and the identity-free public trade feed.

**Target.** No anonymous private read or mutation; no cross-user private read;
only an organizer resolves; direct table writes are denied; the service-role key
never reaches the client.

**Status.** Measured. CI run
[42397891717](https://github.com/match-pulse/match-pulse/actions/runs/42397891717)
passed all 21 tests across 6 files, including the 6 authorization tests. The
evidence is local Supabase/PostgreSQL; production session and rate-limit
hardening is not claimed.

**Explicitly not claimed.** There is no organizer management UI, no fine-grained
club-analytics privacy rule, and no production deployment. The service role is a
local test/administration credential, not an application runtime key.

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

**Security vs. simplicity.** The mutation RPCs are `SECURITY DEFINER` because direct table writes are revoked. That gives a small, auditable mutation surface, but every function becomes a high-trust boundary: it must check `auth.uid()`, check the organizer role where required, validate input and fix `search_path`. RLS alone was not enough; direct grants would let a caller write the table the function is supposed to protect. The cost is review discipline and authorization tests; the benefit is a database boundary that does not depend on the UI.

**No CQRS or event sourcing.** A relational model with transactional functions satisfies every invariant currently stated. Event sourcing would add an operational surface, a projection rebuild path and a second failure mode, none of which address a requirement we have. This is a decision to defer, not a claim that the system is unbounded — the removed "99% of tournaments" figure was never supported.

**Future extraction, not current property.** If club analytics becomes a separate workload, the sentiment pipeline could be extracted into its own deployable and scaled independently. That is a *possible future state under stated conditions*, not a property the present modular monolith has. Components inside one deployment do not scale independently today.

## 6. Resolved decisions (2026-10-19)

The three questions previously left open here are decided by the human developer:

1. **Integrity under concurrency is selected** as a first-class characteristic (§3.4). It was already mapped as the first domain concern in §2 and is the risk the whole evidence programme exists to falsify; omitting it from §3 was an inconsistency inherited from an earlier draft.
2. **Scale remains an assumption, not a measurement.** "Hundreds of concurrent spectators" stays in the kata as an unvalidated estimate. No replacement number is invented; every elasticity target that depends on it carries that limit (§3.1) and can be falsified with a load test once a deployment exists.
3. **Deployment is out of scope for this increment.** The deliverable is the repository and its architecture description; no deployment environment is required. §3.2 therefore stays *Specified* and unverified with that reason recorded, rather than treating a missing environment as a system defect.

The structural decisions behind §3.4 are recorded in [ADR-002](./adr/002-live-prediction-market.md).

**Addendum 2026-11-08 — delivery baseline.** Decision 3 remains in force (no hosted deployment), but the repository now has a local/CI delivery baseline: `/api/health`, JSON logs, `bun run smoke`, a `Delivery smoke` CI job, an operations runbook, proposed SLOs and a local backup/restore procedure. This moves §3.2 from *Specified/unverified* to *Measured for local/CI*; it does not create a production environment or a production availability claim.

## 7. Conclusion

The selected characteristics are Elasticity, Deployability, Testability, Integrity under concurrency and Security/authorization. Testability, Integrity under concurrency and Security/authorization are **measured** for the recorded mechanisms (failure observed under injection or authorization tests in CI); Elasticity is partly measured (scenario and committed-state assertions hold in CI; p95 is now observed and recorded, but not asserted against the target); Deployability is **measured for the local/CI baseline** (health, structured logs, smoke and the `Delivery smoke` CI job), while production deployment, external monitoring and production recovery remain unverified. The remaining gaps are explicit: a hosted environment, injections for the unverified market invariants, an organizer management UI and production-scale load evidence are still to be produced.