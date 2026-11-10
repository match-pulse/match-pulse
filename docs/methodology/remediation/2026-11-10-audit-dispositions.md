# Remediation Dispositions — v3.0.0 Audit Residuals

- **Finding IDs:** FND-020, FND-023, FND-026, FND-027
- **Issue:** [#173](https://github.com/match-pulse/match-pulse/issues/173)
- **Status:** Approved
- **Owner:** Human developer
- **Date:** 2026-11-10
- **Approved scope:** The human approved the remediation plan on 2026-11-10, including these residual dispositions.

## 1. Findings and Evidence

| Finding | Severity / impact | Source record | Evidence |
|---|---|---|---|
| FND-020 | Major — verification evidence overstated | [Audit AUD-012](../audits/2026-11-10-171-v3-audit.md) | New failure-mode tests added across the remediation PRs; fault-injection mutations for the new guards remain pending in #181 |
| FND-023 | Minor — legacy CLUB role sees cross-club aggregates | [Audit AUD-015](../audits/2026-11-10-171-v3-audit.md) | `/club`, `/api/club/export`, `CLUB` role and legacy analytics RPCs remain |
| FND-026 | Informational — unbounded club ticket points | [Audit AUD-018](../audits/2026-11-10-171-v3-audit.md) | `create_club_event` accepts any non-negative `ticket_points`; no platform cap |
| FND-027 | Informational — subscription period end not enforced | [Audit AUD-019](../audits/2026-11-10-171-v3-audit.md) | `current_period_end` stored; `has_entitlement` checks status only |

## 2. Dispositions

- **FND-020 — Partly fixed.** The registry and tests now distinguish enforced from independently verified, and the audit's missing failure-mode tests were added. Fault-injection mutations for the new triggers/locks remain in issue #181; the finding is not Verified until that evidence exists.
- **FND-023 — Deferred.** Retiring the legacy `CLUB` analytics page, role and RPCs is a separate compatibility cleanup. It is tracked in issue #188; until then the legacy surface remains a local-fixture risk, not a live customer path.
- **FND-026 — Accepted Risk (simulated economy).** Points and rewards are simulated; clubs control ticket-point issuance. A platform cap is not introduced in this increment. If rewards become a real commercial promise, a cap/approval rule must be designed and approved.
- **FND-027 — Accepted Risk (manual subscription management).** There is no billing provider or renewal scheduler. `current_period_end` is informational; platform-admin plan/status changes are the operational control. Enforcement would require a renewal/expiry process and is deferred.

## 3. Human Decision

The human approved the recommendations in the remediation plan on 2026-11-10:

- defer legacy CLUB retirement to a dedicated cleanup;
- accept simulated unbounded point issuance;
- document manual subscription management rather than add billing/expiry.

Any future change to these dispositions requires a new dated decision or a new issue linked here.

## 4. Records and Links

- Issue: [#173](https://github.com/match-pulse/match-pulse/issues/173)
- Audit: [v3.0.0 audit](../audits/2026-11-10-171-v3-audit.md)
- Execution plan: [173-audit-remediation](../exec-plans/173-audit-remediation.md)
- Findings register: FND-020, FND-023, FND-026, FND-027
- AI transparency entry: included in the relevant remediation entries
- Changelog row: release-based; record at release

## 5. Addenda

2026-11-10: FND-020 moved from **Partly fixed** to **Fixed** after the fault-injection workstream (#181). The matrix now has 27 entries, all matching their declared expectation, including the v3.1.0 market, ticketing, entitlement, reward, retention, cohort and ticket-payload guards. The automatic post-matrix suite required the documented local Kong workaround and then passed 57/57. Independent verification remains pending. See [`verification/2026-11-181-fault-injection.md`](../verification/2026-11-181-fault-injection.md).
