This is the Task 2 source. It selects the few qualities that matter, links each
to the broad requirements R1–R8, and states the level the system needs. Evidence
and measurement detail stay in the linked records.

## 1. Selection

I use the course's 9+1+1 list and add **reliability** and **security** because
the course treats them as operational and implicit characteristics. I keep five.
The test: if this quality fails, does a documented business rule break, or can I
no longer trust the system? If not, it is a design consideration, not a primary
target.

| Characteristic | R points | Why it matters | Needed level (1–5) | Quantified target |
| :--- | :--- | :--- | :---: | :--- |
| **Reliability** | R2, R3, R5, R7 | Capacity, balances, positions, tickets and settlement are concurrency rules. A failure is silent and corrupts the ledger. | **5** — release-critical | 100 concurrent requests against capacity 32: exactly 32 accepted, 68 refused for a business reason, 0 transport errors, committed state matches the counter. No negative balance. Every winning share paid once. A retry with the same key and payload is replayed, not charged twice. |
| **Security** | R1, R2, R3, R4, R7, R8 | Staff-only management, the points ledger, attendee identity and club isolation create a trust boundary. The UI cannot be the boundary. | **5** — release-critical | 0 anonymous private reads or mutations; 0 cross-club reads; 0 direct table writes; only `OWNER`/`ADMIN`/`STAFF` resolve a club market; `ANALYST` sees aggregates only; no service-role key in the app runtime. |
| **Testability** | R2, R3, R5, R7 | The core rules are concurrency and authorization rules; inspection cannot prove them. | **5** — release-critical | Every critical invariant has a database-backed test that has been observed failing under a deliberate mutation; the full suite runs on every pull request in under 3 minutes. |
| **Deployability** | R1–R8 | A one-person project across two course deadlines cannot spend days on infrastructure. | **3** — measured, not a production gate | Clean checkout to a running, verified local/CI environment in under 15 minutes; zero manual database steps beyond environment values; migrations replay from an empty schema. |
| **Elasticity** | R2, R4, R5 | Match traffic is a step change at kickoff, not a gradual ramp. | **3** — measured, not a production gate | Under 100 concurrent registrations and 20 concurrent ticket purchases, p95 < 1,000 ms in the named CI environment, asserted by tests; no unhandled transport errors; after the burst, no unbounded work or connections. |

### Scale

1 = not needed; 2 = best effort; 3 = target defined and measured manually;
4 = measured in CI, not a release gate; 5 = release-critical and backed by
observed-red evidence.

## 2. What each target means

**Reliability.** The system must be correct when many people act at once. A
capacity refusal is a business answer, not an error. The same rule applies to
ticket sales, points, positions, ticket codes and resolution. The target is
stated per burst because "correct under load" without a load is not measurable.

**Security.** Authorization is a database property, not a hidden button. The
target names the zeroes that matter: no anonymous private access, no cross-club
read, no direct write, no service-role key in the runtime. Role and entitlement
checks are part of the target because a club analyst must not see attendee
identity and a canceled plan must not grant features.

**Testability.** A passing test is not evidence unless it can fail. The target is
a failable, database-backed test for each critical rule, run on every change. The
suite must stay under three minutes so the feedback loop remains useful.

**Deployability.** The target is reproducibility for one developer and one CI
runner: a clean checkout, one local stack, one migration replay, one build, one
health check. It is not a production availability target.

**Elasticity.** The target is the match-time burst, not steady growth. p95 is
measured in the named CI environment; the post-peak resource release is part of
the target but is not claimed without a deployed environment.

## 3. Deliberately not selected

- **Performance** separately: the burst p95 is covered by elasticity.
- **Scalability**: the kata states match-time peaks, not growth beyond one
  deployment.
- **Fault tolerance**: no hardware-failure or multi-node availability target.
- **Availability**: no hosted service, so an availability target would be fiction.
- **Modularity, simplicity, maintainability, evolvability**: design choices and
  consequences of the modular monolith, not separate success drivers.
- **Overall cost and partitioning type**: constraints and design dimensions, not
  qualities the system exhibits.

## 4. Agile note

These five characteristics are the **smallest useful set**, not a scorecard. They
act as fitness functions: the database tests for reliability and security, the
fault-injection matrix for testability, the CI delivery job for deployability and
the burst p95 tests for elasticity. If the evidence changes, the target changes
through a decision record, not by silently editing this table.

## 5. Detail

- Enforcement and test status: [invariant registry](../methodology/checkpoint-A/02-invariants.md)
- Fault-injection matrix: [verification record](../methodology/verification/2026-11-181-fault-injection.md)
- Delivery and recovery: [verification record](../methodology/verification/2026-11-111-delivery-operations-baseline.md)
- p95 gate and ticket burst: [verification record](../methodology/verification/2026-11-199-p95-gate.md)
- Broad and detailed requirements: [requirements.md](./requirements.md)
