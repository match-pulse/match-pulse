# Checkpoint C — Current State After v1.1.0

- **Date:** 2026-11-07
- **Status:** Current presentation state for Checkpoint C. It supplements, and does not rewrite, the original Checkpoint C package.
- **Read this first:** the original [`README.md`](./README.md) records the package as written before authentication/RLS. This record updates the risk ranking, the evidence and the presentation script.
- **Related:** [Risk control map](./01-risk-control-map.md), [Quality story](./02-quality-story.md), [Review decisions](./03-review-decision.md), [Test-case process](./04-test-case-process.md), [Residual risk](./05-residual-risk.md), [Documentation review](./06-documentation-review.md), [Authorization verification](../verification/2026-11-95-authorization-rls.md), [Release v1.1.0](https://github.com/match-pulse/match-pulse/releases/tag/v1.1.0)

## 1. Readiness verdict

**Ready to present Checkpoint C, with stated limits.** The package now has five risks, a non-test control, one executable quality story, review decisions, an AI-use decision, a test-case process, a documentation review and a current residual-risk ranking.

It is **not 100% ready for a top-grade claim** because:

- there is still no independent human review (FND-008);
- the M-INV4 fault injection was performed before the auth/RLS version and was not re-run in this environment;
- the problem/outcome claims still lack real-user evidence (FND-007);
- the portfolio index is still a final-deliverable item, not a C item.

Those limits are recorded, not hidden. They should be stated in the discussion.

## 2. What changed since the original C package

- Authentication/authorization landed in #95 / PR #96: Supabase Auth, roles, RLS, least-privilege grants, `auth.uid()`-based RPCs and organizer-only resolution.
- The authorization suite passed in CI: 21 tests, 0 failures, 6 files (run [42410413126](https://github.com/match-pulse/match-pulse/actions/runs/42410413126)).
- FND-001 (no auth/RLS) is fixed; FND-005 (test independence) is fixed.
- `v1.1.0` was released with an annotated tag, GitHub Release and tag protection.
- The original C README's main answer still says R-01 has no control. That is a historical statement; this record is the current one.

## 3. Current risk ranking

R-01 is mitigated. The current ranking is about the risks that remain.

| Rank | Risk | Finding | Status | Evidence / control | Next action |
| ---: | :--- | :--- | :--- | :--- | :--- |
| **1** | **Retry/idempotency:** a retry after the entry cooldown expires is accepted as a new entry. The cooldown is not a request key. | FND-003 | **Open** | No request ID or unique retry key; cooldown only limits churn. | Add a client request ID and a unique constraint on `(user_id, request_id)`; test sequential and concurrent retry. |
| **2** | **Unverified market invariants:** M-INV1, M-INV2, M-INV3, M-INV5, M-INV8 and the M-INV7 details have passing tests but no observed-red injection. | FND-002 | **Open** | Tests pass; no fault injection for those mechanisms. | Add the missing injections; update the registry only after observed failure. |
| **3** | **Delivery/operations:** no deployment, observability, SLO, rollback, backup/restore or incident evidence. | FND-006 | **Open** | CI and local Docker only. | Build the Checkpoint E slice. |
| **4** | **Load/p95:** no defined workload or latency measurement. | FND-004 | **Open** | Elasticity target is specified, not measured. | Define a workload; record p95, throughput, error rate, environment and duration. |
| **5** | **Real-user evidence:** the organizer problem is still a hypothesis. | FND-007 | **Open** | No interview or observed incident. | Interview or observe one organizer; add a dated claim addendum. |
| **6** | **Independent review:** review is self-review plus agent role passes. | FND-008 | **Open** | No second human reviewer. | Peer-review one small PR; record the decision. |

**Mitigated risks:**

- **R-01 unauthorized access/resolution:** controlled by Supabase Auth, RLS, grants, `auth.uid()` and the organizer check. Evidence: authorization suite in CI; see [`../verification/2026-11-95-authorization-rls.md`](../verification/2026-11-95-authorization-rls.md).
- **R-02 overbooking:** controlled and fault-injected; local single-instance evidence.
- **R-03 double-spend:** controlled and fault-injected; idempotency remains as the residual above.
- **R-04 duplicate resolution:** controlled and fault-injected; authorization now also protects the caller.
- **R-05 accounting/rounding:** controlled by tests; still not fault-injected (part of FND-002).

## 4. Current quality story

Use **R-01** as the top-risk story and **M-INV4** as the invariant story.

### 4.1 R-01 — authorization control

- **Risk:** anyone with the anon key could act as any participant and call `resolve_market`.
- **Control:** Supabase Auth identity, `profiles.role`, RLS, least-privilege grants, `auth.uid()` in every mutation RPC, organizer check in `resolve_market`, direct table writes revoked.
- **Evidence:** six authorization tests in CI: anonymous private reads/mutations denied; fan own-row isolation; organizer-only resolution; direct writes denied; identity-free public trade feed; anonymous fan can trade on their own profile.
- **Limit:** local Supabase/PostgreSQL; no production session hardening, rate-limit tuning or penetration test. The organizer management UI is not implemented.

### 4.2 M-INV4 — double-spend control

- **Claim:** given one profile with 60 points and two markets, two concurrent 50-point entries cannot both commit.
- **Expected:** one accepted, one refused for insufficient points; balance never negative; one trade and one position.
- **Observed:** the suite passes in CI. Fault injection A (pre-auth version) removed the profile lock and both balance guards, accepted both entries, drove the balance to −40, and turned the test red; the function was restored and the suite returned green.
- **Limit:** the injection predates the `SECURITY DEFINER` auth version and was not re-run in this environment. The profile-lock logic was preserved, and the suite passes after auth, but the strongest evidence is still the pre-auth injection.

**If local Docker/Supabase is available:** re-run injection A on the auth version, record the observed failure and update [`02-quality-story.md`](./02-quality-story.md) with a dated addendum. If not, state the limit explicitly, as above.

## 5. Updated three-minute script

> “This is MatchPulse. The primary user is a tournament organizer; the first increment was registration capacity, and the second was a live prediction market.
>
> The risk that mattered most was authorization: anyone with the anon key could act as any participant and resolve markets. That is now mitigated by Supabase Auth, roles, RLS, least-privilege grants and `auth.uid()` checks. The authorization suite passes in CI: anonymous private reads and mutations are denied, fans see only their own rows, only an organizer can resolve, and direct table writes are denied.
>
> The remaining top risk is idempotency: a retry after the cooldown expires is still a new entry. The cooldown is not a request key. The next control is a client request ID and a unique constraint.
>
> The invariant story is double-spend prevention: two concurrent 50-point entries against a 60-point balance cannot both commit. The test asserts committed state. The fault injection that removed the profile lock and balance guards drove the balance to minus 40 and turned the test red. That injection was on the pre-auth function; the suite passes after auth, but I have not re-run the injection on the new `SECURITY DEFINER` version.
>
> Review changed a lock-order defect and added the missing exit-during-cooldown evidence. It is not an independent human review; that is recorded as an open finding.
>
> The remaining risks are the unverified market injections, idempotency, load/p95, delivery and operations, one real organizer observation, and independent review. No residual risk is accepted without the owner's decision.”

## 6. Readiness checklist

- [x] Five risks mapped, including non-test controls.
- [x] One behaviour with executable evidence.
- [x] Expected behaviour, observed result and limits.
- [x] Review decision recorded.
- [x] AI-use decision recorded.
- [x] Residual-risk register with proposed decisions.
- [x] Test-case process, including AI role.
- [x] Documentation review.
- [x] Current risk ranking after R-01 mitigation.
- [x] Updated three-minute script.
- [ ] Independent human review (FND-008).
- [ ] M-INV4 re-injection on the auth version.
- [ ] Real organizer evidence (FND-007).
- [ ] Portfolio index for the final deliverable.

## 7. What not to claim

- Do not claim the system is production-ready.
- Do not claim the organizer UI exists.
- Do not claim idempotency or retry safety.
- Do not claim load/p95 or operational recovery evidence.
- Do not claim independent review.
- Do not claim the M-INV4 injection was re-run on the auth version.

## 8. Next step

Present Checkpoint C with this current-state record, then collect feedback. Start Checkpoint D only after C; the L13–L16 materials are not yet in the course folder, so D would otherwise be based on inference rather than the actual checkpoint requirements.

The D pre-read can start from what already exists: change scenarios, dependency rules, fitness functions, ownership/change rights, technical debt and a small compatible change with evidence.

## 9. Addendum 2026-11-08 — FND-003 fixed

The idempotency increment (#107 / PR #108) is implemented and verified in CI
run [42425131584](https://github.com/match-pulse/match-pulse/actions/runs/42425131584):
**28 tests pass, 0 failures**, including six request-key idempotency tests.

The current ranking above changes:

1. **FND-002 — unverified market injections** remains the top verification risk.
2. **FND-006 — delivery/operations** remains the largest rubric gap.
3. **FND-004, FND-007, FND-008** remain open.
4. **FND-003 is fixed**; the request-key table and RPC replay are in place.
5. No request-key retention/cleanup policy and no auth-version M-INV4 re-injection
   are still limits. The fault injection for idempotency was not observed locally.

This addendum updates the presentation state; it does not rewrite the original
risk record.

## 10. Addendum 2026-11-08 — FND-006 and FND-004 partly fixed

The delivery baseline (#111 / PR #112) is verified in CI run
[42435007354](https://github.com/match-pulse/match-pulse/actions/runs/42435007354):
the `Delivery smoke` job passed health, login UI and home HTML; the invariant
suite passed 28 tests; the 100-request burst observed p95 463.11 ms.

The ranking now reads:

1. **FND-002 — unverified market injections** remains the top verification risk.
2. **FND-006 — delivery/operations** is partly fixed: local/CI health, logs,
   smoke, runbook, SLOs and rollback/backup procedure exist; hosted deployment,
   external monitoring and production recovery remain open.
3. **FND-004 — load/p95** is partly fixed: p95 is observed and recorded, but
   sustained load and a hard gate remain open.
4. **FND-007 and FND-008** remain open; they require human action.
5. **FND-003 is fixed.**

`FND-006` is no longer the largest unaddressed gap in its original form, but it
is still the largest **operational** gap because no hosted environment exists.
