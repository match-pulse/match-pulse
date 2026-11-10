# Design

## Context

See `proposal.md` for motivation and `docs/methodology/exec-plans/173-audit-remediation.md` for the approved execution plan. MatchPulse remains a modular monolith: one Next.js application and one PostgreSQL database. The database is the authorization and invariant boundary. The kata, domain model, invariant registry, ADRs and verification records remain authoritative; this change records the behaviour changes and their evidence.

## Goals / Non-Goals

**Goals:**
- Close the Critical security and market-integrity findings before lower-severity work.
- Keep critical rules in PostgreSQL constraints, locks and transactional RPCs, not only UI checks.
- Preserve existing v3 club, ticket, reward and insight behaviour except where the audit requires a change.
- Make every new claim testable and fault-injectable where practical.

**Non-Goals:**
- Hosted deployment, production recovery, external observability or real payments/KYC.
- New seat maps, wallet passes or external ticketing integrations.
- Reopening the withdrawn fixed-score prediction model.

## Decisions

- **Anonymous auth is disabled, not scoped.** ADR-009 already decided email/password identity. A local anonymous path has no safe role boundary and mints points. Alternative: a no-points anonymous read-only path; rejected because the product already has a public read surface and no need for anonymous identities.
- **Attendee access follows current membership.** Drop the legacy organizer ticket/registration policies. Legacy organizer pages already use SECURITY DEFINER RPCs with ownership checks. Alternative: clear `organizer_id` on removal; rejected because it mutates legacy ownership semantics and is weaker than removing the read path.
- **Platform-admin direct reads are removed.** If support access is required later, add an audited support RPC. Alternative: keep direct RLS reads; rejected because the ticketing spec requires an audited support path.
- **Market entries close at `FINISHED`; exits stay open until resolution.** Resolution requires `FINISHED` and a score-matching winner. Alternative: keep entries until manual resolution; rejected because the score is public and the market can be exploited.
- **Only BUY trades are gated by `prediction_enabled`.** Exits must remain available. Alternative: refuse disabling after the first trade; rejected as more restrictive than necessary.
- **`max_capacity` is the venue cap and `ticket_allocation <= max_capacity`.** V3 club events reject legacy registration; legacy claim/registration remain for `club_id IS NULL`. Alternative: allow both counters; rejected because it can double-count or oversell.
- **Reward redemption requires a request key.** Reuse the trade idempotency pattern with a profile lock. Alternative: optional key; rejected because the web and CLI must be safely retryable.
- **Entitlement limits require an active subscription.** `NULL` remains “unlimited” only for active plans. Lock the subscription/club row before count-and-insert. Alternative: optional limits; rejected because it treats `CANCELED` as unlimited.
- **Retention redacts derived identity.** Transfer history, old audit card numbers and invite emails are covered. Alternative: retain them as audit; rejected without a privacy decision because the current claim says identity is removable.
- **Cohorts are outcome-level.** Count distinct predictors per outcome/bucket. Alternative: market-level threshold; rejected because it reveals a one-person outcome.
- **CSV values are formula-safe.** Prefix dangerous leading characters. Alternative: rely on spreadsheet warnings; rejected because exports are a controlled output.

## Risks / Trade-offs

- **Breaking reward RPC and resolution behaviour** → update all clients, tests, CLI and playbook in the same PR; version the release.
- **Capacity backfill may alter local rows** → run only on disposable local data; record the migration and require confirmation.
- **Lock-order deadlocks in invite/accept/event paths** → use one documented subscription/club lock order and add concurrency tests.
- **Retention redaction can reduce audit detail** → retain ticket/order IDs and non-identifying audit metadata; record the privacy decision.
- **Fault injection may be infeasible for some guards** → record the limitation rather than claiming observed-red evidence.
- **Memory pressure** → run Supabase and browser tests sequentially; use service exclusions or temporary swap if needed.

## Migration Plan

1. Land security-boundary migration and auth config first; verify anonymous refusal and RLS tests.
2. Land market lifecycle changes and update all market tests/fixtures.
3. Land ticketing and reward migrations; update Server Actions, CLI, UI and playbook.
4. Land entitlement, retention, cohort and export changes.
5. Run the full local suite, fault injection, E2E and smoke; write verification records.
6. Update authoritative docs/ADRs, findings register, audit closure and changelog at release.

Rollback: revert the affected migration/function in a new corrective migration; never edit an applied migration. Local database reset is available for development after explicit confirmation.

## Open Questions

None that change the approved behaviour. Exact point-cap and subscription-expiry policy remain informational dispositions in FND-026/FND-027 and are documented rather than invented here.
