# MatchPulse — System Invariants

This registry records each critical business rule, where it is enforced, and **what evidence currently exists**. A rule with no enforcement is listed as `Not implemented`. A rule with enforcement but no failable test is listed as `Enforced, unverified`. Neither is presented as satisfied.

## 1. Invariant registry

| ID | Invariant | Enforcement | Status |
| :--- | :--- | :--- | :--- |
| **INV-01** | Registrations must never exceed `max_capacity`, including when requests arrive concurrently. | `register_for_tournament` (`supabase/migrations/20261019_registration_integrity.sql`): pessimistic lock on the tournament row, capacity check, then insert, then increment — all in one transaction. `tournaments_current_players_within_capacity` makes an overbooked counter unrepresentable. | **Verified.** `tournament-capacity.test.ts`, confirmed by fault injection. |
| **INV-02** | A participant cannot register for the same tournament twice; retries must not consume a second place. | Unique constraint `registrations_tournament_user_unique`, plus a `unique_violation` subtransaction in the function that returns `false` instead of raising. | **Verified.** `registration-uniqueness.test.ts`, confirmed by fault injection. |
| **INV-03** | A prediction must be refused at or after kickoff, even if the match status is still `SCHEDULED`. | *Planned:* compare authoritative database time against `kickoff_time` after acquiring the relevant lock. | **Not implemented.** `submit_prediction` checks `status = 'SCHEDULED'` and never reads `kickoff_time`. Belongs to increment 2. |
| **INV-04** | Prediction storage, point deduction and the ledger entry must succeed or fail together. | *Planned:* one transactional database function. | **Not implemented.** The Server Action calls the prediction RPC and then performs a separate read-modify-write on the balance, so a failure between them leaves an accepted prediction with no deduction. |
| **INV-05** | Only authorised users may act on their own data; club analytics must respect data-sharing rules. | *Planned:* Supabase Auth, Row Level Security policies and grants. | **Not implemented.** Zero RLS policies, zero grants. Verified by probing the local API with an arbitrary key: `anon` has full read and write on every table. `retractPrediction` additionally accepts a user id from its caller. |

### Correction to an earlier draft

An earlier version of this table recorded INV-02 as enforced by "unique database constraint and transactional idempotency handling". Neither existed. The rule is now real and tested.

## 2. Tests

| Test | Invariant | Purpose |
| :--- | :--- | :--- |
| `tests/invariants/tournament-capacity.test.ts` | INV-01 | 100 concurrent requests against capacity 32; asserts the accepted/refused split **and** the committed row count, the stored counter, and `counter <= capacity` |
| `tests/invariants/registration-uniqueness.test.ts` | INV-02 | Sequential and concurrent duplicate registrations; asserts refusal, exactly one stored row, and that the counter advanced only once |
| `tests/invariants/prediction-duplicate-prevention.test.ts` | — | Concurrent duplicate predictions; asserts duplicate prevention **only** |

**Renamed.** This file was previously `prediction-lock.test.ts`. It exercises `UNIQUE (user_id, match_id)` and does not test kickoff locking, because INV-03 is not implemented. The old name asserted a guarantee the code does not provide.

## 3. Verification

Environment: local Supabase, PostgreSQL 17.11, migrations replayed onto an empty schema, seed applied.

```text
$ bun run test
bun test v1.4.2 (744846f84)

 7 pass
 0 fail
 26 expect() calls
Ran 7 tests across 3 files. [768.00ms]
```

### The suite was observed failing

A suite that has only ever passed has not been shown to detect anything. Two defects were deliberately reintroduced and the suite re-run.

**Injection 1 — remove the uniqueness constraint and restore the original function.**

```text
(fail) INV-02 registration uniqueness > a repeated sequential registration is refused and consumes no second place
       Expected: false   Received: true

(fail) INV-02 registration uniqueness > concurrent duplicate submissions accept exactly one and consume one place
       Expected: 1      Received: 10
```
Exit code **1**.

**Injection 2 — remove the capacity guard and the CHECK constraints.**

```text
(fail) INV-01 … > accepts exactly 32 of 100 concurrent requests and refuses the rest
       Expected: 32     Received: 100

(fail) INV-01 … > committed state agrees with the capacity limit
       Expected: <= 32  Received: 100
```
Exit code **1**.

Both injections were reverted by replaying all migrations onto an empty schema; the suite returned to 7 pass / 0 fail / exit 0.

**Finding worth recording.** Under injection 1 the capacity tests **still passed**. The original `UPDATE ... WHERE current_players < max_capacity` was, on inspection, already a correct capacity guard — it takes a row lock. The real defect was uniqueness, not capacity. The earlier documentation had mislabelled where the problem was.

### What a green run does and does not establish

It establishes that these scenarios hold, on this machine, against a single database instance, at this scale. It does **not** establish behaviour under sustained load, across multiple application instances, or where connections are dropped upstream before reaching a business decision.

## 4. Current focus

INV-01 and INV-02 are closed for this increment. INV-03, INV-04 and INV-05 remain open and are deliberately not implied by the verified results above. INV-05 in particular means this increment is **not** a security boundary: anyone who can reach the database can act as any participant.