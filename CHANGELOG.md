# Changelog

All notable changes to MatchPulse, grouped by release. The detailed execution history lives in GitHub issues, pull requests and the project board; this file records what shipped and why it matters.

Format: [Keep a Changelog](https://keepachangelog.com/en/1.1.0/). Versioning: [Semantic Versioning](https://semver.org/).

## Release policy

- Not every issue or pull request gets an entry. Record notable user-facing or developer-facing changes: behaviour, API/schema/migration contracts, security and privacy, delivery and operations, breaking changes, deprecations and notable fixes.
- Do not record routine documentation, test-only changes, chores, internal refactors or dependency bumps unless they change a contract, a risk or how contributors work.
- Group related changes under one bullet and link the headline issue, PR, ADR or verification record.
- Prepare the release section when the release is being cut, not on every merge.
- The pre-policy PR ledger below is frozen for traceability. It is not the model for new entries.
- Tags and releases follow [`docs/workflows/release-workflow.md`](docs/workflows/release-workflow.md).

## [Unreleased]

No unreleased changes yet.

## [1.3.1] - 2026-11-08

Recovery drill and CI reliability.

### Added

- CI recovery drill: dumps the application-owned `public` schema, restores it into a scratch database, and verifies table count, RLS policy count, row count and a marker row.
- Recovery verification record with the observed counts and the restore-scope limits.
- Runbook commands for the public-schema backup, scratch restore and minimal `auth` shim.

### Changed

- The delivery job is now `Delivery and recovery`; it runs the backup/restore drill after smoke and re-runs smoke against the working database.
- CI uses the locked Supabase CLI dev dependency instead of downloading `supabase/setup-cli`.
- CI cleans up leftover Supabase containers before starting the local stack.

### Fixed

- Removed the external Supabase CLI download failure mode (`latest` resolution/504) from CI.
- Mitigated a leftover-container port conflict on the Supabase database port.

### Migration / upgrade notes

- No application or database migration.
- The recovery drill backs up only the application-owned `public` schema; Supabase-managed `auth`, `storage`, `realtime` and `vault` data are not in scope.

### Known gaps

- `pg_restore --clean` exits `1` on expected `DROP POLICY IF EXISTS` warnings in a fresh scratch database; the drill gates on explicit restored-state assertions and records the status.
- No production backup, retention, PITR, off-site storage, RTO/RPO or production recovery drill.
- No hosted deployment, external monitoring, alerting or tracing.
- M-INV1/2/3/5/8 and the M-INV7 details still lack fault injection (FND-002).
- No real-user evidence (FND-007) and no independent human review (FND-008).
- p95 remains an observation, not a hard gate.

### Evidence

- CI [42467767299](https://github.com/match-pulse/match-pulse/actions/runs/42467767299): build, 28 invariant tests and the recovery drill pass; 67,009-byte backup, tables 10→10, RLS policies 10→10, tournaments 2→2, marker restored.
- [Recovery verification](docs/methodology/verification/2026-11-117-recovery-drill.md); AI transparency Entry 30; [operations runbook](docs/operations/runbook.md).

## [1.3.0] - 2026-11-08

Delivery, observability and recovery baseline.

### Added

- `GET /api/health`: public, read-only app/database status with `200`/`503`, `cache-control: no-store`, and no counts, identities, secrets or environment values.
- Structured JSON logging (`src/lib/logger.ts`) for health failures and key market/registration failures; no tokens, keys, emails or form bodies.
- `bun run smoke`: waits for health and checks the health response, the login UI and the home HTML shell against a running app.
- CI `Delivery smoke` job: starts Supabase, applies migrations, builds, starts the app, waits for health and runs the smoke test.
- Operations runbook covering environments, health, logs, release, rollback, backup/restore and incident steps.
- Proposed SLOs and p95 measurement method; Checkpoint E pre-read for delivery, observability, recovery and service levels.
- Capacity burst now records p50/p95/max for the 100 concurrent registrations.

### Changed

- CI now runs three jobs: build/typecheck/lint/architecture, domain invariants, and delivery smoke.
- The Supabase CLI is pinned to `3.0.0` in CI instead of resolving `latest`.
- The health route is dynamic and uses a cookie-less anon client, so it does not depend on a user session or bake a build-time database check into the image.
- The smoke test asserts the home HTML shell, not an HTTP redirect, because the market route is partially prerendered and resolves the auth gate inside the streamed component.

### Fixed

- The health route no longer logs a false `health.db_check_failed` during the production build.
- Delivery CI no longer fails when the Supabase CLI `latest` lookup is rate-limited.

### Migration / upgrade notes

- No database migration is required for this release.
- The app still requires `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`; the health route uses the same anon key.
- `bun run smoke` expects a running app at `SMOKE_BASE_URL` (default `http://127.0.0.1:3000`).

### Known gaps

- No hosted deployment, TLS, DNS or production availability claim.
- No external log collector, metrics, tracing, dashboard or alerting.
- Backup/restore is documented but was not exercised in this environment; no production recovery drill exists.
- p95 is observed and recorded (463.11 ms and 571.68 ms in two CI runs), but it is environment-specific and not a hard CI gate.
- Sustained load and throughput remain unmeasured.
- M-INV1/2/3/5/8 and the M-INV7 details still lack fault injection (FND-002).
- The problem/outcome claims still lack real-user evidence (FND-007), and there is no independent human review (FND-008).
- No request-key retention/cleanup policy.

### Evidence

- Main CI [42435627680](https://github.com/match-pulse/match-pulse/actions/runs/42435627680): build, 28 invariant tests, and delivery smoke all pass.
- [Delivery verification](docs/methodology/verification/2026-11-111-delivery-operations-baseline.md); AI transparency Entry 27; [operations runbook](docs/operations/runbook.md); [SLO proposal](docs/operations/slo.md).
- **Correction 2026-11-08:** run [42435627680](https://github.com/match-pulse/match-pulse/actions/runs/42435627680) was the pull-request CI for #112. Main CI after the release merge was [42436376049](https://github.com/match-pulse/match-pulse/actions/runs/42436376049), also green.

## [1.2.0] - 2026-11-08

Request-key idempotency for entry and exit.

### Added

- `trade_requests` request keys with unique `(user_id, request_id)`, payload comparison, `IN_PROGRESS`/`COMPLETED` status and the resulting trade.
- M-INV9: retried entries and exits replay the recorded trade; the same key with a different payload is refused.
- Client-side request-key retention across retries; the key rotates after success or a payload change.
- Architecture guard updated to check the latest mutation RPC definitions and exact signatures.

### Changed

- `open_trade` and `close_trade` accept an optional request ID; the application always sends one.
- Existing tests use the explicit legacy null-key path; the idempotency suite uses real keys.
- Entry/exit request rows are owner-only through RLS; direct writes are denied.

### Fixed

- FND-003: a retry after cooldown no longer creates a duplicate entry or exit.

### Migration / upgrade notes

- Apply `20261111_trade_requests.sql` and `20261112_idempotent_rpcs.sql`; `supabase db reset` replays them locally.
- The 3-arg RPCs are replaced by 4-arg versions with a default request ID. The app and tests are updated; old callers can still omit the key, but that path is not idempotent.
- No data reset is required beyond applying the migrations; the new table is additive.

### Known gaps

- No request-key retention/cleanup policy.
- The legacy null-key path remains non-idempotent.
- Fault injection for the idempotency unique constraint was not observed locally.
- M-INV1/2/3/5/8 and the M-INV7 details still lack fault injection.
- No load/p95, deployment, observability or recovery evidence.
- The problem/outcome claims still lack real-user evidence, and there is no independent human review.

### Evidence

- Main CI [42425940843](https://github.com/match-pulse/match-pulse/actions/runs/42425940843): 28 tests pass, 0 fail.
- [Idempotency verification](docs/methodology/verification/2026-11-107-idempotent-trades.md); AI transparency Entry 25; [ADR-002 addendum](docs/architecture/adr/002-live-prediction-market.md).

## [1.1.0] - 2026-11-07

Authentication and database-enforced authorization.

### Added

- Supabase Auth fan sessions (anonymous) and organizer email/password sign-in; the auth trigger creates a profile with 200 points.
- Database authorization: `profiles.role`, RLS on every exposed table, least-privilege grants, `auth.uid()`-based mutation RPCs and organizer-only `resolve_market`.
- Public trade feed that exposes recent trades without identity.
- Login/sign-out UI, cookie-based server auth and Next.js proxy session refresh.
- Local `bun run auth:organizer` fixture.

### Changed

- Server Actions and RPCs no longer accept caller-supplied user IDs; identity comes from the auth session and `auth.uid()`.
- The market UI is authenticated and reads only the user's own private rows.
- The changelog is release-based; the pre-policy PR ledger is frozen and a release workflow was added. (#97, PR #98)
- Test suites use authenticated clients for mutations and a service-role client only for setup and committed-state reads.

### Fixed

- The capacity suite is self-contained and the uniqueness tests create their own fixtures (FND-005).

### Security

- Anonymous private reads and mutations are denied; fans read only their own rows; only organizers resolve markets; direct table writes are denied.
- The service role is local test/administration only and is never used by the application runtime.

### Migration / upgrade notes

- A local `supabase db reset` is required: `profiles.id` now references `auth.users`, registrations reference profiles, and the demo profile is removed.
- Add `SUPABASE_SERVICE_ROLE_KEY` to `.env.local` for tests and `bun run auth:organizer`; never expose it to the browser.
- Open `/login` and use **Continue as fan**, or create the organizer fixture with `bun run auth:organizer`.

### Known gaps

- No organizer management UI; resolution is an authorized RPC/test path.
- No idempotency keys, load/p95, deployment, observability or recovery evidence.
- M-INV1/2/3/5/8 and the M-INV7 details still lack fault injection.
- The problem/outcome claims still lack real-user evidence, and there is no independent human review.

### Evidence

- Main CI [42410413126](https://github.com/match-pulse/match-pulse/actions/runs/42410413126): 21 tests pass, 0 fail.
- [Authorization verification](docs/methodology/verification/2026-11-95-authorization-rls.md); AI transparency Entry 20; [ADR-003](docs/architecture/adr/003-authorization-rls.md).

## [1.0.0] - 2026-10-19

Initial tagged baseline.

### Added

- Tournament registration with database-enforced capacity.
- Live three-outcome prediction market: LMSR entry, exit and one-shot resolution.
- Local Supabase/Docker setup and GitHub Actions CI.
- Architecture and methodology records.

### Security

- No authentication, RLS or grants in this baseline. The database was **not** a security boundary; this tag is not a production-readiness claim.

### Evidence

- Tag `v1.0.0` on commit [`5fadb6c`](https://github.com/match-pulse/match-pulse/commit/5fadb6c); the detailed pre-policy ledger is below.

## Historical PR ledger (pre-policy, frozen 2026-11-07)

This table is the pre-policy execution record. It is kept for traceability and is not updated. New changes are recorded in the release sections above. Rows are not deleted or rewritten.

### 2026-11-07 (pre-policy)

| Date | Type | Summary | Issue | PR | Evidence |
|---|---|---|---|---|---|
| 2026-11-07 | Docs | establish workflow documentation, historical recordkeeping and changelog | [#91](https://github.com/match-pulse/match-pulse/issues/91) | [#92](https://github.com/match-pulse/match-pulse/pull/92) | CI + AI log Entry 17 |
| 2026-11-07 | Docs | specify the SDLC, development practices and Checkpoint C evidence | [#93](https://github.com/match-pulse/match-pulse/issues/93) | [#94](https://github.com/match-pulse/match-pulse/pull/94) | AI log Entry 18 |

### 2026-10-19

| Date | Type | Summary | Issue | PR | Evidence |
|---|---|---|---|---|---|
| 2026-10-19 | Docs | correct AI transparency log and complete Entry 4 | — | [#89](https://github.com/match-pulse/match-pulse/pull/89) | [5fadb6c](https://github.com/match-pulse/match-pulse/commit/5fadb6c) |
| 2026-10-19 | Test | cover exits during an active entry cooldown | [#85](https://github.com/match-pulse/match-pulse/issues/85) | [#88](https://github.com/match-pulse/match-pulse/pull/88) | [f302e70](https://github.com/match-pulse/match-pulse/commit/f302e70) |
| 2026-10-19 | Fixed | make the Docker environment reachable and reproducible | [#84](https://github.com/match-pulse/match-pulse/issues/84) | [#87](https://github.com/match-pulse/match-pulse/pull/87) | [de08c79](https://github.com/match-pulse/match-pulse/commit/de08c79) |
| 2026-10-19 | Docs | split overview and domain model and add C4 views | [#83](https://github.com/match-pulse/match-pulse/issues/83) | [#86](https://github.com/match-pulse/match-pulse/pull/86) | [ff3c26e](https://github.com/match-pulse/match-pulse/commit/ff3c26e) |
| 2026-10-19 | Chore | add claim-type issue forms and document the CLI flow | — | [#82](https://github.com/match-pulse/match-pulse/pull/82) | [10a9b9d](https://github.com/match-pulse/match-pulse/commit/10a9b9d) |
| 2026-10-19 | Architecture | resolve the architecture characteristics decisions | — | [#81](https://github.com/match-pulse/match-pulse/pull/81) | [c76de02](https://github.com/match-pulse/match-pulse/commit/c76de02) |
| 2026-10-19 | Docs | record checkpoint B flow evidence and correct stale references | — | [#80](https://github.com/match-pulse/match-pulse/pull/80) | [ffcea29](https://github.com/match-pulse/match-pulse/commit/ffcea29) |
| 2026-10-19 | Docs | add architecture code map and complete kata sections | — | [#79](https://github.com/match-pulse/match-pulse/pull/79) | [9278673](https://github.com/match-pulse/match-pulse/commit/9278673) |
| 2026-10-19 | Docs | record market delivery, evidence and honest gaps | [#68](https://github.com/match-pulse/match-pulse/issues/68) | [#74](https://github.com/match-pulse/match-pulse/pull/74) | [ebec7a8](https://github.com/match-pulse/match-pulse/commit/ebec7a8) |
| 2026-10-19 | Added | add the market UI and retire fixed-score predictions | [#67](https://github.com/match-pulse/match-pulse/issues/67) | [#73](https://github.com/match-pulse/match-pulse/pull/73) | [44279a3](https://github.com/match-pulse/match-pulse/commit/44279a3) |
| 2026-10-19 | Added | resolve markets once and enforce the cooldown window | [#66](https://github.com/match-pulse/match-pulse/issues/66) | [#72](https://github.com/match-pulse/match-pulse/pull/72) | [3344dfd](https://github.com/match-pulse/match-pulse/commit/3344dfd) |
| 2026-10-19 | Added | add the LMSR market engine and pricing suite | [#65](https://github.com/match-pulse/match-pulse/issues/65) | [#71](https://github.com/match-pulse/match-pulse/pull/71) | [1c8336a](https://github.com/match-pulse/match-pulse/commit/1c8336a) |
| 2026-10-19 | Docs | pivot architecture to the live prediction market | [#64](https://github.com/match-pulse/match-pulse/issues/64) | [#70](https://github.com/match-pulse/match-pulse/pull/70) | [f959e44](https://github.com/match-pulse/match-pulse/commit/f959e44) |
| 2026-10-19 | Fixed | close the consistency-audit remediation findings | [#63](https://github.com/match-pulse/match-pulse/issues/63) | [#69](https://github.com/match-pulse/match-pulse/pull/69) | [ca0f33f](https://github.com/match-pulse/match-pulse/commit/ca0f33f) |
| 2026-10-19 | Docs | record execution outcome, deviations and remaining open items | — | [#62](https://github.com/match-pulse/match-pulse/pull/62) | [ac9634a](https://github.com/match-pulse/match-pulse/commit/ac9634a) |
| 2026-10-19 | Chore | fix Docker, Compose and README reproducibility gaps | [#55](https://github.com/match-pulse/match-pulse/issues/55) | [#61](https://github.com/match-pulse/match-pulse/pull/61) | [a5f4fe1](https://github.com/match-pulse/match-pulse/commit/a5f4fe1) |
| 2026-10-19 | Test | make invariant tests enforceable and run them in CI | [#54](https://github.com/match-pulse/match-pulse/issues/54) | [#60](https://github.com/match-pulse/match-pulse/pull/60) | [6526195](https://github.com/match-pulse/match-pulse/commit/6526195) |
| 2026-10-19 | Added | add the end-to-end registration path | [#53](https://github.com/match-pulse/match-pulse/issues/53) | [#59](https://github.com/match-pulse/match-pulse/pull/59) | [62a0145](https://github.com/match-pulse/match-pulse/commit/62a0145) |
| 2026-10-19 | Added | enforce capacity and uniqueness in the schema | [#51](https://github.com/match-pulse/match-pulse/issues/51) | [#58](https://github.com/match-pulse/match-pulse/pull/58) | [dd1c7df](https://github.com/match-pulse/match-pulse/commit/dd1c7df) |
| 2026-10-19 | Docs | correct methodology claims and record real AI disclosure | [#52](https://github.com/match-pulse/match-pulse/issues/52) | [#57](https://github.com/match-pulse/match-pulse/pull/57) | [5e45e40](https://github.com/match-pulse/match-pulse/commit/5e45e40) |
| 2026-10-19 | Docs | align kata with capacity and add measurable architecture targets | [#50](https://github.com/match-pulse/match-pulse/issues/50) | [#56](https://github.com/match-pulse/match-pulse/pull/56) | [67ff6f1](https://github.com/match-pulse/match-pulse/commit/67ff6f1) |
| 2026-10-19 | Docs | assemble final checkpoint B README with evidence | — | — | [e15413b](https://github.com/match-pulse/match-pulse/commit/e15413b) |
| 2026-10-19 | Docs | document AI-DLC operating model and SDLC strategy | — | — | [ee465e3](https://github.com/match-pulse/match-pulse/commit/ee465e3) |
| 2026-10-19 | Docs | write system dynamics focusing on capacity burst | — | — | [cbc1f7a](https://github.com/match-pulse/match-pulse/commit/cbc1f7a) |
| 2026-10-19 | Docs | Update README for Checkpoint A with new claims and tests | — | — | [0fec931](https://github.com/match-pulse/match-pulse/commit/0fec931) |
| 2026-10-19 | Docs | Update governance document for stakeholder interests and risks | — | — | [117ebb0](https://github.com/match-pulse/match-pulse/commit/117ebb0) |
| 2026-10-19 | Docs | Update product claims for tournament registration system | — | — | [4172092](https://github.com/match-pulse/match-pulse/commit/4172092) |
| 2026-10-19 | Docs | Revise invariants for tournament capacity and uniqueness | — | — | [4978e1f](https://github.com/match-pulse/match-pulse/commit/4978e1f) |
| 2026-10-19 | Docs | Revise user and problem context for clarity | — | — | [ee6587c](https://github.com/match-pulse/match-pulse/commit/ee6587c) |
| 2026-10-19 | Docs | assemble final checkpoint A README with evidence | — | — | [3f826d7](https://github.com/match-pulse/match-pulse/commit/3f826d7) |
| 2026-10-19 | Docs | Refine language in governance document | — | — | [2ee1287](https://github.com/match-pulse/match-pulse/commit/2ee1287) |
| 2026-10-19 | Changed | Revise governance document for stakeholder matrix and risks | — | — | [1b84da6](https://github.com/match-pulse/match-pulse/commit/1b84da6) |
| 2026-10-19 | Docs | map stakeholder governance and escalation protocol | — | — | [a9f18a0](https://github.com/match-pulse/match-pulse/commit/a9f18a0) |
| 2026-10-19 | Docs | draft product claims with explicit limits | — | — | [36052b2](https://github.com/match-pulse/match-pulse/commit/36052b2) |
| 2026-10-19 | Docs | define system invariants and enforcement guards | — | — | [8e8989d](https://github.com/match-pulse/match-pulse/commit/8e8989d) |
| 2026-10-19 | Docs | draft bounded proposal and scope | — | — | [61ebfde](https://github.com/match-pulse/match-pulse/commit/61ebfde) |
| 2026-10-19 | Docs | create empty AI transparency log template | — | — | [06ea17a](https://github.com/match-pulse/match-pulse/commit/06ea17a) |
| 2026-10-19 | Changed | fix UI placeholders, lock prediction form on submit, and update agent context | — | — | [acb1eb9](https://github.com/match-pulse/match-pulse/commit/acb1eb9) |
| 2026-10-19 | Docs | add system overview, domain model, and data flow | — | — | [6d7af12](https://github.com/match-pulse/match-pulse/commit/6d7af12) |
| 2026-10-19 | Docs | add professional repository README with quickstart guide | — | — | [e45ff0e](https://github.com/match-pulse/match-pulse/commit/e45ff0e) |
| 2026-10-19 | Docs | map domain concerns to architecture characteristics | — | — | [92a602d](https://github.com/match-pulse/match-pulse/commit/92a602d) |
| 2026-10-19 | Test | add invariant test for tournament capacity burst | — | — | [3069cd1](https://github.com/match-pulse/match-pulse/commit/3069cd1) |
| 2026-10-19 | Chore | provide placeholder env vars for Next.js build | — | — | [81ddd51](https://github.com/match-pulse/match-pulse/commit/81ddd51) |
| 2026-10-19 | Fixed | resolve explicit any type in predictions list | — | — | [d5e4749](https://github.com/match-pulse/match-pulse/commit/d5e4749) |
| 2026-10-19 | Chore | add GitHub Actions workflow for build and linting | — | — | [2126277](https://github.com/match-pulse/match-pulse/commit/2126277) |
| 2026-10-19 | Added | implement split layout, predictions table, and point deduction logic | — | — | [509d780](https://github.com/match-pulse/match-pulse/commit/509d780) |

### 2026-10-18

| Date | Type | Summary | Issue | PR | Evidence |
|---|---|---|---|---|---|
| 2026-10-18 | Chore | fix local docker connection limits and stabilize invariant test | — | — | [91bc0f8](https://github.com/match-pulse/match-pulse/commit/91bc0f8) |
| 2026-10-18 | Chore | promote release identity to v1.0.0 | — | — | [16057ad](https://github.com/match-pulse/match-pulse/commit/16057ad) |
| 2026-10-18 | Chore | add Dockerfile and release.env for local containerization | — | — | [446ad3d](https://github.com/match-pulse/match-pulse/commit/446ad3d) |
| 2026-10-18 | Test | add invariant test for atomic prediction lock | — | — | [a93edcb](https://github.com/match-pulse/match-pulse/commit/a93edcb) |
| 2026-10-18 | Added | add prediction schema and atomic submit_prediction RPC | — | — | [aba48ee](https://github.com/match-pulse/match-pulse/commit/aba48ee) |
| 2026-10-18 | Added | initialize Next.js app and configure Supabase client with bun | — | — | [f7d832b](https://github.com/match-pulse/match-pulse/commit/f7d832b) |
| 2026-10-18 | Docs | add ADR-001 for Next.js and Supabase | — | — | [ca77b56](https://github.com/match-pulse/match-pulse/commit/ca77b56) |
| 2026-10-18 | Docs | Clarify match score update process in kata.md | — | — | [4d3c8d2](https://github.com/match-pulse/match-pulse/commit/4d3c8d2) |
| 2026-10-18 | Docs | Revise MatchPulse platform description and details | — | — | [c0290f2](https://github.com/match-pulse/match-pulse/commit/c0290f2) |
| 2026-10-18 | Docs | Refine requirements for spectators wagering points | — | — | [cf12fb0](https://github.com/match-pulse/match-pulse/commit/cf12fb0) |
| 2026-10-18 | Docs | Revise MatchPulse architecture documentation | — | — | [414a5f0](https://github.com/match-pulse/match-pulse/commit/414a5f0) |
| 2026-10-18 | Docs | Enhance README with detailed project features | — | — | [254eeac](https://github.com/match-pulse/match-pulse/commit/254eeac) |
| 2026-10-18 | Docs | Enhance documentation for MatchPulse architecture | — | — | [b106973](https://github.com/match-pulse/match-pulse/commit/b106973) |
| 2026-10-18 | Docs | add MatchPulse architectural kata | — | — | [530b483](https://github.com/match-pulse/match-pulse/commit/530b483) |

### 2026-10-17

| Date | Type | Summary | Issue | PR | Evidence |
|---|---|---|---|---|---|
| 2026-10-17 | Docs | add project README | — | — | [5be8103](https://github.com/match-pulse/match-pulse/commit/5be8103) |

### Notes

- 2026-11-07: The historical table was reconstructed from `git log --no-merges` and merged PR bodies. Issue links are present only where a PR body contains an explicit closing reference; they were not inferred.
- The first entry after this changelog is established is recorded contemporaneously and links its issue, PR, verification, and AI transparency entry.


[Unreleased]: https://github.com/match-pulse/match-pulse/compare/v1.3.1...HEAD
[1.3.1]: https://github.com/match-pulse/match-pulse/compare/v1.3.0...v1.3.1
[1.3.0]: https://github.com/match-pulse/match-pulse/compare/v1.2.0...v1.3.0
[1.2.0]: https://github.com/match-pulse/match-pulse/compare/v1.1.0...v1.2.0
[1.1.0]: https://github.com/match-pulse/match-pulse/compare/v1.0.0...v1.1.0
[1.0.0]: https://github.com/match-pulse/match-pulse/commit/5fadb6c
