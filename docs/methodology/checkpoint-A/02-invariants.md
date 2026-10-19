# MatchPulse — System Invariants

This registry records each critical business rule, where it is enforced, and **what evidence currently exists**. A rule with no enforcement is listed as `Not implemented`. A rule with enforcement but no failable test is listed as `Enforced, unverified`. Neither is presented as satisfied.

## 1. Invariant registry

| ID | Invariant | Enforcement | Status |
| :--- | :--- | :--- | :--- |
| **INV-01** | Registrations must never exceed `max_capacity`, including when requests arrive concurrently. | `register_for_tournament` (`supabase/migrations/20261019_registration_integrity.sql`): pessimistic lock on the tournament row, capacity check, then insert, then increment — all in one transaction. `tournaments_current_players_within_capacity` makes an overbooked counter unrepresentable. | **Verified.** `tournament-capacity.test.ts`, confirmed by fault injection. |
| **INV-02** | A participant cannot register for the same tournament twice; retries must not consume a second place. | Unique constraint `registrations_tournament_user_unique`, plus a `unique_violation` subtransaction in the function that returns `false` instead of raising. | **Verified.** `registration-uniqueness.test.ts`, confirmed by fault injection. |
| **INV-03** | *Withdrawn — owner decision, 2026-10-19.* The pre-kickoff fixed-score prediction deadline no longer exists; the market opens at kickoff (see M-INV1). | — | **Withdrawn.** Superseded by M-INV1. |
| **INV-04** | *Withdrawn — owner decision, 2026-10-19.* Fixed-score prediction storage and its ledger are retired; market trade atomicity is governed by M-INV2. | — | **Withdrawn.** Superseded by M-INV2. |
| **INV-05** | Only authorised users may act on their own data; club analytics must respect data-sharing rules. | *Planned:* Supabase Auth, Row Level Security policies and grants. | **Not implemented.** Zero RLS policies, zero grants. Verified by probing the local API with an arbitrary key: `anon` has full read and write on every table. `retractPrediction` additionally accepts a user id from its caller. |

### Market invariants (specified for the live market increment)

These replace the withdrawn prediction invariants. Enforcement is landing across issues #65 and #66. A rule is labeled **Enforced, unverified** when code and passing tests exist but the suite has not yet been observed failing under fault injection; it becomes `Verified` only after that observation.

| ID | Invariant | Enforcement | Status |
| :--- | :--- | :--- | :--- |
| **M-INV1** | Entries are accepted only while the market is open (`status = OPEN` and authoritative database time at or after `kickoff_time`); entries at or after resolution are refused; exits are accepted while open. | Window guard inside `open_trade`/`close_trade`, after the market lock. | **Enforced, unverified.** Pre-kickoff and post-resolution refusals tested (`market-lifecycle.test.ts`). The window guard itself was not fault-injected. |
| **M-INV2** | An entry or exit commits the position, the point debit/credit and the trade-log row together, or not at all. | One transaction per RPC; no separate read-modify-write. | **Enforced, unverified.** `open_trade`/`close_trade`; `market-pricing.test.ts` asserts committed state. Atomic rollback was not separately injected. |
| **M-INV3** | A position cannot sell more shares than it holds; holdings never become negative. | Position guard in `close_trade`; `shares >= 0` constraint. | **Enforced, unverified.** Over-sell refused without writes (`market-pricing.test.ts`). Not fault-injected. |
| **M-INV4** | A balance never becomes negative, including concurrent requests from the same user across markets. | Profile row lock plus conditional debit. | **Verified.** `market-concurrency.test.ts` races two 50-point spends against a 60-point balance. Injection removed the profile lock and both point guards: both spends were accepted and the balance reached **−40**. Restored; suite green. |
| **M-INV5** | For every outcome, the sum of held position shares equals the market's outstanding quantity `q`. | Transactional updates of positions and `q` in the same statement path. | **Enforced, unverified.** Bookkeeping assertion in `market-pricing.test.ts`. Not fault-injected. |
| **M-INV6** | Resolution is terminal and pays exactly one point per winning share, once per holder; losing shares pay nothing. | `resolve_market` with a terminal status check and one payout path. | **Verified.** `market-lifecycle.test.ts` pays winners once and refuses a second resolution. Injection removed the terminal check and the payout key: the second call was accepted instead of refused. Restored; suite green. |
| **M-INV7** | Entry cooldown is per user × market: 5 s first rung, then a linear `+15 s` ladder capped at 600 s, decaying one level per five quiet minutes. Refusals do not escalate; exits are exempt. | Cooldown gate in `open_trade`; `close_trade` never reads it. | **Verified for the gate.** Burst test; injection removed the cooldown refusal and 10 of 10 same-market entries were accepted instead of one. Ladder, cap, decay, scope and no-escalation have passing tests (`market-lifecycle.test.ts`) but were not separately injected. |
| **M-INV8** | No commission of any kind: entry debits `ceil(cost)`, exit credits `floor(proceeds)`, and no fee path exists. | RPC formulas; no maker account. | **Enforced, unverified.** Ceil/floor and no-fee assertions in `market-pricing.test.ts`. Not fault-injected. |

### Correction to an earlier draft

An earlier version of this table recorded INV-02 as enforced by "unique database constraint and transactional idempotency handling". Neither existed. The rule is now real and tested.

## 2. Tests

| Test | Invariant | Purpose |
| :--- | :--- | :--- |
| `tests/invariants/tournament-capacity.test.ts` | INV-01 | 100 concurrent requests against capacity 32; asserts the accepted/refused split **and** the committed row count, the stored counter, and `counter <= capacity` |
| `tests/invariants/registration-uniqueness.test.ts` | INV-02 | Sequential and concurrent duplicate registrations; asserts refusal, exactly one stored row, and that the counter advanced only once |
| `tests/invariants/prediction-duplicate-prevention.test.ts` | — | Concurrent duplicate predictions; asserts duplicate prevention **only**. Retires with the fixed-score feature (#67). |
| `tests/invariants/market-pricing.test.ts` | M-INV2, M-INV3, M-INV5, M-INV8 (partial M-INV7) | Budget-bounded entry, `ceil` debit, `floor` credit, profit and proportional-loss exits, over-sell and unaffordable-entry refusals, share bookkeeping, and the first cooldown rung; asserts committed balances, positions and trade rows |
| `tests/invariants/market-lifecycle.test.ts` | M-INV1, M-INV6, M-INV7 | Pre-kickoff refusals, one-shot resolution payout, duplicate-resolution refusal, cooldown ladder/cap/decay/scope and no escalation on refusal |
| `tests/invariants/market-concurrency.test.ts` | M-INV4, M-INV7 | Cross-market double-spend race and same-market burst; both were observed red under fault injection |

**Renamed.** This file was previously `prediction-lock.test.ts`. It exercises `UNIQUE (user_id, match_id)` and does not test kickoff locking, because that rule (INV-03) was withdrawn with the feature. The file itself is removed in #67; it is not evidence for any market invariant.

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

After the market slices (I4): `18 pass / 0 fail` across 6 files.

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

### Market engine injections (2026-10-19)

The market suites were observed failing under three deliberate defects. Each was applied only to the local database, then reverted by re-applying the migration's function (and, where noted, restoring the table constraint/key); the full suite returned to 18 pass / 0 fail across 6 files.

**Injection A — remove the profile lock and both balance guards from `open_trade`.** The layered `points_after >= 0` trade check was also removed, because it otherwise rolled the whole transaction back and the negative balance never persisted.

```text
(fail) market concurrency (M-INV4) > two markets cannot spend the same balance twice
       Expected: 1   Received: 2
```

Direct observation during the injection: two 50-point entries were both accepted against a 60-point balance, and the stored balance was **−40**.

**Injection B — remove the terminal status check from `resolve_market` and the payout primary key.**

```text
(fail) market resolution (M-INV6) > pays winning shares once, leaves losers unpaid and closes the market terminally
       Received value must be an array type, or both received and expected values must be strings.
```

The second resolution returned success instead of the expected "already resolved" refusal.

**Injection C — remove the entry-cooldown refusal from `open_trade`.**

```text
(fail) market concurrency (M-INV4) > a same-market burst accepts exactly one entry and cools the rest down
       Expected: 1   Received: 10
```

All ten same-market entries were accepted.

### What a green run does and does not establish

It establishes that these scenarios hold, on this machine, against a single database instance, at this scale. It does **not** establish behaviour under sustained load, across multiple application instances, or where connections are dropped upstream before reaching a business decision.

## 4. Current focus

INV-01 and INV-02 remain verified. INV-03 and INV-04 are withdrawn with the retired fixed-score feature (owner decision, 2026-10-19); M-INV1–M-INV8 replace them. M-INV4 (profile lock / double-spend), M-INV6 (one-shot resolution) and the gate of M-INV7 (cooldown) are **Verified** by observed failure under fault injection. M-INV1, M-INV2, M-INV3, M-INV5 and M-INV8, plus the ladder/decay details of M-INV7, are **Enforced, unverified**: passing tests, no injection yet. INV-05 remains open and is deliberately not implied by the results above: this increment is **not** a security boundary, and anyone who can reach the database can act as any participant.