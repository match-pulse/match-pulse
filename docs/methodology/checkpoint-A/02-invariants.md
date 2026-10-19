# MatchPulse — System Invariants

This registry defines critical business rules and their intended database enforcement mechanisms.

| ID | Invariant | Enforcement |
|---|---|---|
| **INV-01: Kickoff Lock** | Predictions cannot be submitted or changed at or after kickoff. | Transactional PostgreSQL RPC checking match status and database time after acquiring required locks. |
| **INV-02: Prediction Uniqueness** | Each participant has at most one active prediction per match; retries must not charge twice. | Unique database constraint and transactional idempotency handling. |
| **INV-03: Tournament Capacity** | Registrations cannot exceed `max_capacity` or duplicate a participant's registration. | Atomic `register_for_tournament` RPC and database uniqueness constraint. |
| **INV-04: Point Accounting** | Balances cannot become negative; deductions, prediction writes, and ledger entries succeed or fail together. | Conditional balance updates and a single database transaction. |
| **INV-05: Rewards** | Finalized results award points according to scoring rules, without duplicate rewards. | Transactional reward processing and database uniqueness or idempotency controls. |

## Evidence

Required tests under `tests/invariants/`:

- `prediction-lock.test.ts` — kickoff boundaries and concurrent submissions.
- `tournament-capacity.test.ts` — 100 concurrent attempts against capacity 32.
- `points-accounting.test.ts` — deductions, retries, and withdrawals.
- `prediction-rewards.test.ts` — scoring and duplicate reward prevention.

## Verification

The following invariant tests currently pass:

| Test | Status |
|---|---|
| `prediction-lock.test.ts` | Passing |
| `tournament-capacity.test.ts` | Passing |

These tests provide evidence for prediction-locking and tournament-capacity behavior under the scenarios covered. Point-accounting and reward invariants require additional dedicated tests.