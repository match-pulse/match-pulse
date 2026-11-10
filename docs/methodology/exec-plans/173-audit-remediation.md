# Execution Plan — v3.1.0 Audit Remediation

- **Issue:** [#173](https://github.com/match-pulse/match-pulse/issues/173)
- **Status:** Approved
- **Owner:** Human developer
- **Date:** 2026-11-10
- **Workflow:** Development / Audit remediation

## 1. Intent

Remediate the v3.0.0 software audit (`docs/methodology/audits/2026-11-10-171-v3-audit.md`, FND-009–FND-028) and establish a reproducible local verification environment. The work closes the Critical security and market-integrity findings first, then the Major integrity/privacy findings, and records an explicit disposition for every remaining finding.

## 2. Current State and Evidence

- Baseline: `bbc4a43` (`v3.0.0`). Audit: PR [#172](https://github.com/match-pulse/match-pulse/pull/172).
- Audit result: 3 Critical, 9 Major, 6 Minor, 2 Informational; all Open.
- The audit is static. Node 22 and Bun 1.4.2 are now installed; lint, typecheck, build, architecture guards, secret scan and `bun audit` pass. Docker and local Supabase are not yet installed.
- FND-007 (real organizer observation) and FND-008 (independent human review) remain open human gates.

**Prior records reviewed:** findings register FND-001–FND-028; audit report; invariant registry; authorization, idempotency, delivery, recovery, v3 tenancy, CLI, auth UI, club features, retention and release verification records; ADR-003/007/008/009/010; threat model; failure modes; agent playbook; CI configuration.

## 3. Scope and Non-Goals

**In scope**
- FND-009–FND-028 remediation or explicit disposition.
- Critical fixes: anonymous auth, legacy RLS, platform-admin direct reads, result-bound market lifecycle, prediction-disable exits.
- Major fixes: cumulative buyer cap, venue capacity, legacy claim/registration scope, ticket payload idempotency, reward idempotency, entitlement limits and concurrency, retention, cohort suppression, verification evidence.
- Environment setup and full local verification.
- Documentation, ADRs, verification records, findings register and AI transparency updates.

**Out of scope**
- Hosted deployment, production recovery, external observability, real payments/KYC.
- FND-007 and FND-008 evidence unless the human supplies it.
- Unapproved new product features or architecture beyond the decisions below.

## 4. Assumptions and Uncertainty

- The local host has 5.6 GB RAM; Supabase plus Chromium may need service exclusions or temporary swap.
- Docker requires the human's sudo password.
- Local database reset and fault injection destroy local data; they require explicit authorization.
- Runtime checks may reveal defects not found by the static audit. New findings are appended to the register, not silently fixed.
- The audit is AI-authored; verification is a separate role pass and the human remains the final verifier.

## 5. Decisions and Human Approval

| Decision | Options / trade-offs | Recommendation | Human decision | Date |
|---|---|---|---|---|
| Market lifecycle | Keep entries until resolution / close entries at `FINISHED` and require a score-matching winner | Close entries at `FINISHED`; exits stay open until resolution; resolution requires `FINISHED` and a matching winner | Approved | 2026-11-10 |
| Capacity model | `ticket_allocation` only / venue `max_capacity` with allocation bounded by it | `max_capacity` is venue capacity; `ticket_allocation <= max_capacity`; v3 events reject legacy registration; purchases check both | Approved | 2026-11-10 |
| Reward idempotency | Optional key / required request key | Require a request key; update all callers and tests | Approved | 2026-11-10 |
| Retention | Ticket fields only / redact all derived identity records | 365-day window; redact transfer history and audit card numbers; add invite-email retention | Approved | 2026-11-10 |
| Legacy claim/registration | Remove / scope to legacy events | Scope to `club_id IS NULL`; hide those forms on v3 events | Approved | 2026-11-10 |
| Legacy CLUB surface | Retire / accept local-fixture risk | Retire `/club`, `/api/club/export`, the `CLUB` role and legacy analytics RPCs in a separate cleanup PR | Approved | 2026-11-10 |
| Points cap | Cap / accept simulated economy | Record an explicit simulated-economy acceptance unless a cap is required later | Approved | 2026-11-10 |
| Subscription period end | Enforce / document manual management | Manual management; document `current_period_end` as informational, no billing/expiry process | Approved | 2026-11-10 |
| Docker mode | Rootful / rootless | Rootful Docker CE for Supabase compatibility; accept docker-group root-equivalent access | Approved | 2026-11-10 |
| Local DB resets | Ask each time / authorize campaign | Authorize local `supabase db reset` and `fault:inject` resets for this remediation campaign | Approved | 2026-11-10 |

## 6. Acceptance Criteria

- [ ] FND-009 to FND-028 each have a recorded disposition and evidence link.
- [ ] Anonymous sign-in is disabled; removed staff cannot read attendee identity; platform admin direct reads are removed or audited.
- [ ] Market entries close at `FINISHED`; exits remain available; resolution requires `FINISHED` and a score-matching winner.
- [ ] Cumulative buyer cap, venue capacity, legacy scope and ticket payload checks are enforced in the database.
- [ ] Reward redemption is idempotent and covered by retry/concurrency tests.
- [ ] Inactive subscriptions are denied and plan limits are concurrency-safe.
- [ ] Retention covers transfer history, audit card numbers and invite emails; cohort suppression is outcome-level.
- [ ] Invariant claims match observed tests; fault injection covers the new guards.
- [ ] Full local suite passes and is recorded: lint, typecheck, build, architecture, secrets, audit, database/CLI/E2E, fault injection and smoke.
- [x] Findings move to Verified only with a separate verification record; the human decision owner confirmed all findings, including FND-007/FND-008, on 2026-11-10.

## 7. Work Breakdown

| Step | Deliverable | Responsible role | Dependencies | Affected areas |
|---|---|---|---|---|
| 1 | Audit records PR #172 | Orchestrator | Human review | `docs/methodology/` |
| 2 | Environment and baseline (#176) | Implementation / Test Engineer | Docker sudo install | Node, Bun, Docker, Supabase, verification record |
| 3 | Security boundary (#174) | Implementation / Security Reviewer | Baseline | config, RLS migration, auth/RLS tests, threat model |
| 4 | Market lifecycle (#175) | Implementation / Architect / Test Engineer | ADR approval | `open_trade`, `resolve_market`, match RPCs, UI, tests |
| 5 | Ticketing integrity (#178) | Implementation / Test Engineer | Capacity decision | `purchase_ticket`, event create/update, claim/registration, client/CLI |
| 6 | Reward idempotency (#180) | Implementation / Test Engineer | Signature change | reward schema/RPC, actions, UI, CLI, tests |
| 7 | Entitlements/concurrency (#177) | Implementation / Test Engineer | Baseline | invite/accept/event RPCs, subscription locks, tests |
| 8 | Privacy/cohorts (#179) | Implementation / Security/Privacy Reviewer | Retention decision | retention function, audit metadata, insights RPCs, tests |
| 9 | Evidence correction (#181) | Test Engineer / Verifier | Fixes 3–8 | invariant registry, fault matrix, verification records |
| 10 | Minor hardening/decisions (#182) | Implementation / Orchestrator | Human disposition | CSV, seed, legacy CLUB, points/period docs |
| 11 | Final campaign verification and release records | Verifier / Human | All fixes | audit closure, register, README, changelog, tag |

## 8. Verification

| Claim / criterion | Method | Command or evidence | Result |
|---|---|---|---|
| Environment ready | Version and status checks | `node --version`, `bun --version`, `docker info`, `bunx supabase status` | Pending |
| Static baseline | Lint/typecheck/build/guards | `bun run lint`, `typecheck`, `build`, `check:architecture`, `check:secrets`, `bun audit` | Passed without DB |
| Database invariants | Local Supabase suites | `bunx supabase db reset`, `bun run test` | Pending |
| CLI behaviour | Agent suite | `bun run test:agent` | Pending |
| UI journeys/accessibility | Playwright + axe | `bun run test:e2e` | Pending |
| Failure modes | Fault-injection matrix | `bun run fault:inject` | Pending |
| Delivery health | Smoke | `bun run smoke` | Pending |
| Each finding | Targeted tests + verification record | Per-PR evidence | Pending |

## 9. Risks and Recovery

- **Memory pressure:** close heavy apps; run sequentially; optional temporary 4 GB swap or Supabase service exclusions.
- **Docker install:** requires sudo; if the Docker CE repo fails, fall back to Fedora `moby-engine` plus a compatible Docker CLI, or rootless Docker with approval.
- **Destructive resets:** `db reset` and `fault:inject` delete local data; campaign authorization recorded above. Back up any desired local data first.
- **Schema/API changes:** reward request ID and market resolution rules change contracts; update all clients/tests and record in ADRs/changelog.
- **Data backfill:** capacity and retention migrations may update existing local rows; do not run against shared/production data.
- **Scope:** keep one workstream per branch/PR; stop if a decision changes.

## 10. Stop Conditions

- Docker or local Supabase cannot be made reliable after reasonable troubleshooting.
- A fix requires a new product/security decision not covered in §5.
- A migration would destroy data without explicit confirmation.
- A test reveals a conflict with a documented invariant or another open PR.
- Verification fails and the cause is not understood.
- The human withdraws approval or changes scope.

## 11. Completion Evidence

The campaign completed on 2026-11-10. The eight workstreams merged as PRs #184 (security boundary), #185 (market lifecycle), #186 (ticketing integrity), #187 (reward idempotency), #189 (subscription limits), #190 (privacy retention), #191 (minor hardening) and #192 (fault-injection evidence). Closure records merged in #193/#194 and the human-verification record in #195.

Observed final results: database suite 57 pass / 0 fail (473 expect calls), CLI 2 pass, E2E 11 passed, smoke passed, fault-injection 27/27 entries, and main CI run [42877928840](https://github.com/match-pulse/match-pulse/actions/runs/42877928840) passed all five jobs. FND-009–FND-028 have recorded dispositions; FND-023 is deferred to #188 and FND-026/FND-027 are accepted risks. FND-007 and FND-008 were confirmed Verified by the human decision owner on 2026-11-10, who authorized closure of issue #173.

**Records produced:** audit report and findings register (PR #172); this execution plan; remediation issues #174–#182; ADR-011; workstream and final verification records; AI transparency Entries 51–61; closure PRs #193–#195.

**Historical record check:** This plan is new. No existing audit, ADR, verification or findings record is overwritten; corrections are dated addenda.
