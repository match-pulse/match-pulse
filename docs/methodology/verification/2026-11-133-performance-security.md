# Verification — Security and Performance Baseline

- **Date:** 2026-11-08
- **Issues:** #133, #134
- **Status:** Verified for the local/CI environment.
- **Related:** [MVP scope](../product/mvp-scope.md), [test strategy](../test-strategy.md), [threat model](../../security/threat-model.md), [failure modes](../../operations/failure-modes.md)

## 1. Security baseline

- `bun audit --audit-level=high`: no vulnerabilities found (449 packages checked).
- `bun run check:secrets`: passed over 207 tracked files.
- The build job runs both checks on every pull request and `main`.
- Authorization/RLS, E2E role journeys and fault injection remain green.

## 2. Performance baseline

Workflow run: [42491482504](https://github.com/match-pulse/match-pulse/actions/runs/42491482504)

| Level | Capacity | Wall clock | Throughput | p50 | p95 | p99 | Accepted | Refused | Transport errors |
| ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| 20 | 20 | 188.24 ms | 106.25 req/s | 143.22 ms | 186.56 ms | 187.90 ms | 20 | 0 | 0 |
| 50 | 50 | 278.31 ms | 179.66 req/s | 112.01 ms | 267.46 ms | 277.72 ms | 50 | 0 | 0 |
| 100 | 100 | 477.47 ms | 209.44 req/s | 161.45 ms | 461.15 ms | 472.01 ms | 100 | 0 | 0 |

The 100-request burst observed p95 461.15 ms and p99 472.01 ms, below the proposed 1,000 ms local target. This is a local/CI observation, not a production load claim.

## 3. Limits

- One local PostgreSQL instance; no multi-instance or sustained production load.
- The performance workflow is scheduled/manual, not a PR gate.
- Secret scan is a tripwire, not a full secret-scanning service.
- No independent security or privacy review.
- FND-007 real-user evidence and FND-008 independent review remain open.

## 4. Decision

The security and performance baseline is accepted for the MVP. The release notes state the production and validation limits.
