# MatchPulse — System Invariants

This registry records each critical business rule, where it is enforced, and **what evidence currently exists**. A rule with no enforcement is listed as `Not implemented`. A rule with enforcement but no failable test is listed as `Enforced, unverified`. Neither is presented as satisfied.

## 1. Invariant registry

| ID | Invariant | Enforcement | Status |
| :--- | :--- | :--- | :--- |
| **INV-01** | Registrations must never exceed `max_capacity`, including when requests arrive concurrently. | `register_for_tournament` (`supabase/migrations/20261019_registration_integrity.sql`): pessimistic lock on the tournament row, capacity check, then insert, then increment — all in one transaction. `tournaments_current_players_within_capacity` makes an overbooked counter unrepresentable. | **Verified.** `tournament-capacity.test.ts`, confirmed by fault injection. |
| **INV-02** | A participant cannot register for the same tournament twice; retries must not consume a second place. | Unique constraint `registrations_tournament_user_unique`, plus a `unique_violation` subtransaction in the function that returns `false` instead of raising. | **Verified.** `registration-uniqueness.test.ts`, confirmed by fault injection. |
| **INV-03** | *Withdrawn — owner decision, 2026-10-19.* The pre-kickoff fixed-score prediction deadline no longer exists; the market opens at kickoff (see M-INV1). | — | **Withdrawn.** Superseded by M-INV1. |
| **INV-04** | *Withdrawn — owner decision, 2026-10-19.* Fixed-score prediction storage and its ledger are retired; market trade atomicity is governed by M-INV2. | — | **Withdrawn.** Superseded by M-INV2. |
| **INV-05** | Only authorised users may act on their own data; club analytics must respect data-sharing rules. | Supabase Auth, `profiles.role`, RLS policies, least-privilege grants, `auth.uid()` in every mutation RPC, organizer check in `resolve_market`. | **Verified for the platform boundary.** The authorization suite passes in CI (run [42397891717](https://github.com/match-pulse/match-pulse/actions/runs/42397891717)): anonymous private reads and mutations denied, fan own-row isolation, organizer-only resolution, direct writes denied. The separate club-analytics privacy rule remains **not implemented**; no analytics export exists. |

### Authorization invariants (implemented 2026-11-07)

These are the boundary rules verified by `tests/invariants/authorization.test.ts`.
They are separate from the market invariants below.

| ID | Invariant | Enforcement | Status |
| :--- | :--- | :--- | :--- |
| **A-INV1** | Anonymous visitors may read only public tournament/match/market/trade data and cannot execute mutations. | RLS public-read policies; grants revoked from `anon` for private tables and mutation RPCs. | **Verified.** Authorization suite; CI run 42397891717. |
| **A-INV2** | A fan may read only their own profile, registration, positions, trades, payouts and cooldown. | Own-row RLS policies using `auth.uid()`; private table grants only to `authenticated`. | **Verified.** Authorization suite; CI run 42397891717. |
| **A-INV3** | Only an authorized club member or legacy organizer may resolve a market. | `resolve_market` checks club membership/role for club-owned markets and keeps the legacy organizer rule for non-club markets. | **Verified.** Fan refusal, club success and legacy organizer success in the authorization/v3 suites. |
| **A-INV4** | Direct table writes are denied; mutations go through authorized RPCs. | `REVOKE ALL` from `anon`/`authenticated`; no insert/update/delete policies; `SECURITY DEFINER` RPCs with explicit checks. | **Verified.** Direct update/insert attempts are denied in the authorization suite. |
| **A-INV5** | The public trade feed exposes trades without identity or per-user balance. | `market_public_trades` returns only safe columns. | **Verified.** Response contains no `user_id` or `points_after`. |

### v3.0.0 tenancy, ticketing and privacy invariants (implemented 2026-11-09)

These are verified by `tests/integration/v3-club-tenancy.test.ts`, the CLI suite and the E2E/axe suite.

| ID | Invariant | Enforcement | Status |
| :--- | :--- | :--- | :--- |
| **T-INV1** | A club member cannot read or mutate another club's events, orders, attendees, tickets, members or insights. | Club-scoped RLS + `is_club_member`/`has_club_role` in RPCs. | **Verified.** Cross-club attendee/order/insight refusals; CLI denial. |
| **T-INV2** | Club roles are enforced: `OWNER` > `ADMIN` > `STAFF` > `ANALYST`; an `ANALYST` is read-only and cannot read attendee identity. | Role checks in membership/event/ticket/analytics RPCs. | **Verified.** Role matrix tests and attendee denial. |
| **T-INV3** | Only an `ACTIVE` subscription grants entitlements; plan limits are enforced. | `has_entitlement`/`entitlement_limit`; RPC checks; STARTER/PRO/ELITE tests. | **Verified.** STARTER prediction denial; PRO success; ELITE export. |
| **T-INV4** | A buyer may buy 1–4 named tickets; each requires identity data and terms acceptance; the maximum per buyer is enforced cumulatively per event across orders and channels. | `purchase_ticket` transaction + `ticket_orders_buyer_limit` trigger + attendee validation. | **Enforced, unverified by independent verification.** Sequential and concurrent cumulative-cap tests pass; full-suite/fault-injection evidence pending. |
| **T-INV5** | Ticket sales never exceed the event `max_capacity`, the event `ticket_allocation` or the ticket-type allocation; a club event cannot configure allocation above capacity. | Ticket type/event locks + counts; `tournaments_capacity_config` and `tickets_capacity_guard` triggers. | **Enforced, unverified by independent verification.** Oversized-allocation and purchase-capacity tests pass; full-suite/fault-injection evidence pending. |
| **T-INV6** | Purchase and check-in are idempotent; a second check-in does not create duplicate attendance. | Request id + unique order; ticket code check-in guard. | **Verified.** Retry and second-check-in tests; CLI. |
| **T-INV7** | Fan-card, transferability, transfer-deadline, away-sector and box-office rules are enforced. | Ticket type rules + attendee validation + channel check. | **Verified.** Fan-card refusal/success, transfer, box office. |
| **T-INV8** | Clubs see aggregate prediction data only; cohorts below 5 are suppressed; no attendee identity is included. | `club_prediction_insights` + privacy rule. | **Verified.** Suppression and no-identity assertions; CSV aggregate. |
| **T-INV9** | The platform admin is scoped and audited; no impersonation or fan-point override. | Separate `platform_admins`, scoped RPCs, audit rows. | **Verified.** Admin plan assignment/audit; owner denial. |
| **T-INV10** | Attendee identity is removable after the retention window without losing ticket/order/audit; recent tickets keep identity. | `cleanup_expired_attendee_data`, service-role only. | **Verified.** Old/recent ticket test; authenticated denial. |
| **T-INV11** | Legacy claim and registration paths are available only for tournaments with no club; v3 club events use nominal ticketing. | `claim_ticket`/`register_for_tournament` club guard; legacy fan pages filter to `club_id IS NULL`. | **Enforced, unverified by independent verification.** V3 claim refusal and registration refusal tests pass; legacy path covered by the MVP backend suite; full-suite evidence pending. |
| **T-INV12** | Reward redemption requires a request key; the same key and payload replays the recorded code without a second debit, and a different payload is refused. | `reward_redemptions` request key/index; `redeem_reward` reward → profile → replay → eligibility → debit lock order. | **Enforced, unverified by independent verification.** Replay, payload-mismatch and concurrent-duplicate tests pass; full-suite evidence pending. |

### Market invariants (specified for the live market increment)

These replace the withdrawn prediction invariants. Enforcement and the first evidence landed in #65 and #66; the prototype UI landed in #67. A rule is labeled **Enforced, unverified** when code and passing tests exist but the suite has not yet been observed failing under fault injection; it becomes `Verified` only after that observation.

| ID | Invariant | Enforcement | Status |
| :--- | :--- | :--- | :--- |
| **M-INV1** | Entries are accepted only while the market is open (`status = OPEN`), authoritative database time is at or after `kickoff_time`, the match is not `FINISHED` and the event is not `CANCELLED`; entries at or after resolution are refused. Exits are accepted while open, including after `FINISHED` and during an entry cooldown. | `market_trades_market_window` and `enforce_prediction_enabled` triggers, plus the window guard inside `open_trade`/`close_trade`. | **Enforced, unverified by fault injection.** `market-lifecycle.test.ts` covers post-`FINISHED` entry refusal, exit after `FINISHED` and disable-predictions exit; independent verification pending. |
| **M-INV2** | An entry or exit commits the position, the point debit/credit and the trade-log row together, or not at all. | One transaction per RPC; no separate read-modify-write. | **Verified by forced-failure rollback.** `tests/fault-injection/atomic-rollback.fault.ts` forces a trade-insert failure and asserts no partial balance, position or trade survives (CI 42474762811). This is not an observed-red mutation: PostgreSQL function atomicity cannot be broken without a second connection. The limit is recorded in the verification record. |
| **M-INV3** | A position cannot sell more shares than it holds; holdings never become negative. | Position guard in `close_trade`; `shares >= 0` constraint. | **Verified.** `market-pricing.test.ts`; fault injection removed the position guard and the non-negative constraints, and the over-sell test failed (CI 42474762811). |
| **M-INV4** | A balance never becomes negative, including concurrent requests from the same user across markets. | Profile row lock plus conditional debit. | **Verified.** `market-concurrency.test.ts` races two 50-point spends against a 60-point balance. Injection removed the profile lock and both point guards: both spends were accepted and the balance reached **−40**. Restored; suite green. |
| **M-INV5** | For every outcome, the sum of held position shares equals the market's outstanding quantity `q`. | Transactional updates of positions and `q` in the same statement path. | **Verified.** Bookkeeping assertion in `market-pricing.test.ts`; fault injection advanced `q` without the matching position update and the test failed (CI 42474762811). |
| **M-INV6** | Resolution is terminal and pays exactly one point per winning share, once per holder; losing shares pay nothing. Resolution requires the match to be `FINISHED` and the winner to match the score-derived outcome. | `resolve_market` with a terminal status check and one payout path; `markets_result_binding` and `matches_result_integrity` triggers. | **Enforced, unverified by fault injection.** `market-lifecycle.test.ts` covers pre-`FINISHED` refusal, score-mismatch refusal, one-shot payout and post-resolution score rejection; independent verification pending. |
| **M-INV7** | Entry cooldown is per user × market: 5 s first rung, then a linear `+15 s` ladder capped at 600 s, decaying one level per five quiet minutes. Refusals do not escalate; exits are exempt. | Cooldown gate in `open_trade`; `close_trade` never reads it. | **Verified.** Gate, ladder, cap, decay, scope, no-escalation and exit exemption each have an observed-red mutation in `market-lifecycle.test.ts` (CI 42474762811). |
| **M-INV8** | No commission of any kind: entry debits `ceil(cost)`, exit credits `floor(proceeds)`, and no fee path exists. | RPC formulas; no maker account. | **Verified.** `market-pricing.test.ts`; fault injection replaced `ceil` with `floor` and the debit assertion failed (CI 42474762811). |
| **M-INV9** | A retried entry or exit with the same request key and payload returns the recorded trade and does not debit, credit, create a position or write a second trade. Reusing the key with a different payload is refused. | `trade_requests` unique `(user_id, request_id)`; claim-before-work in `open_trade`/`close_trade`; request and trade commit or roll back together. | **Verified.** `idempotency.test.ts`; CI run [42425131584](https://github.com/match-pulse/match-pulse/actions/runs/42425131584). Fault injection not yet observed locally. |

### Correction to an earlier draft

An earlier version of this table recorded INV-02 as enforced by "unique database constraint and transactional idempotency handling". Neither existed. The rule is now real and tested.

## 2. Tests

| Test | Invariant | Purpose |
| :--- | :--- | :--- |
| `tests/invariants/tournament-capacity.test.ts` | INV-01 | 100 concurrent requests against capacity 32; asserts the accepted/refused split **and** the committed row count, the stored counter, and `counter <= capacity` |
| `tests/invariants/registration-uniqueness.test.ts` | INV-02 | Sequential and concurrent duplicate registrations; asserts refusal, exactly one stored row, and that the counter advanced only once |
| `tests/invariants/market-pricing.test.ts` | M-INV2, M-INV3, M-INV5, M-INV8 (partial M-INV7) | Budget-bounded entry, `ceil` debit, `floor` credit, profit and proportional-loss exits, over-sell and unaffordable-entry refusals, share bookkeeping, and the first cooldown rung; asserts committed balances, positions and trade rows |
| `tests/invariants/market-lifecycle.test.ts` | M-INV1, M-INV6, M-INV7 | Pre-kickoff refusals, post-`FINISHED` entry refusal, exit after `FINISHED`, disable-predictions exit, resolution before `FINISHED`, score-mismatch refusal, one-shot payout, duplicate-resolution refusal, premature-finish and post-resolution score rejection, cooldown ladder/cap/decay/scope, no escalation on refusal and exits during cooldown |
| `tests/invariants/market-concurrency.test.ts` | M-INV4, M-INV7 | Cross-market double-spend race and same-market burst; both were observed red under fault injection |
| `tests/invariants/authorization.test.ts` | INV-05, A-INV1–A-INV5 | Anonymous sign-in refusal, fan own-row isolation, organizer-only resolution, denied direct writes, the identity-free public trade feed and owner-only trade requests |
| `tests/invariants/idempotency.test.ts` | M-INV9 | Sequential/concurrent replay, payload mismatch, retry after cooldown, exit replay and close-key mismatch |
| `tests/fault-injection/atomic-rollback.fault.ts` | M-INV2 | Forced trade-insert failure; asserts no partial balance, position, market update or trade survives. Run explicitly by `bun run fault:inject`. |

**Retired.** The former `prediction-duplicate-prevention.test.ts` (previously `prediction-lock.test.ts`) exercised `UNIQUE (user_id, match_id)` and never tested kickoff locking, because that rule (INV-03) was withdrawn. It was removed with the fixed-score feature in #67 and is not evidence for any market invariant. The table and `submit_prediction` were dropped by `20261023_retire_predictions.sql`.

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

After the market slices and the prediction retirement (I5): `16 pass / 0 fail` across 5 files.

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

The market suites were observed failing under three deliberate defects. Each was applied only to the local database, then reverted by re-applying the migration's function (and, where noted, restoring the table constraint/key); the full suite then returned to green (18 tests at the time, before the fixed-score suite was retired).

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

### Authorization suite (2026-11-07)

The authorization boundary is enforced at the database and observed in CI:

```text
Domain invariants: 21 pass, 0 fail, 205 expect() calls, 6 files
CI run: https://github.com/match-pulse/match-pulse/actions/runs/42397891717
```

The six authorization tests cover:

- anonymous public reads allowed, private reads and mutation RPCs denied;
- fan A cannot read fan B's profile, positions, trades or cooldown;
- a fan cannot resolve; an organizer can;
- direct table updates/inserts are denied;
- the public trade feed returns no `user_id` or `points_after`;
- an anonymous fan is a real auth user with a profile and can trade.

The suite uses authenticated clients for the real path and the service role for
setup/reads. The service role is not an application runtime credential.

### Idempotency suite (2026-11-08)

The request-key boundary is enforced at the database and observed in CI:

```text
Domain invariants: 28 pass, 0 fail, 256 expect() calls, 7 files
CI run: https://github.com/match-pulse/match-pulse/actions/runs/42425131584
```

The six idempotency tests cover:

- sequential replay of a completed entry;
- concurrent duplicate entries producing one trade;
- same key with a different entry payload refused;
- retry after the cooldown would have allowed a new entry;
- replay of a completed exit without selling twice;
- same exit key with different shares refused.

The request row is owner-only through RLS; direct writes are denied. The legacy
null-key path remains non-idempotent and is exercised by the existing suites.

### Fault-injection matrix (2026-11-08)

`bun run fault:inject` applies each mutation to a disposable local database,
runs the targeted test, compares the exit code with the declared expectation,
resets the schema and records the result. CI run
[42474762811](https://github.com/match-pulse/match-pulse/actions/runs/42474762811)
passed all 11 entries:

| Mutation | Invariant | Expected | Observed |
| :--- | :--- | :--- | :--- |
| `m-inv1-window` | M-INV1 | targeted test fails | exit 1 |
| `m-inv2-rollback` | M-INV2 | forced-failure test passes | exit 0 |
| `m-inv3-oversell` | M-INV3 | targeted test fails | exit 1 |
| `m-inv5-bookkeeping` | M-INV5 | targeted test fails | exit 1 |
| `m-inv8-floor` | M-INV8 | targeted test fails | exit 1 |
| `m-inv7-ladder` | M-INV7 | targeted test fails | exit 1 |
| `m-inv7-cap` | M-INV7 | targeted test fails | exit 1 |
| `m-inv7-decay` | M-INV7 | targeted test fails | exit 1 |
| `m-inv7-scope` | M-INV7 | targeted test fails | exit 1 |
| `m-inv7-no-escalation` | M-INV7 | targeted test fails | exit 1 |
| `m-inv7-exit-exemption` | M-INV7 | targeted test fails | exit 1 |

The full invariant suite then returned **28 pass / 0 fail**. The M-INV2 row is a
**forced-failure rollback** check, not an observed-red mutation: the trigger
forces the trade insert to fail and the test asserts that no partial balance,
position, market update or trade survives. PostgreSQL function atomicity cannot
be broken without a second connection, so a true observed-red version of M-INV2
is not claimed.

### What a green run does and does not establish

It establishes that these scenarios hold, on this machine, against a single database instance, at this scale. It does **not** establish behaviour under sustained load, across multiple application instances, or where connections are dropped upstream before reaching a business decision. The authorization evidence is local Supabase/PostgreSQL; production session hardening and rate limits are not claimed.

## 4. Current focus

INV-01 and INV-02 remain verified. INV-03 and INV-04 are withdrawn with the retired fixed-score feature (owner decision, 2026-10-19); M-INV1–M-INV9 replace them. M-INV1, M-INV3, M-INV4, M-INV5, M-INV6, M-INV7 (gate and every detail), M-INV8 and M-INV9 are **Verified** by tests in CI, with observed-red fault injection for the recorded mechanisms. M-INV2 is **Verified by forced-failure rollback**: the trade-insert failure test proves no partial state survives, but it is not an observed-red mutation because PostgreSQL function atomicity cannot be broken without a second connection. That limit is recorded in the verification record.

INV-05 and A-INV1–A-INV5 are **Verified** for the platform boundary by the authorization suite in CI. The v3 tenancy/ticketing/privacy invariants T-INV1–T-INV10 are **Verified** by the v3 integration, CLI and E2E suites. The club-analytics privacy rule is now implemented as aggregate-only with threshold-5 suppression and no attendee identity. The remaining open findings are the M-INV2 observed-red limitation (FND-002, partly fixed), load/p95 (FND-004), delivery/operations (FND-006), real-user evidence (FND-007) and independent review (FND-008). FND-003 is fixed by the idempotency increment. The current database suite is **42 pass / 0 fail**; the CLI suite is **2 pass / 0 fail**; Playwright/axe is **11 passed**.