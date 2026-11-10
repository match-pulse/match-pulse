# Test Strategy

The strategy is invariant-first and risk-first. The goal is not coverage; it is
evidence that a specific rule holds and can fail when the rule is broken.

## 1. Layers

| Layer | What it checks | Where |
| :--- | :--- | :--- |
| Unit | Pure rules, CSV safety, error mapping | `tests/unit/` |
| Domain invariants | Capacity, uniqueness, pricing, lifecycle, concurrency, idempotency, authorization | `tests/invariants/` |
| Integration | v3 club tenancy, nominal ticketing, plans, retention, admin | `tests/integration/` |
| CLI agent | Match-day journey and refusal cases | `tests/agent/` |
| E2E and accessibility | Fan purchase, club/admin pages, axe checks | `tests/e2e/` |
| Fault injection | A deliberate mutation makes the targeted test fail | `tests/fault-injection/`, `scripts/fault-injection.ts` |

The invariant suites use authenticated user clients for the real mutation path
and a local service-role client for setup and committed-state reads. The service
role is not an application runtime credential.

## 2. Coverage rule

Every **critical invariant** needs:

1. a statement of the rule independent of the implementation;
2. a database-backed test against the real schema;
3. an assertion on committed state, not only the response;
4. an observed-red fault injection, or an explicit record of why it cannot be
   observed-red;
5. a verification record with the environment and the limit.

A test that has only passed is not evidence. A test that can only pass is not
evidence either. The v3.1.0 audit corrected several claims that were broader than
the tests (FND-020).

## 3. Gates

CI runs five jobs on every pull request:

- lint, typecheck, build, architecture guard, secret scan and dependency audit;
- domain invariants and CLI scenarios;
- delivery, health, smoke and public-schema backup/restore;
- fault injection, 27 entries;
- Playwright journeys and axe checks.

A green gate is evidence, not approval. The human owner authorizes the merge.

## 4. Current evidence

Last recorded: 57 database/application tests, 2 CLI scenarios, 11 Playwright
journeys, 27/27 fault-injection entries expected. The one exception is M-INV2:
transaction atomicity is verified by a forced insert failure, not an observed-red
mutation, because PostgreSQL function atomicity cannot be broken in one
connection. See the
[remediation verification](../methodology/verification/2026-11-173-audit-remediation.md)
and the
[fault-injection verification](../methodology/verification/2026-11-181-fault-injection.md).

## 5. Limits

- Local/CI only; one database instance.
- No production load, multi-instance or network-failure test.
- No independent test author. AI-generated tests can share assumptions with
  AI-generated code; the oracle and the observed-red injections reduce that risk.
- E2E and accessibility are not exhaustive; the axe gate blocks serious and
  critical violations, not every minor issue.
