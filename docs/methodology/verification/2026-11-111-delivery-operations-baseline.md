# Verification — Delivery, Observability and Recovery Baseline

- **Date:** 2026-11-08
- **Issue:** #111
- **PR:** #112
- **Status:** Verified in CI for the local/CI environment. Production delivery and recovery remain unverified.
- **Related:** [Execution plan](../exec-plans/111-delivery-operations-baseline.md), [Operations runbook](../../operations/runbook.md), [SLO proposal](../../operations/slo.md), [Checkpoint E pre-read](../checkpoint-E/README.md), [FND-004](../findings-register.md), [FND-006](../findings-register.md)

## 1. What was verified

- `GET /api/health` returns `200` with `status: ok`, `app: up`, `db: up`.
- The health route is dynamic in the production build and no longer performs a
  build-time database check.
- The login page returns `200` and serves the fan sign-in control.
- The home request returns `200` `text/html`.
- `bun run smoke` passes against a running production build.
- CI starts Supabase, builds the app, starts it, waits for health and runs the
  smoke test in the `Delivery smoke` job.
- The capacity burst records p50/p95/max latency.
- The existing invariant and authorization suites remain green.

## 2. Environment

- GitHub Actions `ubuntu-latest`; Supabase local; PostgreSQL 17; Bun 1.4.2;
  Next.js 16.4.2.
- The app was built and started from the pull-request commit in CI.
- No hosted deployment, production data or external monitoring was used.

## 3. Commands and observed results

| Command / job | Result |
| :--- | :--- |
| `bun run check:architecture` | Passed (local). |
| `bun run typecheck` | Passed (local). |
| `bun run lint` | Passed (local). |
| `bun run build` | Passed (local); `/api/health` is dynamic. |
| CI "Lint, typecheck and build" | Passed. |
| CI "Domain invariants" | Passed: 28 tests, 0 failures, 256 expectations, 7 files. |
| CI "Delivery smoke" | Passed: health, login UI and home HTML. |

CI run: [42435627680](https://github.com/match-pulse/match-pulse/actions/runs/42435627680) (final, pinned Supabase CLI 3.0.0). The earlier green run [42435007354](https://github.com/match-pulse/match-pulse/actions/runs/42435007354) produced the first p95 observation.

### Delivery smoke output

```text
Smoke test against http://127.0.0.1:3000
  ✓ health endpoint
  ✓ login page serves the sign-in UI
  ✓ home is served as HTML
Smoke test passed.
```

## 4. p95 measurement

The 100-request concurrent registration burst recorded two observations:

```json
{"event":"capacity.burst_latency","requests":100,"wallClockMs":480.05,"p50Ms":245.46,"p95Ms":463.11,"maxMs":479.64}
{"event":"capacity.burst_latency","requests":100,"wallClockMs":585.03,"p50Ms":335.89,"p95Ms":571.68,"maxMs":584.64}
```

- **Observed p95:** 463.11 ms and 571.68 ms across two CI runs.
- **Proposed target:** under 1,000 ms.
- **Scope:** one CI runner, one local PostgreSQL instance, 100 concurrent
  `register_for_tournament` calls against capacity 32.
- **Claim:** both observations are below the proposed target in this
  environment. They are **not** production latency claims, and p95 is not
  asserted as a CI gate. The spread between runs is itself evidence that a
  hard threshold should wait for more observations.

A documentation-only CI attempt failed because `supabase/setup-cli@v1` could
not resolve `latest` (GitHub rate limit). Both jobs now pin Supabase CLI
`3.0.0`; the final run passed.

## 5. Backup and restore

The runbook documents dump, restore and verification steps. The exercise was
**not run** in this environment because Docker/Postgres and the Supabase CLI
stack are not available locally, and adding a destructive reset/restore step to
CI was not part of the approved verification.

This means:

- the procedure is documented but **unverified**;
- no measured recovery time or data-loss bound exists;
- FND-006 remains partly open for recovery evidence.

## 6. Limits and unverified claims

- No hosted deployment, TLS, DNS or production availability.
- No external log collector, metrics, tracing, dashboard or alerting.
- Availability is sampled only when CI or a person runs a probe.
- Backup/restore is documented, not exercised in this verification.
- No production incident or recovery drill.
- No independent human review.
- p95 is environment-specific and recorded, not asserted.

## 7. Findings

- **FND-006** — partly fixed: local/CI health, logs, smoke, runbook, SLOs and
  rollback procedure exist. Production deployment, observability and recovery
  remain open.
- **FND-004** — partly fixed: p95 and burst latency are now observed and
  recorded (463.11 ms and 571.68 ms in two CI runs). Sustained load, throughput
  and hard-latency assertions remain open.
- FND-002, FND-007 and FND-008 remain open.

## 8. Decision

The local/CI delivery baseline is accepted for the course environment. The
remaining operational risks are recorded and are not implicitly accepted by
this verification.
