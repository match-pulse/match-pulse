# MatchPulse — Product Claims & Limits

## 1. Problem Claim

Fans need a reliable points balance when making match predictions. Concurrent requests that spend the same points more than once could undermine fair play and trust in the platform.

- **Limit:** This problem hypothesis does not establish that double spending currently occurs or how strongly it affects user trust. It identifies a risk that the system must prevent.

## 2. Behaviour Claim

Given a participant with one available point, two concurrent prediction requests for different eligible matches must not both spend that point. At most one request succeeds; the balance never becomes negative, and the database records no more than one point deduction.

- **Evidence:** A dedicated PostgreSQL integration test in `tests/invariants/points-accounting.test.ts`.
- **Limit:** The existing prediction-lock and tournament-capacity tests do not, by themselves, prove that concurrent point spending is safe. The claim remains unverified until the dedicated test passes against PostgreSQL.

## 3. Outcome Claim

Preventing duplicate spending is expected to reduce point-accounting errors and disputes over prediction participation.

- **Evidence:** Point-ledger audits, rejected concurrent spending attempts, and reported accounting disputes across tournament cycles.
- **Limit:** Correct point accounting does not, by itself, prove increased user trust, engagement, or revenue.

## 4. Uncertainty Worth Reducing

This increment prioritizes the **Behaviour Claim**: can PostgreSQL prevent concurrent prediction requests from spending the same available points more than once?

The test must verify accepted requests, committed predictions, the final balance, and ledger entries. Prediction creation, point deduction, and ledger recording must succeed or fail atomically. Only observed test results should be reported as evidence.