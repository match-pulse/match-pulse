# Verification Record — Privacy Retention and Cohort Suppression

- **Issue:** [#179](https://github.com/match-pulse/match-pulse/issues/179)
- **PR:** [#190](https://github.com/match-pulse/match-pulse/pull/190)
- **Date:** 2026-11-10
- **Environment:** Local Fedora 44; Node 22.23.1; Bun 1.4.2; Docker CE 29.9.3; local Supabase PostgreSQL 17.11
- **Status:** Partially verified — implementer evidence; independent verification pending
- **Verifier:** Implementation Agent (evidence only; independent verifier required)

## 1. Claim or Acceptance Criterion

FND-015: retention removes attendee identity from transfer history, fan-card audit metadata and invitation emails while preserving ticket/order/audit.
FND-016: prediction insights and time-series suppress each outcome/bucket cohort below five distinct predictors.

## 2. Method

- Extended the service-role retention function to redact `ticket_transfers`, remove `card_number` from old fan-card audit metadata, and delete accepted/expired invitations beyond the window.
- Replaced fan-card audit writes so future events store the card ID rather than the card number.
- Reworked insights and time-series to count distinct predictors per outcome/bucket.
- Ran the real database-backed v3 suite, including a transferred old ticket, an old fan-card audit event, an old invite and a 5-total skewed cohort.

## 3. Command or Evidence

```text
bun test --env-file=.env.local tests/integration/v3-club-tenancy.test.ts
8 pass / 0 fail, 111 expect() calls

bun run test
49 pass / 0 fail, 436 expect() calls

bun run test:agent
2 pass / 0 fail, 29 expect() calls

bun run test:e2e
11 passed

bun run build (local .env.local)
passed
```

Observed behaviour:

- Old ticket identity is cleared; ticket code and order remain.
- Old transfer previous/new names and tax codes are null after cleanup; the transfer row remains.
- Old fan-card audit metadata no longer contains `card_number`.
- An old invitation email row is deleted.
- Recent ticket identity remains.
- With five total traders split 1/2/2, every outcome is suppressed; after adding four HOME traders, HOME is shown with five predictors and DRAW/AWAY remain suppressed.

## 4. Result

- Targeted and full database/CLI/E2E suites pass.
- FND-015 and FND-016 are implementation-complete and eligible for independent verification after merge.
- Fault injection for the new retention/suppression guards remains for the evidence workstream.

## 5. Limitations

- The retention window remains a product/legal decision; 365 days is the existing default.
- Deleting old invitations is a retention action, not an audit record; the audit log remains.
- The time-series change is not separately E2E-tested; the insights boundary is covered by the v3 suite.
- Local Kong/Docker DNS workaround remains; E2E emitted pre-existing Next.js `Date.now()` warnings but all 11 tests passed.

## 6. Links

- Issue: [#179](https://github.com/match-pulse/match-pulse/issues/179)
- PR: [#190](https://github.com/match-pulse/match-pulse/pull/190)
- Execution plan / audit: [v3 audit](../audits/2026-11-10-171-v3-audit.md), [execution plan](../exec-plans/173-audit-remediation.md)
- Findings register: FND-015, FND-016
- AI transparency entry: Entry 57
- Changelog row: pending release section

## 7. Addenda

2026-11-10: PR [#190](https://github.com/match-pulse/match-pulse/pull/190) opened. After the subscription-limits PR #189 merged, `main` was merged into this branch; the only conflicts were record tables and the combined test tail. The privacy migration and its tests were unchanged by that merge. Independent verification is still pending.
