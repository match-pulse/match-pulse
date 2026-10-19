# MatchPulse — Product Claims & Limits

## 1. Problem Claim

Tournament organizers need a reliable registration system when hosting local competitions. Concurrent requests that exceed the maximum capacity could undermine operational stability and destroy trust in the platform.

- **Limit:** This problem hypothesis does not establish that overbooking currently occurs or how strongly it affects organizer trust. It identifies a risk that the system must prevent.

## 2. Behaviour Claim

Given a tournament with a maximum capacity of 32, one hundred concurrent registration requests must not result in more than 32 successful registrations. At most 32 requests succeed; the player count never exceeds the maximum capacity, and the database records no more than 32 new registrations.

- **Evidence:** A dedicated PostgreSQL integration test in `tests/invariants/tournament-capacity.test.ts`.
- **Limit:** The existing tests do not, by themselves, prove that concurrent capacity enforcement is safe under all deployment conditions. The claim remains unverified until the dedicated test passes against PostgreSQL.

## 3. Outcome Claim

Preventing overbooking is expected to reduce registration errors and disputes over tournament participation.

- **Evidence:** Registration audits, rejected concurrent capacity attempts, and reported disputes across tournament cycles.
- **Limit:** Correct capacity enforcement does not, by itself, prove increased user trust, engagement, or revenue.

## 4. Uncertainty Worth Reducing

This increment prioritizes the **Behaviour Claim**: can PostgreSQL prevent concurrent registration requests from exceeding the maximum capacity?

The test must verify accepted requests, committed registrations, the final player count, and capacity limits. Registration creation and capacity increment must succeed or fail atomically. Only observed test results should be reported as evidence.
