# Test Strategy

- **Scope:** MatchPulse MVP.
- **Status:** Approved; implementation in progress.
- **Rule:** use the smallest boundary that can expose the failure; a green check is not proof of correctness.

## 1. Layers

| Layer | Purpose | Tool / location |
| :--- | :--- | :--- |
| Static | Types, lint, architecture rules, secret scan, dependency audit | `bun run typecheck`, `lint`, `check:architecture`, `check:secrets`, `bun audit` |
| Unit | Pure rules and helpers | `tests/unit/` (to add) |
| Integration/DB | RPCs, RLS, constraints, concurrency, idempotency | `tests/invariants/`, `tests/integration/` |
| Fault injection | Observed-red evidence for invariants | `scripts/fault-injection.ts`, `tests/fault-injection/` |
| E2E | Fan, organizer, club journeys | `tests/e2e/` with Playwright |
| Accessibility | Critical WCAG A/AA violations and manual keyboard/focus checks | Playwright + axe |
| Performance | 20/50/100 concurrent registration bursts; p50/p95/p99, throughput, errors | `scripts/performance.ts`, `Performance baseline` workflow |
| Delivery/recovery | Build, start, health, smoke, backup/restore | `Delivery and recovery` CI job |
| Regression | Every fixed defect gets a guard | Invariant/integration/E2E suites |

## 2. Coverage rule

- 100% of critical invariants and role boundaries have executable evidence.
- Every role journey has at least one E2E test.
- Pure logic targets 80% line/branch coverage where meaningful.
- Coverage is a map, not a verdict.

## 3. Gates

- PR: static checks, secret scan, dependency audit, integration tests, E2E, critical accessibility, delivery/recovery, fault injection.
- Scheduled/manual: performance baseline.
- Release: all gates green, known limits recorded.

## 4. Limits

- Local/CI, one database instance.
- No production load, multi-instance, TLS/DNS or external monitoring.
- Accessibility gate blocks critical violations only; serious violations are reported and reviewed.
- Performance results are environment-specific.
- FND-007 real-user evidence and FND-008 independent review require human action.
