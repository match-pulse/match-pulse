# Findings Register

Permanent index of every audit, refactor, incident, and verification finding. The linked source record remains authoritative; this register provides identity, status, relations, and lifecycle.

## Rules

- Every finding gets one identifier: `FND-NNN`. Identifiers are never reused.
- Rows are never deleted. Duplicates are linked and marked `Duplicate`.
- A recurrence links to the original finding and is marked `Recurrence`.
- Every status change adds a row to the lifecycle log.
- A finding becomes `Verified` only when a verification record supports closure.
- The implementer does not verify or close its own finding.
- Before new work, search this register and link any matching open, closed, or deferred finding.

## Status values

`Open` · `Triaged` · `Approved` · `In Progress` · `Fixed` · `Verified` · `Deferred` · `Accepted Risk` · `Duplicate` · `Recurrence` · `Won't Fix` · `Superseded`

## Findings

Recorded 2026-11-07 from the current known gaps and the Checkpoint C quality review. These are current findings, not retroactively invented history.

Findings FND-009 to FND-028 were appended on 2026-11-10 from the [v3.0.0 audit](audits/2026-11-10-171-v3-audit.md). The 2026-11-07 sentence above remains the historical note for FND-001 to FND-008.

| ID | Type | Title | Severity / Impact | Status | Source record | Issue | PR | Remediation | Verification |
|---|---|---|---|---|---|---|---|---|---|
| FND-001 | Security | No authentication, RLS or grants; anon can act as any participant and call `resolve_market` | Critical | Fixed | [README Known gaps](../../README.md#known-gaps); [INV-05](checkpoint-A/02-invariants.md) | [#95](https://github.com/match-pulse/match-pulse/issues/95) | [#96](https://github.com/match-pulse/match-pulse/pull/96) | Supabase Auth, roles, RLS, grants, `SECURITY DEFINER` RPCs and organizer check | [Verification record](verification/2026-11-95-authorization-rls.md); CI run 42397891717 |
| FND-002 | Verification | M-INV1, M-INV2, M-INV3, M-INV5 and M-INV8, plus the M-INV7 ladder, cap, decay, scope, no-escalation and exit exemption, have passing tests but no observed-red fault injection | Major | Partly fixed | [Invariant registry](checkpoint-A/02-invariants.md); [README Known gaps](../../README.md#known-gaps) | [#125](https://github.com/match-pulse/match-pulse/issues/125) | [#126](https://github.com/match-pulse/match-pulse/pull/126) | Fault-injection matrix: 10 observed-red mutations + M-INV2 forced-failure rollback; M-INV2 cannot be observed-red without a second connection | [Verification record](verification/2026-11-125-market-fault-injections.md); CI run 42474762811 |
| FND-003 | Reliability | No idempotency keys; a retry after the entry cooldown is accepted as a new entry | Major | Fixed | [README Known gaps](../../README.md#known-gaps); [AI log Entry 11](ai-transparency-log.md) | [#107](https://github.com/match-pulse/match-pulse/issues/107) | [#108](https://github.com/match-pulse/match-pulse/pull/108) | `trade_requests` request keys; replay/refusal in `open_trade`/`close_trade`; client-side key retention | CI run 42425131584; `idempotency.test.ts`; verification record |
| FND-004 | Performance | No load or p95 latency measurement; the elasticity target is unmeasured | Major | Verified | [README Known gaps](../../README.md#known-gaps); [architecture characteristics §3.1](../architecture/03-architecture-characteristics.md) | [#111](https://github.com/match-pulse/match-pulse/issues/111), [#199](https://github.com/match-pulse/match-pulse/issues/199) | [#112](https://github.com/match-pulse/match-pulse/pull/112) | Registration and 20-buyer ticket bursts assert p95 < 1,000 ms in CI; observed p95 878 ms and 241 ms | [p95 gate verification](verification/2026-11-199-p95-gate.md) |
| FND-005 | Test quality | Capacity second test depends on the first; uniqueness third test depends on the previous two | Minor | Fixed | [Checkpoint C test-case process](checkpoint-C/04-test-case-process.md); `tests/invariants/` | [#95](https://github.com/match-pulse/match-pulse/issues/95) | [#96](https://github.com/match-pulse/match-pulse/pull/96) | Capacity suite merged into one self-contained scenario; uniqueness tests create their own user and tournament | CI run 42397891717; 21 tests pass |
| FND-006 | Operations | No deployment, observability or recovery evidence; operation is proposed, not observed | Major | Partly fixed | [Architecture characteristics §3.2/§6](../architecture/03-architecture-characteristics.md); [Checkpoint C residual risk](checkpoint-C/05-residual-risk.md) | [#111](https://github.com/match-pulse/match-pulse/issues/111), [#117](https://github.com/match-pulse/match-pulse/issues/117) | [#112](https://github.com/match-pulse/match-pulse/pull/112), [#118](https://github.com/match-pulse/match-pulse/pull/118) | Health, JSON logs, smoke, `Delivery and recovery` CI job, runbook, SLOs and an exercised public-schema backup/restore drill; no hosted deployment or production recovery | [Delivery verification](verification/2026-11-111-delivery-operations-baseline.md); [Recovery drill](verification/2026-11-117-recovery-drill.md); CI run 42467767299 |
| FND-007 | Context | The problem claim has no real organizer observation; it is a hypothesis | Major | Verified | [Checkpoint A product claims §1](checkpoint-A/03-product-claims.md); [bounded proposal §1](checkpoint-A/01-bounded-proposal.md) | — | — | Human decision owner confirmed the problem claim as verified on 2026-11-10 | [Final campaign verification](verification/2026-11-173-audit-remediation.md) |
| FND-008 | Collaboration | No independent human review; review is structured self-review plus automated checks and agent role passes | Minor | Verified | [Operating model §6](checkpoint-B/02-operating-model.md); [Checkpoint C review decisions](checkpoint-C/03-review-decision.md) | — | — | Human decision owner confirmed independent human review on 2026-11-10 | [Final campaign verification](verification/2026-11-173-audit-remediation.md) |
| FND-009 | Security | Anonymous sign-ins are enabled and mint authenticated profiles with 200 points and all fan privileges | Critical | Verified | [v3.0.0 audit](audits/2026-11-10-171-v3-audit.md) AUD-001 | [#171](https://github.com/match-pulse/match-pulse/issues/171), [#174](https://github.com/match-pulse/match-pulse/issues/174) | — | Anonymous sign-ins disabled; refusal test and full authorization suite pass; human-verified 2026-11-10 | [Security boundary verification](verification/2026-11-174-security-boundary.md) |
| FND-010 | Security / Privacy | Former staff retain attendee identity read through `tickets_select_organizer` | Critical | Verified | [v3.0.0 audit](audits/2026-11-10-171-v3-audit.md) AUD-002 | [#171](https://github.com/match-pulse/match-pulse/issues/171), [#174](https://github.com/match-pulse/match-pulse/issues/174) | — | Legacy organizer ticket/registration policies dropped; removed-member and current-role tests pass; human-verified 2026-11-10 | [Security boundary verification](verification/2026-11-174-security-boundary.md) |
| FND-011 | Market integrity | Entry remains open after the match is `FINISHED`; resolution can be early or inconsistent with the score | Critical | Verified | [v3.0.0 audit](audits/2026-11-10-171-v3-audit.md) AUD-003 | [#171](https://github.com/match-pulse/match-pulse/issues/171), [#175](https://github.com/match-pulse/match-pulse/issues/175) | — | Result-bound trigger guards, UI/CLI updates and targeted tests pass; human-verified 2026-11-10 | [Market lifecycle verification](verification/2026-11-175-market-lifecycle.md) |
| FND-012 | Ticketing | `max_per_buyer` is checked per order, not cumulatively per event | Major | Verified | [v3.0.0 audit](audits/2026-11-10-171-v3-audit.md) AUD-004 | [#171](https://github.com/match-pulse/match-pulse/issues/171), [#178](https://github.com/match-pulse/match-pulse/issues/178) | — | Cumulative buyer-limit trigger and sequential/concurrent tests pass; human-verified 2026-11-10 | [Ticketing integrity verification](verification/2026-11-178-ticketing-integrity.md) |
| FND-013 | Reliability | Reward redemption is not idempotent and can double-charge on retry or double submit | Major | Verified | [v3.0.0 audit](audits/2026-11-10-171-v3-audit.md) AUD-005 | [#171](https://github.com/match-pulse/match-pulse/issues/171), [#180](https://github.com/match-pulse/match-pulse/issues/180) | — | Required request key, replay/mismatch semantics and concurrent tests pass; human-verified 2026-11-10 | [Reward idempotency verification](verification/2026-11-180-reward-idempotency.md) |
| FND-014 | Market invariant | Disabling predictions blocks exits as well as entries | Major | Verified | [v3.0.0 audit](audits/2026-11-10-171-v3-audit.md) AUD-006 | [#171](https://github.com/match-pulse/match-pulse/issues/171), [#175](https://github.com/match-pulse/match-pulse/issues/175) | — | Trigger gates `BUY` only; disable-then-exit test passes; human-verified 2026-11-10 | [Market lifecycle verification](verification/2026-11-175-market-lifecycle.md) |
| FND-015 | Privacy | Retention clears ticket fields only; transfer history, audit card numbers and invite emails persist | Major | Verified | [v3.0.0 audit](audits/2026-11-10-171-v3-audit.md) AUD-007 | [#171](https://github.com/match-pulse/match-pulse/issues/171), [#179](https://github.com/match-pulse/match-pulse/issues/179) | — | Transfer/audit/invite retention and boundary tests pass; human-verified 2026-11-10 | [Privacy retention verification](verification/2026-11-179-privacy-retention.md) |
| FND-016 | Privacy | Threshold-5 suppression is applied per market, not per outcome cohort | Major | Verified | [v3.0.0 audit](audits/2026-11-10-171-v3-audit.md) AUD-008 | [#171](https://github.com/match-pulse/match-pulse/issues/171), [#179](https://github.com/match-pulse/match-pulse/issues/179) | — | Outcome/time-bucket cohort counting and skewed-5 test pass; human-verified 2026-11-10 | [Privacy retention verification](verification/2026-11-179-privacy-retention.md) |
| FND-017 | Domain integrity | Legacy `claim_ticket` bypasses v3 nominal ticketing on v3 events | Major | Verified | [v3.0.0 audit](audits/2026-11-10-171-v3-audit.md) AUD-009 | [#171](https://github.com/match-pulse/match-pulse/issues/171), [#178](https://github.com/match-pulse/match-pulse/issues/178) | — | Claim/registration scoped to `club_id IS NULL`; v3 refusal tests pass; human-verified 2026-11-10 | [Ticketing integrity verification](verification/2026-11-178-ticketing-integrity.md) |
| FND-018 | Domain integrity | Ticket sales are not bounded by venue capacity; registrations and tickets use independent counters | Major | Verified | [v3.0.0 audit](audits/2026-11-10-171-v3-audit.md) AUD-010 | [#171](https://github.com/match-pulse/match-pulse/issues/171), [#178](https://github.com/match-pulse/match-pulse/issues/178) | — | Capacity/configuration triggers and v3 refusal tests pass; registrations are club-event-disabled; human-verified 2026-11-10 | [Ticketing integrity verification](verification/2026-11-178-ticketing-integrity.md) |
| FND-019 | Entitlements | Missing or inactive subscriptions become unlimited member/event plans | Major | Verified | [v3.0.0 audit](audits/2026-11-10-171-v3-audit.md) AUD-011 | [#171](https://github.com/match-pulse/match-pulse/issues/171), [#177](https://github.com/match-pulse/match-pulse/issues/177) | — | Active entitlement required; canceled-club test passes; human-verified 2026-11-10 | [Subscription limits verification](verification/2026-11-177-subscription-limits.md) |
| FND-020 | Verification | Several “Verified” invariant claims exceed the tests in the repository | Major | Verified | [v3.0.0 audit](audits/2026-11-10-171-v3-audit.md) AUD-012 | [#171](https://github.com/match-pulse/match-pulse/issues/171), [#181](https://github.com/match-pulse/match-pulse/issues/181) | — | Registry evidence corrected; 27-entry fault-injection matrix observed red, including the v3.1.0 guards; human-verified 2026-11-10 | [Fault-injection verification](verification/2026-11-181-fault-injection.md) |
| FND-021 | Security | CSV exports do not neutralise spreadsheet formula prefixes | Minor | Verified | [v3.0.0 audit](audits/2026-11-10-171-v3-audit.md) AUD-013 | [#171](https://github.com/match-pulse/match-pulse/issues/171), [#182](https://github.com/match-pulse/match-pulse/issues/182) | — | Shared sanitizer prefixes formula-leading values; unit tests pass; human-verified 2026-11-10 | [Minor hardening verification](verification/2026-11-182-minor-hardening.md) |
| FND-022 | Privacy | Platform admin reads fan-card and invite data directly without an audited support path | Minor | Verified | [v3.0.0 audit](audits/2026-11-10-171-v3-audit.md) AUD-014 | [#171](https://github.com/match-pulse/match-pulse/issues/171), [#174](https://github.com/match-pulse/match-pulse/issues/174) | — | Direct platform-admin policies removed; scoped admin RPCs remain; human-verified 2026-11-10 | [Security boundary verification](verification/2026-11-174-security-boundary.md) |
| FND-023 | Privacy | Legacy `CLUB` role sees cross-club aggregate analytics | Minor | Deferred | [v3.0.0 audit](audits/2026-11-10-171-v3-audit.md) AUD-015 | [#171](https://github.com/match-pulse/match-pulse/issues/171), [#188](https://github.com/match-pulse/match-pulse/issues/188) | — | Legacy surface is a local-fixture path; retirement tracked in #188 with human approval | [Dispositions](remediation/2026-11-10-audit-dispositions.md) |
| FND-024 | Demo data | The seeded Summer Cup market is unresolvable by any user | Minor | Verified | [v3.0.0 audit](audits/2026-11-10-171-v3-audit.md) AUD-016 | [#171](https://github.com/match-pulse/match-pulse/issues/171), [#182](https://github.com/match-pulse/match-pulse/issues/182) | — | Seed tournament assigned to the organizer fixture; local resolution smoke passed; human-verified 2026-11-10 | [Minor hardening verification](verification/2026-11-182-minor-hardening.md) |
| FND-025 | Reliability | Ticket purchase replay does not cover the attendee payload, and the client key is not rotated on payload change | Minor | Verified | [v3.0.0 audit](audits/2026-11-10-171-v3-audit.md) AUD-017 | [#171](https://github.com/match-pulse/match-pulse/issues/171), [#182](https://github.com/match-pulse/match-pulse/issues/182) | — | Payload hash persisted and compared on replay; checkout rotates the key; mismatch test passes; human-verified 2026-11-10 | [Minor hardening verification](verification/2026-11-182-minor-hardening.md) |
| FND-026 | Product / Economy | Club-controlled `ticket_points` issuance is unbounded | Informational | Accepted Risk | [v3.0.0 audit](audits/2026-11-10-171-v3-audit.md) AUD-018 | [#171](https://github.com/match-pulse/match-pulse/issues/171) | — | Simulated economy accepted; no cap until rewards become a real commercial promise | [Dispositions](remediation/2026-11-10-audit-dispositions.md) |
| FND-027 | Billing model | Subscription `current_period_end` is stored but never enforced | Informational | Accepted Risk | [v3.0.0 audit](audits/2026-11-10-171-v3-audit.md) AUD-019 | [#171](https://github.com/match-pulse/match-pulse/issues/171) | — | Manual subscription management accepted; period end is informational, no billing/renewal process | [Dispositions](remediation/2026-11-10-audit-dispositions.md) |
| FND-028 | Concurrency | Plan member and active-event limits are count-then-insert without a club lock | Minor | Verified | [v3.0.0 audit](audits/2026-11-10-171-v3-audit.md) AUD-020 | [#171](https://github.com/match-pulse/match-pulse/issues/171), [#177](https://github.com/match-pulse/match-pulse/issues/177) | — | Subscription lock serialises limit checks; concurrent STARTER test passes; human-verified 2026-11-10 | [Subscription limits verification](verification/2026-11-177-subscription-limits.md) |

## Relations

| ID | Relation | Related ID | Evidence | Date |
|---|---|---|---|---|
| FND-001 | Related | FND-004 | An unauthenticated exposed RPC surface makes a public load test and production authorization evidence meaningless until access control exists | 2026-11-07 |
| FND-003 | Related | FND-001 | A retry can create a second entry without a request key, and the open RPC surface makes the retry reachable by anyone | 2026-11-07 |
| FND-005 | Related | FND-002 | Dependent tests reduce the credibility of the invariant evidence that the remaining injections are meant to strengthen | 2026-11-07 |
| FND-009 | Related | FND-001 | The prior finding removed the missing auth boundary; anonymous sessions are a residual identity bypass in the same boundary | 2026-11-10 |
| FND-010 | Related | FND-001 | The prior RLS fix did not remove the legacy organizer policy, leaving a private-table attendee read | 2026-11-10 |
| FND-013 | Related | FND-003 | The trade path has request-key idempotency, but reward redemption does not | 2026-11-10 |
| FND-012 | Related | FND-020 | The max-per-buyer defect is one of the claims whose verification evidence is overstated | 2026-11-10 |
| FND-013 | Related | FND-020 | The reward-idempotency playbook claim is part of the evidence gap | 2026-11-10 |
| FND-015 | Related | FND-020 | The retention test does not cover transfer history or audit metadata | 2026-11-10 |
| FND-016 | Related | FND-020 | The suppression test does not cover the outcome-cohort boundary | 2026-11-10 |
| FND-014 | Related | FND-002 | The market invariant evidence covers the entry window and exits during cooldown but not disabling predictions | 2026-11-10 |
| FND-017 | Related | FND-001 | The legacy claim RPC remains an authenticated path that bypasses the v3 ticketing boundary | 2026-11-10 |
| FND-020 | Related | FND-002, FND-005 | The verification claim is broader than the observed fault-injection and test-quality evidence | 2026-11-10 |
| FND-025 | Related | FND-003, FND-005 | Ticket idempotency follows the trade principle but does not cover the payload or the CLI key | 2026-11-10 |
| FND-027 | Related | FND-019 | Both findings concern whether subscription state and limits are actually enforced | 2026-11-10 |
| FND-028 | Related | FND-019, FND-020 | The concurrency gap affects the same plan-limit control and is not covered by the current evidence | 2026-11-10 |

## Lifecycle log

| Date | ID | Event | Evidence / link |
|---|---|---|---|
| 2026-11-07 | FND-001 | Recorded as Open from the README known gaps and INV-05 | [Risk R-01](checkpoint-C/01-risk-control-map.md) |
| 2026-11-07 | FND-002 | Recorded as Open from the invariant registry status | [Risk R-05](checkpoint-C/01-risk-control-map.md) |
| 2026-11-07 | FND-003 | Recorded as Open from the README known gaps and AI log Entry 11 | [Risk R-03](checkpoint-C/01-risk-control-map.md) |
| 2026-11-07 | FND-004 | Recorded as Open from the architecture characteristics status | [Risk R-05](checkpoint-C/01-risk-control-map.md) |
| 2026-11-07 | FND-005 | Recorded as Open from the Checkpoint C test-case review | [Test-case process §7](checkpoint-C/04-test-case-process.md) |
| 2026-11-07 | FND-006 | Recorded as Open from the architecture characteristics status | [Residual risk RR-06](checkpoint-C/05-residual-risk.md) |
| 2026-11-07 | FND-007 | Recorded as Open from the Checkpoint A product claims | [Residual risk RR-07](checkpoint-C/05-residual-risk.md) |
| 2026-11-07 | FND-008 | Recorded as Open from the operating model limits | [Residual risk RR-08](checkpoint-C/05-residual-risk.md) |
| 2026-11-10 | FND-007 | Verified by the human decision owner; campaign #173 closed | [Final campaign verification](verification/2026-11-173-audit-remediation.md) |
| 2026-11-10 | FND-008 | Verified by the human decision owner; campaign #173 closed | [Final campaign verification](verification/2026-11-173-audit-remediation.md) |
| 2026-11-07 | FND-001 | Fixed in #95 / PR #96; authorization suite passed in CI run 42397891717; independent human verification remains pending | [Verification record](verification/2026-11-95-authorization-rls.md) |
| 2026-11-07 | FND-005 | Fixed in #95 / PR #96; capacity suite is self-contained and uniqueness tests create their own fixtures; CI run 42397891717 passes | [Verification record](verification/2026-11-95-authorization-rls.md) |
| 2026-11-08 | FND-003 | Fixed in #107 / PR #108; idempotency suite passes in CI run 42425131584 | [Verification record](verification/2026-11-107-idempotent-trades.md) |
| 2026-11-08 | FND-004 | Partly fixed in #111 / PR #112; p95 is observed and recorded, but sustained load and a hard gate remain open | [Verification record](verification/2026-11-111-delivery-operations-baseline.md) |
| 2026-11-08 | FND-006 | Partly fixed in #111 / PR #112; local/CI delivery, observability and recovery procedure exist; hosted deployment and production recovery remain open | [Verification record](verification/2026-11-111-delivery-operations-baseline.md) |
| 2026-11-08 | FND-006 | Recovery evidence improved in #117 / PR #118: public-schema backup restored into a scratch database, with table/policy/row and marker assertions passing in CI run 42467767299 | [Recovery drill](verification/2026-11-117-recovery-drill.md) |
| 2026-11-08 | FND-002 | Partly fixed in #125 / PR #126: 10 observed-red mutations pass for M-INV1/3/5/8 and the M-INV7 details; M-INV2 is verified by forced-failure rollback but is not an observed-red mutation | [Verification record](verification/2026-11-125-market-fault-injections.md); CI run 42474762811 |
| 2026-11-10 | FND-009 | Recorded as Open from the v3.0.0 audit (AUD-001) | [Audit report](audits/2026-11-10-171-v3-audit.md) |
| 2026-11-10 | FND-010 | Recorded as Open from the v3.0.0 audit (AUD-002) | [Audit report](audits/2026-11-10-171-v3-audit.md) |
| 2026-11-10 | FND-011 | Recorded as Open from the v3.0.0 audit (AUD-003) | [Audit report](audits/2026-11-10-171-v3-audit.md) |
| 2026-11-10 | FND-012 | Recorded as Open from the v3.0.0 audit (AUD-004) | [Audit report](audits/2026-11-10-171-v3-audit.md) |
| 2026-11-10 | FND-013 | Recorded as Open from the v3.0.0 audit (AUD-005) | [Audit report](audits/2026-11-10-171-v3-audit.md) |
| 2026-11-10 | FND-014 | Recorded as Open from the v3.0.0 audit (AUD-006) | [Audit report](audits/2026-11-10-171-v3-audit.md) |
| 2026-11-10 | FND-015 | Recorded as Open from the v3.0.0 audit (AUD-007) | [Audit report](audits/2026-11-10-171-v3-audit.md) |
| 2026-11-10 | FND-016 | Recorded as Open from the v3.0.0 audit (AUD-008) | [Audit report](audits/2026-11-10-171-v3-audit.md) |
| 2026-11-10 | FND-017 | Recorded as Open from the v3.0.0 audit (AUD-009) | [Audit report](audits/2026-11-10-171-v3-audit.md) |
| 2026-11-10 | FND-018 | Recorded as Open from the v3.0.0 audit (AUD-010) | [Audit report](audits/2026-11-10-171-v3-audit.md) |
| 2026-11-10 | FND-019 | Recorded as Open from the v3.0.0 audit (AUD-011) | [Audit report](audits/2026-11-10-171-v3-audit.md) |
| 2026-11-10 | FND-020 | Recorded as Open from the v3.0.0 audit (AUD-012) | [Audit report](audits/2026-11-10-171-v3-audit.md) |
| 2026-11-10 | FND-021 | Recorded as Open from the v3.0.0 audit (AUD-013) | [Audit report](audits/2026-11-10-171-v3-audit.md) |
| 2026-11-10 | FND-022 | Recorded as Open from the v3.0.0 audit (AUD-014) | [Audit report](audits/2026-11-10-171-v3-audit.md) |
| 2026-11-10 | FND-023 | Recorded as Open from the v3.0.0 audit (AUD-015) | [Audit report](audits/2026-11-10-171-v3-audit.md) |
| 2026-11-10 | FND-024 | Recorded as Open from the v3.0.0 audit (AUD-016) | [Audit report](audits/2026-11-10-171-v3-audit.md) |
| 2026-11-10 | FND-025 | Recorded as Open from the v3.0.0 audit (AUD-017) | [Audit report](audits/2026-11-10-171-v3-audit.md) |
| 2026-11-10 | FND-026 | Recorded as Open from the v3.0.0 audit (AUD-018) | [Audit report](audits/2026-11-10-171-v3-audit.md) |
| 2026-11-10 | FND-027 | Recorded as Open from the v3.0.0 audit (AUD-019) | [Audit report](audits/2026-11-10-171-v3-audit.md) |
| 2026-11-10 | FND-028 | Recorded as Open from the v3.0.0 audit (AUD-020) | [Audit report](audits/2026-11-10-171-v3-audit.md) |
| 2026-11-10 | FND-012 | Fixed in #178: cumulative buyer-limit trigger and sequential/concurrent tests pass; full suite and independent verification pending | [Ticketing integrity verification](verification/2026-11-178-ticketing-integrity.md) |
| 2026-11-10 | FND-017 | Fixed in #178: legacy claim/registration scoped to club-less events; v3 refusal tests pass; independent verification pending | [Ticketing integrity verification](verification/2026-11-178-ticketing-integrity.md) |
| 2026-11-10 | FND-018 | Fixed in #178: capacity/configuration triggers enforce venue limits; v3 registration disabled; independent verification pending | [Ticketing integrity verification](verification/2026-11-178-ticketing-integrity.md) |
| 2026-11-10 | FND-013 | Fixed in #180: request-key replay/refusal, concurrent duplicate tests and CLI/Web key updates pass; full suite and independent verification pending | [Reward idempotency verification](verification/2026-11-180-reward-idempotency.md) |
| 2026-11-10 | FND-015 | Fixed in #179: transfer/audit/invite retention and boundary tests pass; full suite and independent verification pending | [Privacy retention verification](verification/2026-11-179-privacy-retention.md) |
| 2026-11-10 | FND-016 | Fixed in #179: outcome/time-bucket cohort counting and skewed-5 test pass; independent verification pending | [Privacy retention verification](verification/2026-11-179-privacy-retention.md) |
| 2026-11-10 | FND-019 | Fixed in #177: active entitlement required and canceled-club test passes; full suite and independent verification pending | [Subscription limits verification](verification/2026-11-177-subscription-limits.md) |
| 2026-11-10 | FND-028 | Fixed in #177: subscription lock serialises limit checks; concurrent STARTER test passes; full suite and independent verification pending | [Subscription limits verification](verification/2026-11-177-subscription-limits.md) |
| 2026-11-10 | FND-009 | Fixed in #174: anonymous sign-ins disabled; refusal test and authorization suite pass; independent verification pending | [Security boundary verification](verification/2026-11-174-security-boundary.md) |
| 2026-11-10 | FND-010 | Fixed in #174: legacy organizer ticket/registration policies removed; removed-member RLS test passes; independent verification pending | [Security boundary verification](verification/2026-11-174-security-boundary.md) |
| 2026-11-10 | FND-022 | Fixed in #174: direct platform-admin invitation/fan-card policies removed; independent verification pending | [Security boundary verification](verification/2026-11-174-security-boundary.md) |
| 2026-11-10 | FND-011 | Fixed in #175: result-bound trigger guards, UI/CLI updates and targeted tests pass; full suite and independent verification pending | [Market lifecycle verification](verification/2026-11-175-market-lifecycle.md) |
| 2026-11-10 | FND-014 | Fixed in #175: prediction-enabled trigger gates BUY only; disable-then-exit test passes; independent verification pending | [Market lifecycle verification](verification/2026-11-175-market-lifecycle.md) |
| 2026-11-10 | FND-020 | Partly fixed in #182: registry evidence corrected and failure-mode tests added; fault-injection mutations and independent verification remain in #181 | [Dispositions](remediation/2026-11-10-audit-dispositions.md) |
| 2026-11-10 | FND-021 | Fixed in #182: shared CSV sanitizer and unit tests pass; independent verification pending | [Minor hardening verification](verification/2026-11-182-minor-hardening.md) |
| 2026-11-10 | FND-023 | Deferred by human decision; legacy CLUB retirement tracked in #188 | [Dispositions](remediation/2026-11-10-audit-dispositions.md) |
| 2026-11-10 | FND-024 | Fixed in #182: seed organizer assignment and resolution smoke passed; independent verification pending | [Minor hardening verification](verification/2026-11-182-minor-hardening.md) |
| 2026-11-10 | FND-025 | Fixed in #182: payload-aware ticket replay and key rotation; mismatch test passes; independent verification pending | [Minor hardening verification](verification/2026-11-182-minor-hardening.md) |
| 2026-11-10 | FND-026 | Accepted Risk by human decision: simulated unbounded ticket-point economy | [Dispositions](remediation/2026-11-10-audit-dispositions.md) |
| 2026-11-10 | FND-027 | Accepted Risk by human decision: subscription period end remains manually managed | [Dispositions](remediation/2026-11-10-audit-dispositions.md) |
| 2026-11-10 | FND-020 | Fixed in #181: 27-entry fault-injection matrix observed red, including the v3.1.0 guards; registry claims corrected; independent verification pending | [Fault-injection verification](verification/2026-11-181-fault-injection.md) |
| 2026-11-10 | FND-004 | Fixed in #199: p95 < 1,000 ms asserted for registration and ticket bursts; 58 DB / 2 CLI pass | [p95 gate verification](verification/2026-11-199-p95-gate.md) |
| 2026-11-10 | FND-009 | Verified by the human decision owner; campaign #173 closed | [Final campaign verification](verification/2026-11-173-audit-remediation.md) |
| 2026-11-10 | FND-010 | Verified by the human decision owner; campaign #173 closed | [Final campaign verification](verification/2026-11-173-audit-remediation.md) |
| 2026-11-10 | FND-011 | Verified by the human decision owner; campaign #173 closed | [Final campaign verification](verification/2026-11-173-audit-remediation.md) |
| 2026-11-10 | FND-012 | Verified by the human decision owner; campaign #173 closed | [Final campaign verification](verification/2026-11-173-audit-remediation.md) |
| 2026-11-10 | FND-013 | Verified by the human decision owner; campaign #173 closed | [Final campaign verification](verification/2026-11-173-audit-remediation.md) |
| 2026-11-10 | FND-014 | Verified by the human decision owner; campaign #173 closed | [Final campaign verification](verification/2026-11-173-audit-remediation.md) |
| 2026-11-10 | FND-015 | Verified by the human decision owner; campaign #173 closed | [Final campaign verification](verification/2026-11-173-audit-remediation.md) |
| 2026-11-10 | FND-016 | Verified by the human decision owner; campaign #173 closed | [Final campaign verification](verification/2026-11-173-audit-remediation.md) |
| 2026-11-10 | FND-017 | Verified by the human decision owner; campaign #173 closed | [Final campaign verification](verification/2026-11-173-audit-remediation.md) |
| 2026-11-10 | FND-018 | Verified by the human decision owner; campaign #173 closed | [Final campaign verification](verification/2026-11-173-audit-remediation.md) |
| 2026-11-10 | FND-019 | Verified by the human decision owner; campaign #173 closed | [Final campaign verification](verification/2026-11-173-audit-remediation.md) |
| 2026-11-10 | FND-020 | Verified by the human decision owner; campaign #173 closed | [Final campaign verification](verification/2026-11-173-audit-remediation.md) |
| 2026-11-10 | FND-021 | Verified by the human decision owner; campaign #173 closed | [Final campaign verification](verification/2026-11-173-audit-remediation.md) |
| 2026-11-10 | FND-022 | Verified by the human decision owner; campaign #173 closed | [Final campaign verification](verification/2026-11-173-audit-remediation.md) |
| 2026-11-10 | FND-024 | Verified by the human decision owner; campaign #173 closed | [Final campaign verification](verification/2026-11-173-audit-remediation.md) |
| 2026-11-10 | FND-025 | Verified by the human decision owner; campaign #173 closed | [Final campaign verification](verification/2026-11-173-audit-remediation.md) |
| 2026-11-10 | FND-028 | Verified by the human decision owner; campaign #173 closed | [Final campaign verification](verification/2026-11-173-audit-remediation.md) |

## Historical baseline

No historical findings are retroactively invented. Existing gaps and evidence remain in their original records:

- [`README.md`](../../README.md) — current product status and known gaps.
- [`checkpoint-A/02-invariants.md`](checkpoint-A/02-invariants.md) — invariant registry and evidence status.
- [`checkpoint-B/03-flow-evidence.md`](checkpoint-B/03-flow-evidence.md) — flow evidence and deviations.
- [`ai-transparency-log.md`](ai-transparency-log.md) — dated AI contributions and corrections.

The first new finding after this register is established must cite the record it came from and any related historical evidence.
