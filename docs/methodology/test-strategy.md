# Test Strategy

- **Status:** Current for v3.0.0 (2026-11-09).
- **Related:** [Agent playbook](../testing/agent-playbook.md), [capability manifest](../testing/capabilities.md), [invariant registry](checkpoint-A/02-invariants.md), [execution plan](exec-plans/153-v3-club-subscriptions.md).

## 1. Layers

| Layer | What it proves | Tooling |
| :--- | :--- | :--- |
| Unit | Pure pricing, cooldown, validation and formatting | `bun test` |
| Database invariants | Capacity, uniqueness, points, market lifecycle, idempotency, resolution | `tests/invariants/`, real PostgreSQL |
| Tenancy and authorization | Club isolation, role matrix, entitlements, attendee identity, privacy, admin audit | `tests/integration/v3-club-tenancy.test.ts` |
| Nominal ticketing | Buyer vs attendee, max four, fan card, transfer, check-in, box office, retention | `tests/integration/v3-club-tenancy.test.ts` |
| CLI contract | Command parity, JSON, exit codes, profiles, match-day and refusal scenarios | `tests/agent/cli.test.ts`, `bun run test:agent` |
| E2E and accessibility | Fan sign-up/purchase, club dashboard/event page, admin console, organizer and legacy journeys; serious/critical axe | `tests/e2e/`, Playwright + axe |
| Performance | 20/50/100 concurrent registration bursts; p50/p95/p99, errors | `scripts/performance.ts`, performance workflow |
| Delivery/recovery | Build, start, health, smoke, backup/restore | `Delivery and recovery` CI job |
| Fault injection | Observed-red mutation evidence for the market invariants | `bun run fault:inject` |
| Retention | Old vs recent attendee identity, audit and authenticated denial | `tests/integration/v3-club-tenancy.test.ts` |

## 2. Coverage rule

- Every critical invariant, role boundary, club-scoped read and entitlement gate has executable evidence.
- Every customer capability in the [manifest](../testing/capabilities.md) has a CLI command and, where applicable, an E2E/axe check.
- Every role journey has at least one browser or CLI scenario.
- Pure logic targets 80% line/branch coverage where meaningful.
- Coverage is a map, not a verdict.

## 3. Gates

- **PR:** static checks, secret scan, dependency audit, database invariants, CLI agent scenarios, E2E, serious/critical accessibility, delivery/recovery and fault injection.
- **Scheduled/manual:** performance baseline.
- **Release:** all gates green, known limits recorded, tag/Release approved by the human owner.

## 4. Current evidence

| Suite | Observed |
| :--- | ---: |
| Database/application | 42 pass / 0 fail |
| CLI agent scenarios | 2 pass / 0 fail |
| Playwright/axe | 11 passed |
| Fault injection | 11 expected results |

## 5. Limits

- Local/CI, one database instance; no production load or multi-instance behaviour.
- No real payment provider, financial KYC, invoice/refund or settlement.
- Accessibility gate blocks serious and critical WCAG A/AA violations, not moderate/minor.
- Some v3 UI paths (invite acceptance, fan rewards, export) are covered by database/CLI tests rather than a dedicated browser journey.
- No seat maps, wallet passes, turnstile hardware or FIGC/Questura integration.
- Performance results are environment-specific and not a release gate.
- FND-007 real-user evidence and FND-008 independent review require human action.
