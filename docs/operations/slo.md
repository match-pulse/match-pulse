# Service-Level Objectives (Proposed)

- **Scope:** local and CI environments of the MatchPulse course project.
- **Status:** proposed targets; measurements are recorded where they exist.
  These are **not** production SLOs and carry no external commitment.
- **Related:** [`runbook.md`](./runbook.md),
  [architecture characteristics](../architecture/03-architecture-characteristics.md),
  [FND-004/FND-006](../methodology/findings-register.md).

## 1. Why these indicators

MatchPulse's risky moments are a registration burst and kickoff, when many
spectators act at once. The indicators below measure whether an increment can
start, answer, and be verified — not whether a hypothetical production fleet is
highly available.

## 2. Proposed objectives

| ID | Indicator | Proposed target | Measurement | Status |
| :--- | :--- | :--- | :--- | :--- |
| SLO-1 | Health availability | 99.5% of probes succeed over a 30-day window | `/api/health` probes; local/CI only | Proposed |
| SLO-2 | Health latency p95 | < 500 ms | Health probe timing in CI/local | Proposed |
| SLO-3 | Capacity burst p95 | < 1,000 ms for 100 concurrent registrations | `tests/invariants/tournament-capacity.test.ts` | Proposed |
| SLO-4 | Unhandled transport errors in the burst | 0 | The same burst test | Enforced by the test assertion |
| SLO-5 | CI delivery smoke | Pass on every pull request and `main` | `Delivery and recovery` CI job | Enforced by CI |
| SLO-6 | Invariant suite duration | < 3 minutes | CI job duration | Measured (~2.5 min) |
| SLO-7 | Tenancy/entitlement/ticket invariant result | 0 failures | `v3-club-tenancy.test.ts` | Enforced by CI |
| SLO-8 | CLI agent playbook result | 0 failures | `bun run test:agent` | Enforced by CI |
| SLO-9 | Serious/critical accessibility violations | 0 on tested pages | Playwright + axe | Enforced by CI |
| SLO-10 | Attendee retention result | All old tickets cleared; recent tickets retained; authenticated denial | `v3-club-tenancy.test.ts` | Enforced by CI |
| SLO-11 | Ticket oversell / duplicate check-in | 0 observed | Ticket capacity/check-in tests | Enforced by CI |

## 3. Measurement method

- **Health availability/latency:** the smoke test and CI wait loop call
  `/api/health`. Local probes are manual; there is no continuous sampler.
- **Capacity p95:** the burst test records `performance.now()` around each RPC,
  computes p50/p95/max and prints one JSON line
  (`event: "capacity.burst_latency"`). The value depends on the runner and the
  local database, so it is recorded rather than asserted in the first
  observation.
- **Delivery smoke:** the CI `Delivery smoke` job starts Supabase, builds,
  starts the app, waits for health and runs `bun run smoke`. A red job is the
  signal.
- **Invariant duration:** the `Domain invariants` job duration in GitHub
  Actions.

## 4. Error budget and response

There is no formal error budget because there is no production service. If a
target is missed:

1. Record the observed value, environment and date in the verification record.
2. Open or update a finding if the miss reveals a defect or a wrong target.
3. Do not silently relax the target; a target change is a human decision.

## 5. Limits

- No continuous monitoring, alerting, on-call or historical retention.
- No production traffic, multi-instance measurement or load generator beyond
  the 100-request burst.
- p95 values are environment-specific and must not be presented as production
  latency.
- Availability is observed only when someone runs the smoke test or CI runs.
