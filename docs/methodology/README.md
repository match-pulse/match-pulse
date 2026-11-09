# Methodology Records

This folder holds the permanent engineering record for MatchPulse. Records are append-only: never overwrite, rename, move, or delete one. Corrections and supersessions are dated addenda that link back to the original.

The process rules are in [`docs/workflows/recordkeeping-traceability-workflow.md`](../workflows/recordkeeping-traceability-workflow.md).

## Record index

| Record | Location | Naming | Template |
|---|---|---|---|
| Execution plans | [`exec-plans/`](exec-plans/) | `<issue>-<slug>.md` | [`execution-plan-template.md`](../workflows/templates/execution-plan-template.md) |
| Audit reports | [`audits/`](audits/) | `<YYYY-MM-DD>-<issue>-<slug>.md` | [`audit-report-template.md`](../workflows/templates/audit-report-template.md) |
| Refactor assessments | [`refactors/`](refactors/) | `<YYYY-MM-DD>-<issue>-<slug>.md` | [`refactor-assessment-template.md`](../workflows/templates/refactor-assessment-template.md) |
| Incident reports | [`incidents/`](incidents/) | `<YYYY-MM-DD>-<slug>.md` | [`incident-report-template.md`](../workflows/templates/incident-report-template.md) |
| Remediation records | [`remediation/`](remediation/) | `<YYYY-MM-DD>-<issue>-<slug>.md` | [`remediation-plan-template.md`](../workflows/templates/remediation-plan-template.md) |
| Verification records | [`verification/`](verification/) | `<YYYY-MM-DD>-<issue>-<slug>.md` | [`verification-record-template.md`](../workflows/templates/verification-record-template.md) |
| Project reports | [`reports/`](reports/) | `<YYYY-MM-DD>.md` | — |
| AI transparency log | [`ai-transparency-log.md`](ai-transparency-log.md) | Append-only `## Entry N` | [`ai-transparency-entry-template.md`](../workflows/templates/ai-transparency-entry-template.md) |
| Findings register | [`findings-register.md`](findings-register.md) | `FND-NNN` | — |
| Changelog | [`../../CHANGELOG.md`](../../CHANGELOG.md) | Release-based (Keep a Changelog); no per-PR rows | — |

ADRs remain in [`docs/architecture/adr/`](../architecture/adr/) and follow the existing `NNN-<slug>.md` convention.

## Existing records

- [`checkpoint-A/`](checkpoint-A/) — context, claims, invariants, and governance.
- [`checkpoint-B/`](checkpoint-B/) — operating model, system dynamics, flow evidence, and the [SDLC decision](checkpoint-B/04-sdlc-decision.md).
- [`checkpoint-C/`](checkpoint-C/) — risk control map, quality story, review decisions, test-case process, residual risk, and documentation review.
- [`checkpoint-D/`](checkpoint-D/) — pre-read for architecture ownership, dependency rules, fitness functions, change scenario, compatibility and technical debt.
- [`checkpoint-E/`](checkpoint-E/) — pre-read for delivery, observability, recovery, SLOs and p95 measurement.
- [`reports/`](reports/) — dated project reports; [`2026-11-08.md`](reports/2026-11-08.md) is the current methodology synthesis.
- [`exec-plans/153-v3-club-subscriptions.md`](exec-plans/153-v3-club-subscriptions.md) — approved v3.0.0 execution plan.
- [`../testing/agent-playbook.md`](../testing/agent-playbook.md) — CLI-driven agent scenarios and evidence.
- [`../testing/capabilities.md`](../testing/capabilities.md) — capability-to-command parity manifest.
- [`../product/competitive-landscape.md`](../product/competitive-landscape.md) — TicketOne/Vivaticket positioning and nominal ticketing context.
- [`../../openspec/`](../../openspec/README.md) — OpenSpec project and active change proposals; the active change is `add-club-tenancy-and-cli`.
- [`development-practices.md`](development-practices.md) — invariant-first testing, TDD fit, SDD mode, and the OpenSpec decision.
- [`test-strategy.md`](test-strategy.md) — MVP test layers, gates, coverage rule and limits.
- [`exec-plans/`](exec-plans/) — approved execution plans.
- [`ai-transparency-log.md`](ai-transparency-log.md) — dated AI contributions and verification.

## Adding a record

1. Create the issue first and link it. Use `Task` for process, tooling, or documentation work.
2. Review the findings register and the relevant prior records; state what was reviewed.
3. Choose the record type, copy the template, and use the required dated filename.
4. Assign a `FND-NNN` identifier to each finding and add it to the register.
5. Link the issue, sub-issues, PR, remediation, and verification evidence.
6. Add the AI transparency entry in the same PR. Add a changelog entry only when the release section is being prepared; the changelog is release-based, not a per-PR ledger.
7. Verify that relative links resolve and that no historical record was modified.

## Rules

- Records are permanent and append-only.
- A superseded record keeps its original content and gains a dated link to the replacement.
- Every finding has one register ID, a status, a lifecycle log, and links to its evidence.
- Duplicates and recurrences are linked, never deleted.
- Before new work, review the register and relevant records.
- Reopening closed work, expanding scope, or starting a new improvement campaign requires explicit human approval.
- Two reversals in the same area within 30 days, or within one campaign, stop the work until a root-cause record and a human decision exist.
