# Checkpoint E — Delivery, Observability and Recovery (Pre-read)

- **Date:** 2026-11-08
- **Status:** **Pre-read only.** The L17–L20 lecture materials are not yet in
  the course folder. This folder prepares the delivery/operations baseline; it
  is not the final Checkpoint E deliverable.
- **Update 2026-11-08:** the local/CI delivery baseline is implemented and
  verified (CI run [42435007354](https://github.com/match-pulse/match-pulse/actions/runs/42435007354)):
  health, login and home smoke checks pass; 28 invariant tests pass; observed
  p95 is 463–572 ms across two runs. Backup/restore is exercised in CI:
  67,009-byte public-schema backup, tables 10→10, RLS policies 10→10,
  tournaments 2→2 and the marker restored. L17–L20 requirements are still
  pending.
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
| CI `Delivery and recovery` job | Starts Supabase, builds, starts the app, waits for health, runs smoke, then dumps/restores the public schema into a scratch database | Runner environment, not production |
| `docs/operations/runbook.md` | Environments, health, logs, release, rollback, backup/restore, incident steps | CI recovery drill, no production drill |
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
| The local backup/restore exercise is sufficient recovery evidence. | **Partially verified** — the CI drill restores the public schema and verifies counts; it is not a production recovery. |

## 5. Pre-read verdict

The delivery baseline is a real, exercised slice: health, logs, smoke, CI
delivery, runbook, proposed SLOs, p95 observation and an exercised CI
backup/restore drill. It is honest about not being a production deployment.

E is not complete because:

- the L17–L20 requirements are not available;
- there is no hosted environment, external monitoring or alerting;
- the backup/restore drill is local/CI and its result is recorded; production
  backup, retention and recovery remain open;
- availability is sampled only when CI or a person runs the smoke test;
- no production incident or recovery drill exists.

## 6. Proposed E work after L17–L20 arrive

1. Validate this pre-read against the actual E questions.
2. Keep the observed p95 and backup/restore evidence current.
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

## 7. v3.0.0 delivery evidence (2026-11-09)

The v3.0.0 increment strengthens the delivery/operations story:

- **Delivery:** five CI jobs (build/security, domain invariants, delivery/recovery, fault injection, E2E/accessibility). The domain job also runs `bun run test:agent`; the E2E job exports the submission PDFs.
- **Observability:** `/api/health`, JSON stdout logs, smoke test, CI job statuses and the agent evidence. No collector, dashboard or alert.
- **Recovery:** the delivery job restores the public schema into a scratch database and verifies tables, policies, rows and a marker. No production backup, PITR or RTO/RPO.
- **Retention:** request-key cleanup (30 days) and attendee identity cleanup (365 days) are service-role-only maintenance commands with integration tests.
- **Release:** immutable annotated tags, release notes and a milestone. v3.0.0 is the current release candidate.
- **Limits:** local/CI only; no hosted environment, external monitoring, production recovery, scheduled retention or independent operations review.

Evidence: [schema verification](../verification/2026-11-157-v3-club-tenancy.md), [CLI verification](../verification/2026-11-159-cli-and-agent-playbook.md), [auth/UI verification](../verification/2026-11-161-v3-auth-ui.md), [club UI verification](../verification/2026-11-163-club-members-rewards-insights.md), [retention verification](../verification/2026-11-165-attendee-retention.md), [runbook](../../operations/runbook.md).

The exact L17–L20 questions are still pending; this section is the prepared evidence, not the final answer.
