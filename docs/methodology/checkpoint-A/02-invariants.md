# MatchPulse — System Invariants

This registry defines critical business rules and their intended database enforcement mechanisms.

| ID | Invariant | Enforcement |
|---|---|---|
| **INV-01: Tournament Capacity** | Registrations cannot exceed `max_capacity`. | Atomic `register_for_tournament` RPC checking `current_players < max_capacity` within a transaction. |
| **INV-02: Registration Uniqueness** | A participant cannot register for the same tournament more than once; retries must not duplicate the record. | Unique database constraint and transactional idempotency handling. |

## Evidence

Required tests under `tests/invariants/`:

- `tournament-capacity.test.ts` — 100 concurrent attempts against capacity 32.

## Verification

The following invariant tests currently pass:

| Test | Status |
|---|---|
| `tournament-capacity.test.ts` | Passing |

These tests provide evidence for tournament-capacity behavior under the scenarios covered. Registration uniqueness requires additional dedicated tests.
