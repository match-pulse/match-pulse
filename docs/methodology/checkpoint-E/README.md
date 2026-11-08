# Checkpoint E — Delivery, Observability and Recovery (Pre-read)

- **Date:** 2026-11-08
- **Status:** **Pre-read only.** The L17–L20 lecture materials are not yet in
  the course folder. This folder prepares the delivery/operations baseline; it
  is not the final Checkpoint E deliverable.
- **Update 2026-11-08:** the local/CI delivery baseline is implemented and
  verified (CI run [42435007354](https://github.com/match-pulse/match-pulse/actions/runs/42435007354)):
  health, login and home smoke checks pass; 28 invariant tests pass; observed
  p95 is 463.11 ms. Backup/restore is documented but unexercised. L17–L20
  requirements are still pending.
- **Purpose:** Make delivery, health, logging, release, rollback, backup and
  recovery explicit and testable against the actual L17–L20 requirements when
  they arrive.
- **Related:** [Operations runbook](../../operations/runbook.md),
  [SLO proposal](../../operations/slo.md),
  [Architecture characteristics](../../architecture/03-architecture-characteristics.md),
  [Release workflow](../../workflows/release-workflow.md),
  [FND-006](../findings-register.md).

## 1. What E is likely to ask

Based on the course pattern and the existing architecture characteristics,
Checkpoint E is about **delivery and operations**:

- how an increment reaches a running environment;
- how the team knows it is healthy;
- what is observed when it fails;
- how a release is rolled back and data recovered;
- which service-level objectives are proposed and measured;
- what operational risk remains and who accepts it.

The exact questions will be confirmed from L17–L20. This pre-read is a
hypothesis, not a finished answer.

## 2. Current evidence

| Evidence | What it establishes | Limit |
| :--- | :--- | :--- |
| `GET /api/health` | App + database status, no sensitive data | Local/CI only; no continuous probe |
| `src/lib/logger.ts` | JSON stdout logs for health and key action failures | No collector, dashboard or alerting |
| `bun run smoke` | Health, login UI and home shell against a running app | No auth/trade mutation; deterministic by design |
| CI `Delivery smoke` job | Starts Supabase, builds, starts the app, waits for health, runs smoke | Runner environment, not production |
| `docs/operations/runbook.md` | Environments, health, logs, release, rollback, backup/restore, incident steps | Local recovery exercise, no production drill |
| `docs/operations/slo.md` | Proposed indicators and measurement method | Targets are proposed; availability is sampled only when run |
| Capacity burst p95 | Observed p50/p95/max for 100 concurrent registrations | Environment-specific; not asserted initially |
| v1.2.0 release | Immutable tag, GitHub Release, milestone, changelog | No deployment; rollback is a local tag selection |

## 3. What this folder contains

1. This pre-read.
2. [`01-delivery-and-environment.md`](./01-delivery-and-environment.md) — the
   chosen delivery model and its explicit non-goals.
3. [`02-observability.md`](./02-observability.md) — health, logs, smoke and
   what they can and cannot prove.
4. [`03-recovery.md`](./03-recovery.md) — backup/restore, rollback and incident
   steps.
5. [`04-slo-and-measurement.md`](./04-slo-and-measurement.md) — proposed SLOs and
   the observed p95.

## 4. Known, inferred and unknown

| Statement | Status |
| :--- | :--- |
| The app has a public health endpoint that checks the database. | **Known** — code and smoke test. |
| Structured JSON logs are emitted for health and key action failures. | **Known** — code and sample output. |
| CI starts the app and runs a smoke check on every PR and `main`. | **Known** — CI job. |
| The operations runbook covers release, rollback, backup/restore and incident steps. | **Known** — document. |
| p95 latency is measured from the capacity burst. | **Known** — test output; value recorded in the verification record. |
| E will ask for a deployment and operational evidence. | **Inferred** from the course pattern; exact form awaits L17–L20. |
| A cloud deployment is required for a top grade. | **Unknown** — the plan deliberately chose local/CI evidence; the professor's rubric may prefer or require a hosted environment. |
| The local backup/restore exercise is sufficient recovery evidence. | **Unverified** — it is a local drill, not a production recovery. |

## 5. Pre-read verdict

The delivery baseline is a real, exercised slice: health, logs, smoke, CI
delivery, runbook, proposed SLOs, p95 observation and a local backup/restore
procedure. It is honest about not being a production deployment.

E is not complete because:

- the L17–L20 requirements are not available;
- there is no hosted environment, external monitoring or alerting;
- the backup/restore exercise is local and must be recorded with its actual
  observed result;
- availability is sampled only when CI or a person runs the smoke test;
- no production incident or recovery drill exists.

## 6. Proposed E work after L17–L20 arrive

1. Validate this pre-read against the actual E questions.
2. Record the observed p95 and backup/restore result in a verification record.
3. Add any missing operational evidence the course requires.
4. If a hosted environment is required, request explicit approval, credentials
   and a cost/security decision before provisioning anything.
5. Present E with the same claim → evidence → limit → decision structure used
   in C and D.

## 7. Decisions requested

- Accept local/CI delivery evidence as the course baseline, or require a hosted
  environment.
- Confirm the SLO targets or defer them until L17–L20.
- Confirm whether a production-like recovery drill is in scope.
