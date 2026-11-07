# Checkpoint C — Quality Story: Double-Spend Prevention (M-INV4)

- **Date:** 2026-11-07
- **Status:** Evidence story assembled from records dated 2026-10-19. The suite was not rerun for this documentation change.
- **Risk:** R-03 in the [risk control map](./01-risk-control-map.md)
- **Invariant:** M-INV4 in the [invariant registry](../checkpoint-A/02-invariants.md)
- **Test:** `tests/invariants/market-concurrency.test.ts` — “two markets cannot spend the same balance twice”

## 1. The claim

> Given one profile with 60 points and two distinct markets, two concurrent entries of 50 points cannot both commit. Exactly one entry is accepted, the other is refused for insufficient points, the balance never becomes negative, and exactly one trade and one position exist.

This is a behaviour claim. It is not a claim that the market is fair, that the user valued the trade, or that the system is secure. Those are separate claims with separate evidence.

## 2. Why this risk matters

A double-spend is a silent ledger corruption. The user does not see an error; the balance simply becomes wrong. If the balance goes negative, points are created from nothing and the market's payouts become unfair. The failure is hard to detect without reconciliation and expensive to repair after trades and payouts have propagated.

The affected people are:

- the **fan**, whose balance is no longer trustworthy;
- the **business**, whose points ledger and market credibility are damaged;
- **other traders**, whose positions are priced against a corrupted market.

The detection delay is low only if someone inspects the balance. There is no alert or ledger reconciliation today.

## 3. Oracle

The oracle is the business rule, not the implementation:

- A profile's available points are a hard limit.
- A debit must not make the balance negative.
- The sum of committed debits cannot exceed the starting balance.
- A refused entry must write no position, no trade and no balance change.

The test checks committed state after the race, not only the RPC responses. That matters because a response count can look correct while the database stores a different state.

## 4. Boundary and test design

The test uses the smallest boundary that can expose the failure: the **database transaction** behind `open_trade`, with two markets and the same profile.

- **Initial state:** one profile with 60 points; two markets, each open for trading.
- **Action:** two `open_trade` calls of 50 points each, issued concurrently with `Promise.all`.
- **Expected:** one accepted, one refused with “insufficient points”; balance equals `60 − cost`; one trade; one position.
- **Why this boundary:** a unit test with a mocked balance cannot prove that two transactions serialize on the profile row. The race must cross the real shared-state boundary.

The test is self-contained: it creates its own profile and markets, and cleans them up afterwards. It does not depend on another test having run.

## 5. Observed evidence

### 5.1 Recorded passing assertions

The suite is recorded as passing in the repository's evidence. It asserts:

- `accepted.length === 1`;
- `refused.length === 1`;
- the refusal message contains `insufficient points`;
- `balance === 60 − accepted cost`;
- `balance >= 0`;
- exactly one trade and one position.

The registry records the suite as **Verified** for M-INV4, because the suite was observed failing when the guard was removed and then returned green when the guard was restored.

### 5.2 Fault injection A

The recorded injection removed the profile lock and both balance guards from `open_trade`. The layered `points_after >= 0` trade check was also removed, because it otherwise rolled the transaction back and the negative balance never persisted.

Observed:

- both 50-point entries were accepted;
- the stored balance reached **−40**;
- the test failed with the recorded line:

```text
(fail) market concurrency (M-INV4) > two markets cannot spend the same balance twice
       Expected: 1   Received: 2
```

- the migration/function was restored and the suite returned green.

This is the key evidence. A green suite alone would not show that the test can detect the failure. The injection shows that the test fails for the intended reason when the control is removed.

### 5.3 CI

The suite runs in the “Domain invariants” job on every pull request and every push to `main`. A green check means the suite executed; it does not mean every possible schedule was exercised.

## 6. Limits

- **One machine, one database instance.** The race is real at the database boundary, but it does not prove behavior across multiple application instances, connection pools or regions.
- **Two markets, one profile.** It does not exercise every market combination or every interleaving.
- **No network retry.** The test calls the RPC directly. It does not simulate a lost response, a client retry or a duplicate request.
- **No idempotency.** A retry after the cooldown expires is accepted as a new entry. The cooldown is a churn control, not a request key. This is FND-003.
- **No production telemetry.** There is no alert, ledger reconciliation or audit trail that would detect a negative balance in operation.
- **The result is recorded, not rerun for this document.** The evidence is the repository record dated 2026-10-19; the current documentation change did not re-execute the suite.

## 7. Residual risk and decision

The control is real, but it is not the whole story:

| Residual risk | Finding | Next action |
| :--- | :--- | :--- |
| A retry after cooldown can create a second entry | FND-003 | Add a client request ID and a unique constraint on `(user_id, request_id)`; test retry and concurrent retry |
| Anyone with the anon key can call the RPC as any user | FND-001 | Implement auth, RLS, grants and `auth.uid()`-based RPCs |
| The suite is local and single-instance | FND-004 | Measure load/p95; test multi-instance behavior when a deployment exists |
| No ledger or reconciliation signal | FND-006 | Add an append-only points ledger or a reconciliation query and an alert |

**Decision:** keep the profile-lock + conditional-debit control. It is the correct boundary for the double-spend rule and it has been observed failing under injection. The next decision is to add idempotency and authorization; those close different failure modes and should not be folded into this control.

## 8. Traceability

```text
Risk R-03
  -> control C-03: profile row lock + conditional debit + one transaction
  -> test T-03: market-concurrency.test.ts
  -> evidence E-03: passing assertions + injection A observed balance -40 and test red
  -> residual FND-003: no idempotency keys
  -> next decision: add request IDs; implement auth/RLS; measure load/p95
```

The four checkpoint questions are answered in the [Checkpoint C README](./README.md). The full risk view is in the [risk control map](./01-risk-control-map.md).
