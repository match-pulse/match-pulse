# MatchPulse — System Invariants

This registry records each critical business rule, where it is enforced, and **what evidence currently exists**. A rule with no enforcement is listed as `Not implemented`. A rule with enforcement but no failable test is listed as `Enforced, unverified`. Neither is presented as satisfied.

## 1. Invariant registry

| ID | Invariant | Enforcement | Status |
| :--- | :--- | :--- | :--- |
| **INV-01** | Registrations must never exceed `max_capacity`, including when requests arrive concurrently. | `register_for_tournament` (`supabase/migrations/`) performs a conditional, atomic increment. | **Enforced, unverified.** A burst test exists but cannot fail the build and does not assert committed state. → #54 |
| **INV-02** | A participant cannot register for the same tournament twice; retries must not duplicate the record or consume a second slot. | *Planned:* unique constraint on `registrations (tournament_id, user_id)`, plus a duplicate-aware function. | **Not implemented.** No such constraint exists in the schema today. → #51 |
| **INV-03** | A prediction must be refused at or after kickoff, even if the match status is still `SCHEDULED`. | *Planned:* compare authoritative database time against `kickoff_time` after acquiring the relevant lock. | **Not implemented.** `submit_prediction` checks `status = 'SCHEDULED'` and never reads `kickoff_time`. Belongs to increment 2. |
| **INV-04** | Prediction storage, point deduction and the ledger entry must succeed or fail together. | *Planned:* one transactional database function. | **Not implemented.** Today the Server Action calls the prediction RPC and then performs a separate read-modify-write on the balance, so a failure between them leaves an accepted prediction with no deduction. |
| **INV-05** | Only authorised users may act on their own data; club analytics must respect data-sharing rules. | *Planned:* Supabase Auth, Row Level Security policies and grants. | **Not implemented.** There are zero RLS policies and zero grants. Verified by probing the local API with an arbitrary key: `anon` has full read and write on every table. → later increment |

### Correction to an earlier draft

The previous version of this table stated that INV-02 was enforced by "unique database constraint and transactional idempotency handling". Neither existed in the schema. The rule is real; the enforcement was not. It has been moved to `Not implemented` until it is genuinely in place.

## 2. Required tests

| Test | Invariant | Purpose |
| :--- | :--- | :--- |
| `tests/invariants/tournament-capacity.test.ts` | INV-01 | Concurrent burst; assert accepted **and committed** counts agree with capacity |
| `tests/invariants/registration-uniqueness.test.ts` | INV-02 | Duplicate registration returns a business rejection and consumes no second slot |
| `tests/invariants/prediction-duplicate-prevention.test.ts` | — | Concurrent duplicate predictions for one match; asserts duplicate prevention only |

**Renamed.** This file was previously called `prediction-lock.test.ts`. It exercises the `UNIQUE (user_id, match_id)` constraint and does **not** test kickoff locking, because INV-03 is not implemented. The old name asserted a guarantee the code does not provide.

## 3. Verification status

| Test | Status |
| :--- | :--- |
| `tournament-capacity.test.ts` | **Cannot fail the build.** Logs a failure message and exits 0. Cannot be reported as a passing test. |
| `prediction-duplicate-prevention.test.ts` | **Cannot fail the build.** As above. |

The suite is also absent from continuous integration, so nothing in the repository currently prevents a change that breaks an invariant from being merged.

**What a passing run would and would not establish.** Even once the harness can fail, a green run would establish only that this specific scenario holds against this database on this machine. It would not establish behaviour across multiple application instances, under sustained load, or in an environment that silently drops connections upstream. Those limits are recorded in [`../checkpoint-B/01-system-dynamics.md`](../checkpoint-B/01-system-dynamics.md).

## 4. Current focus

INV-01 is the active claim. INV-02 is being added because it is the same concern — a registration must not consume capacity it has not earned — and leaving it unenforced while claiming capacity correctness would be a partial guarantee. INV-03, INV-04 and INV-05 are recorded as gaps and deliberately left for later increments.