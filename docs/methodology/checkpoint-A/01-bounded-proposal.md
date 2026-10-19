# MatchPulse — Bounded Proposal & Scope

## 1. User and problem context

**User:** Tournament organizers running local competitions.

**Problem:** Organizers set a maximum number of participants for a tournament. When several people register at the same moment, an application-level check can let more registrations through than there are places, producing an overbooked venue and a dispute about who holds a place. The organizer needs the limit they set to hold regardless of how requests interleave.

This is a stated hypothesis about a risk, not an observed incident. No organizer has been interviewed and no failure has been recorded.

## 2. Thin end-to-end behaviour

A spectator opens a tournament and requests a place. The system records the registration and increments the tournament's player count as a single database operation, and confirms the request. If the tournament is already at capacity, the request is refused with a business reason and nothing is written.

The behaviour spans the interface, the application boundary and the database, because the guarantee is only meaningful if it holds end to end — a correct function called behind a permissive interface is not a user-facing guarantee.

## 3. Core uncertainty

**Concurrency and atomicity.** If a tournament has exactly 32 available places and 100 users submit at the same instant, does the system allow all 100 to register, or does it correctly accept at most 32?

This is the uncertainty worth reducing now, because the answer determines whether the approach is viable at all. If a conditional database update cannot enforce capacity under concurrency, the guard would need to move to a reservation or queue model, and the work done so far would be discarded. Waiting costs effort but no committed cost.

## 4. Deliberate non-goals

- No payment processing or ticket sales.
- No live scoreboard, timer or real-time score integration.
- No bracket generation or match scheduling.
- No rewards, points ledger or ticket discount redemption.
- No club analytics.
- No authentication, RLS, or production hardening — recorded as gaps, not silently absorbed into this increment.

## 5. Acceptance criteria

Observable conditions for the increment to count as complete.

| # | Criterion | How it is checked |
| :--- | :--- | :--- |
| AC-1 | A registration request for a tournament at capacity is refused, and no row and no counter change are written | Automated test |
| AC-2 | 100 concurrent requests against capacity 32 yield exactly 32 accepted registrations | Automated test |
| AC-3 | The stored registration count is 32, the stored `current_players` is 32, and `current_players <= max_capacity` | Automated test querying committed state |
| AC-4 | A repeated registration by the same participant is refused and consumes no second place | Automated test |
| AC-5 | A user can complete the behaviour from the interface without calling the database directly | Manual demonstration |
| AC-6 | The test suite **fails** when a constraint is deliberately weakened | Fault injection, reverted afterwards |
| AC-7 | The suite runs on every pull request | CI configuration and an observed run |
| AC-8 | Every invariant is either tested or explicitly marked not implemented | Review of the invariants registry |

**AC-6 is deliberately the first acceptance criterion to satisfy.** A suite that has only ever passed has not been shown to detect anything, and treating its green result as evidence would repeat the error that reopened this claim.

## 6. Relationship to the product

This increment is one slice of the MatchPulse kata, not the whole product. The kata also covers ticketing, live predictions, rewards and club analytics. Those remain unimplemented and are not implied by anything here.