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

| ID | Type | Title | Severity / Impact | Status | Source record | Issue | PR | Remediation | Verification |
|---|---|---|---|---|---|---|---|---|---|
| FND-001 | Security | No authentication, RLS or grants; anon can act as any participant and call `resolve_market` | Critical | Fixed | [README Known gaps](../../README.md#known-gaps); [INV-05](checkpoint-A/02-invariants.md) | [#95](https://github.com/match-pulse/match-pulse/issues/95) | [#96](https://github.com/match-pulse/match-pulse/pull/96) | Supabase Auth, roles, RLS, grants, `SECURITY DEFINER` RPCs and organizer check | [Verification record](verification/2026-11-95-authorization-rls.md); CI run 42397891717 |
| FND-002 | Verification | M-INV1, M-INV2, M-INV3, M-INV5 and M-INV8, plus the M-INV7 ladder, cap, decay, scope, no-escalation and exit exemption, have passing tests but no observed-red fault injection | Major | Open | [Invariant registry](checkpoint-A/02-invariants.md); [README Known gaps](../../README.md#known-gaps) | — | — | Planned — add the missing injections and update status only after observed failure | — |
| FND-003 | Reliability | No idempotency keys; a retry after the entry cooldown is accepted as a new entry | Major | Open | [README Known gaps](../../README.md#known-gaps); [AI log Entry 11](ai-transparency-log.md) | — | — | Planned — client request ID plus unique constraint; retry tests | — |
| FND-004 | Performance | No load or p95 latency measurement; the elasticity target is unmeasured | Major | Open | [README Known gaps](../../README.md#known-gaps); [architecture characteristics §3.1](../architecture/03-architecture-characteristics.md) | — | — | Planned — defined workload, p95, throughput and error rate | — |
| FND-005 | Test quality | Capacity second test depends on the first; uniqueness third test depends on the previous two | Minor | Fixed | [Checkpoint C test-case process](checkpoint-C/04-test-case-process.md); `tests/invariants/` | [#95](https://github.com/match-pulse/match-pulse/issues/95) | [#96](https://github.com/match-pulse/match-pulse/pull/96) | Capacity suite merged into one self-contained scenario; uniqueness tests create their own user and tournament | CI run 42397891717; 21 tests pass |
| FND-006 | Operations | No deployment, observability or recovery evidence; operation is proposed, not observed | Major | Open | [Architecture characteristics §3.2/§6](../architecture/03-architecture-characteristics.md); [Checkpoint C residual risk](checkpoint-C/05-residual-risk.md) | — | — | Planned — Checkpoint E delivery/operations slice | — |
| FND-007 | Context | The problem claim has no real organizer observation; it is a hypothesis | Major | Open | [Checkpoint A product claims §1](checkpoint-A/03-product-claims.md); [bounded proposal §1](checkpoint-A/01-bounded-proposal.md) | — | — | Planned — interview or observe one organizer; dated addendum to the claim | — |
| FND-008 | Collaboration | No independent human review; review is structured self-review plus automated checks and agent role passes | Minor | Open | [Operating model §6](checkpoint-B/02-operating-model.md); [Checkpoint C review decisions](checkpoint-C/03-review-decision.md) | — | — | Planned — peer review of one PR, with the review decision recorded | — |

## Relations

| ID | Relation | Related ID | Evidence | Date |
|---|---|---|---|---|
| FND-001 | Related | FND-004 | An unauthenticated exposed RPC surface makes a public load test and production authorization evidence meaningless until access control exists | 2026-11-07 |
| FND-003 | Related | FND-001 | A retry can create a second entry without a request key, and the open RPC surface makes the retry reachable by anyone | 2026-11-07 |
| FND-005 | Related | FND-002 | Dependent tests reduce the credibility of the invariant evidence that the remaining injections are meant to strengthen | 2026-11-07 |

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
| 2026-11-07 | FND-001 | Fixed in #95 / PR #96; authorization suite passed in CI run 42397891717; independent human verification remains pending | [Verification record](verification/2026-11-95-authorization-rls.md) |
| 2026-11-07 | FND-005 | Fixed in #95 / PR #96; capacity suite is self-contained and uniqueness tests create their own fixtures; CI run 42397891717 passes | [Verification record](verification/2026-11-95-authorization-rls.md) |

## Historical baseline

No historical findings are retroactively invented. Existing gaps and evidence remain in their original records:

- [`README.md`](../../README.md) — current product status and known gaps.
- [`checkpoint-A/02-invariants.md`](checkpoint-A/02-invariants.md) — invariant registry and evidence status.
- [`checkpoint-B/03-flow-evidence.md`](checkpoint-B/03-flow-evidence.md) — flow evidence and deviations.
- [`ai-transparency-log.md`](ai-transparency-log.md) — dated AI contributions and corrections.

The first new finding after this register is established must cite the record it came from and any related historical evidence.
