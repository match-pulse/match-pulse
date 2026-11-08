# Execution Plan — Delivery, Observability and Recovery Baseline

- **Status:** Implemented and verified in CI (2026-11-08). See [verification record](../verification/2026-11-111-delivery-operations-baseline.md). The backup/restore exercise remains documented but unexercised.
- **Issue:** #111
- **Branch:** `feat/111-delivery-operations-baseline`
- **Decision owner:** Human developer
- **Risk level:** Medium — new public health endpoint, logging, CI delivery job and operational procedures
- **Related:** [Architecture characteristics](../../architecture/03-architecture-characteristics.md), [release workflow](../../workflows/release-workflow.md), [FND-006](../findings-register.md), [v1.2.0 release](https://github.com/match-pulse/match-pulse/releases/tag/v1.2.0)

## 1. Intent

The project has CI, Docker and a release workflow, but it has no delivery verification, health signal, structured logs, SLO, rollback/backup procedure or recovery evidence. Delivery and operational learning is the largest remaining rubric gap (FND-006).

This increment establishes a **local/CI delivery baseline** that is honest about not being a production deployment. It prepares the Checkpoint E discussion and gives the project a repeatable release/health/recovery story.

## 2. Current state

- CI runs lint, typecheck, build, architecture guards and domain invariants.
- Docker builds the app; a manual local smoke was observed during earlier work.
- No `/api/health` endpoint.
- No structured logging convention.
- No automated smoke test against a running app.
- No SLO or p95 measurement recorded.
- No rollback/backup/restore drill.
- No deployment environment.
- Evidence: README known gaps, architecture characteristics §3.2, FND-006.

## 3. Scope

### Included

- `/api/health` Route Handler with app and database status, no sensitive data.
- `src/lib/logger.ts` JSON logger; no tokens, keys, emails or full request bodies.
- `scripts/smoke-test.ts` and `bun run smoke`.
- CI delivery job: start Supabase, build, start the app, wait for health, run smoke.
- Operations runbook: environments, health, logs, release, rollback, backup/restore, incident steps.
- SLO proposal and p95 measurement method.
- p95 timing added to the existing 100-request capacity burst; record the observed value.
- Release/rollback checks and documentation.
- README/architecture/FND-006 updates after verification.

### Non-goals

- Cloud hosting or a paid deployment.
- External observability vendor, dashboards or alerting.
- On-call rotation or production SLO claims.
- Production data migration or backup.
- Incident automation or chaos engineering.
- Organizer UI, rewards, analytics or new domain behavior.

## 4. Key decisions requiring approval

| ID | Decision | Why | Consequence |
| --- | --- | --- | --- |
| **D1** | Delivery evidence is local/CI, not a cloud deployment. | The course allows an explicit choice; no cloud credentials/cost are needed. | Checkpoint E will have a documented local/CI environment, not a live production URL. |
| **D2** | `/api/health` is public and read-only, checking a public table or a dedicated health RPC. | Monitoring must work without a user session. | The response must not leak counts, identities or secrets. |
| **D3** | Logs are JSON to stdout; no external collector. | Simple, portable, CI-visible. | No dashboards/alerts; the runbook explains where to look. |
| **D4** | Smoke test checks health, the login UI and the home shell; it does not create users/trades. | Keeps the smoke deterministic and non-destructive. | It proves the app/DB boundary and key routes, not every domain path. |
| **D5** | p95 is measured from the existing 100-request capacity burst and recorded, not asserted against a hard threshold initially. | CI latency varies; the first goal is observation. | The target comparison is documented; a later load test can assert. |
| **D6** | Backup/restore is documented and exercised locally with Supabase CLI; no production data. | The course asks for recovery evidence, not production operations. | The runbook states the local-only scope. |
| **D7** | Release rollback uses a new patch tag, never moving/deleting a tag. | Preserves immutable release history. | The runbook documents the rollback sequence. |

## 5. Health endpoint

`GET /api/health`:

```json
{
  "status": "ok",
  "app": "up",
  "db": "up",
  "timestamp": "2026-11-08T..."
}
```

- Returns `200` when the app and a public DB read succeed.
- Returns `503` when the DB check fails.
- No auth, counts, user data, keys or environment values.
- Use the server Supabase client and a public read (`markets` or a dedicated read-only health function).
- `cache: no-store`; no cookies required.

## 6. Logging

`src/lib/logger.ts`:

```ts
logInfo(event, fields)
logError(event, fields)
```

- JSON to `console.log`/`console.error`.
- Fields: event, route/action, request id where available, outcome, duration.
- Never log tokens, keys, emails, full form bodies or sensitive data.
- Use in the health route and key Server Action error paths; do not add noisy logs to every call.

## 7. Smoke test

`scripts/smoke-test.ts`:

- Base URL from `SMOKE_BASE_URL`, default `http://127.0.0.1:3000`.
- `GET /api/health` → 200, `status: ok`.
- `GET /login` → 200 and the fan sign-in control is present.
- `GET /` → 200 `text/html`. The market route is partially prerendered, so the page shell may return 200 before the streamed auth gate resolves; the smoke test does not assert an HTTP redirect.
- Exit non-zero with a clear failure.
- `bun run smoke`.

## 8. CI delivery job

New job in `.github/workflows/ci.yml`:

1. Checkout, setup Bun, install.
2. Setup Supabase CLI; start local Supabase; `supabase db reset`.
3. Write `.env.local` from `supabase status -o env`.
4. `bun run build`.
5. Start `bun run start` in the background; wait for `/api/health`.
6. `bun run smoke`.
7. Stop the app and Supabase.

The job runs on pull requests and `main`, so the delivery path is continuously exercised.

## 9. Operations runbook

`docs/operations/runbook.md`:

- **Environments:** local, CI, release tag; no production claim.
- **Health:** endpoint, expected response, failure interpretation.
- **Logs:** JSON fields, where to find them (CI/terminal), what not to log.
- **Release:** pointer to release workflow; version/tag check.
- **Rollback:** redeploy previous tag; create a new patch tag for a bad release; never move tags.
- **Backup/restore:** local Supabase commands; dump/restore into a scratch database; verify row counts and a health check.
- **Incident:** detect → contain → diagnose → recover → record; use the incident template; no blame.
- **Known gaps:** no production environment, no alerting, no on-call.

## 10. SLO proposal

`docs/operations/slo.md`:

| Indicator | Proposed target | Measurement |
| --- | --- | --- |
| Health availability | 99.5% of probes over a defined window | CI/local smoke and health probes |
| Health latency p95 | < 500 ms local/CI | health probe timing |
| Capacity burst p95 | < 1,000 ms for 100 requests | capacity test timing |
| Error rate | 0 unhandled transport errors in the burst | capacity test |

These are **proposed local/CI targets**, not production SLOs. The measurement method and environment are part of the target.

## 11. p95 measurement

Extend `tests/invariants/tournament-capacity.test.ts`:

- Record `performance.now()` per RPC.
- Compute p95 from the 100 calls.
- `console.log` the p95 and environment.
- Do not fail the build on the first observation; record the value in the verification record and compare to the target.
- If p95 is stable, add a generous assertion in a later increment.

## 12. Backup/restore exercise

Local commands (documented, not run in CI unless easy):

```bash
bunx supabase db dump -f /tmp/matchpulse-backup.sql
bunx supabase db reset
psql "$(bunx supabase status -o env | ...)" -f /tmp/matchpulse-backup.sql
```

The exact CLI flags are verified before documenting them. The runbook records what was actually run and the observed row counts.

## 13. Acceptance criteria

| ID | Criterion | Verification |
| --- | --- | --- |
| AC-1 | `/api/health` returns 200 with app/db status and no sensitive data. | Smoke test + manual inspection |
| AC-2 | Health returns 503 when the DB check fails. | Fault test or code review; document if not simulated |
| AC-3 | Structured logs are JSON and contain no secrets/PII. | Code review + sample log |
| AC-4 | `bun run smoke` passes against a running app. | Local/CI |
| AC-5 | CI delivery job starts the app and runs the smoke check. | CI run |
| AC-6 | Operations runbook covers release, rollback, backup/restore and incident steps. | Review |
| AC-7 | p95 is observed and recorded with environment/scope. | CI log + verification record |
| AC-8 | Existing CI jobs remain green. | CI |

## 14. Risks and recovery

| Risk | Mitigation |
| --- | --- |
| Health endpoint leaks data | Return only status/timestamp; no counts/identities; test response keys. |
| Health endpoint is used as an auth bypass | It reads only public data; no mutation; no user context. |
| Smoke test is flaky | Use a health wait/retry; keep it deterministic; no auth/trade mutations. |
| CI time grows | Run delivery job in parallel; reuse Supabase setup where possible. |
| Logs contain secrets | Logger whitelist; code review; no form bodies/tokens. |
| p95 varies by runner | Record environment and value; do not hard-assert initially. |
| Backup/restore commands fail | Verify locally; document actual observed output; mark unverified if not run. |
| Local-only delivery is judged insufficient | The runbook states the choice and limit; a cloud deployment remains a future option. |

**Rollback:** revert the branch; the health/logging/smoke changes are additive; no schema migration; no data change.

## 15. Stop conditions

Stop and request direction if:

- the health endpoint cannot check the DB without exposing sensitive data;
- the CI delivery job cannot start the app within the job timeout;
- the smoke test requires auth/seeding that makes it non-deterministic;
- p95 cannot be measured reliably enough to record;
- backup/restore cannot be exercised without destructive local reset approval.

## 16. Approval requested

The human owner is asked to approve:

1. Local/CI delivery evidence instead of a cloud deployment.
2. Public read-only health endpoint.
3. JSON stdout logging.
4. Smoke test scope.
5. p95 measurement method.
6. Backup/restore exercise scope.

No implementation begins until this plan is approved.

## 17. Addendum 2026-11-08 — approved and adjusted during CI

The human owner approved this plan on 2026-11-08. During the first CI delivery
run, the smoke check expected `GET /` to reach `/login` through an HTTP
redirect. Under Partial Prerender, the market route returned `200` at the market
URL because the auth gate resolves inside the streamed component.

The smoke check was corrected to assert:

- health `200` with `status: ok` and `db: up`;
- the login page `200` with the fan sign-in control present;
- the home request `200` with a `text/html` content type.

This is a test-assumption correction, not a product or authorization change.
The market page still calls `requireUser()`, and the database boundary still
enforces authorization through RLS and `auth.uid()`.

## 18. Delivery note 2026-11-08

The plan was implemented on `feat/111-delivery-operations-baseline` (PR #112)
and verified in CI run
[42435007354](https://github.com/match-pulse/match-pulse/actions/runs/42435007354):

- build, typecheck, lint and architecture guards passed;
- the invariant suite passed 28 tests with 0 failures;
- the `Delivery smoke` job passed health, login UI and home HTML checks;
- the 100-request burst observed p50 245.46 ms, p95 463.11 ms and max 479.64 ms.

The backup/restore exercise is documented but was not run because Docker and
the local Supabase stack are unavailable in the implementation environment.
That limit is stated in the
[verification record](../verification/2026-11-111-delivery-operations-baseline.md).
