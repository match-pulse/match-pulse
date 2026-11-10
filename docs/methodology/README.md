# Methodology Records

This folder holds the current course submission and the permanent engineering
records. The current submission is the five checkpoints. The dated records are
kept for traceability; they are not the reading path.

## Start here

| Document | What it is |
| :--- | :--- |
| [Methodology submission](reports/2026-11-10.md) | One-page cover: the checkpoints are the deliverable |
| [Checkpoint A](checkpoints/A.md) | Context, claim and first evidence |
| [Checkpoint B](checkpoints/B.md) | Operating model and feedback |
| [Checkpoint C](checkpoints/C.md) | Quality and residual risk |
| [Checkpoint D](checkpoints/D.md) | Architecture and changeability |
| [Checkpoint E](checkpoints/E.md) | Delivery, observation and recovery |
| [AI use summary](ai-use.md) | What AI contributed, got wrong, and how it was checked |
| [Test strategy](test-strategy.md) | Test layers, gates and limits |
| [Development practices](development-practices.md) | Invariant-first testing, TDD, SDD and OpenSpec |
| [Findings register](findings-register.md) | Permanent `FND-NNN` index and lifecycle |

The old `checkpoint-A/` to `checkpoint-E/` folders are detailed historical
records. Use them when you need the full trail; start with the current checkpoint
pages above.

## Permanent records

| Record | Location |
| :--- | :--- |
| Execution plans | [`exec-plans/`](exec-plans/) |
| Audit reports | [`audits/`](audits/) |
| Refactor assessments | [`refactors/`](refactors/) |
| Incident reports | [`incidents/`](incidents/) |
| Remediation records | [`remediation/`](remediation/) |
| Verification records | [`verification/`](verification/) |
| Project reports | [`reports/`](reports/) |
| AI transparency log | [`ai-transparency-log.md`](ai-transparency-log.md) |
| Findings register | [`findings-register.md`](findings-register.md) |
| Changelog | [`../../CHANGELOG.md`](../../CHANGELOG.md) |

ADRs remain in [`../architecture/adr/`](../architecture/adr/).

## Key evidence

- [`verification/2026-11-173-audit-remediation.md`](verification/2026-11-173-audit-remediation.md) — v3.1.0 remediation and full local suite.
- [`verification/2026-11-181-fault-injection.md`](verification/2026-11-181-fault-injection.md) — 27-entry observed-red matrix.
- [`verification/2026-11-174-security-boundary.md`](verification/2026-11-174-security-boundary.md) — anonymous sign-in, legacy attendee read, admin boundary.
- [`verification/2026-11-175-market-lifecycle.md`](verification/2026-11-175-market-lifecycle.md) — result-bound resolution and exit availability.
- [`verification/2026-11-177-subscription-limits.md`](verification/2026-11-177-subscription-limits.md) — active entitlement and concurrent plan limits.
- [`verification/2026-11-178-ticketing-integrity.md`](verification/2026-11-178-ticketing-integrity.md) — capacity, buyer cap, legacy claim guard.
- [`verification/2026-11-179-privacy-retention.md`](verification/2026-11-179-privacy-retention.md) — cohort suppression and retention redaction.
- [`verification/2026-11-197-legacy-findings-verification.md`](verification/2026-11-197-legacy-findings-verification.md) — FND-001/003/005 verification.
- [`verification/2026-11-10-217-course-submission-brief.md`](verification/2026-11-10-217-course-submission-brief.md) — course submission page, link and check evidence.
- [`verification/2026-11-117-recovery-drill.md`](verification/2026-11-117-recovery-drill.md) — public-schema backup/restore.
- [`audits/2026-11-10-171-v3-audit.md`](audits/2026-11-10-171-v3-audit.md) — the v3.0.0 audit.

## Rules

- Records are permanent and append-only. Do not overwrite, rename, move or delete
  one. Corrections and supersessions are dated addenda that link back.
- A finding gets one `FND-NNN` identifier and a lifecycle log entry.
- The implementer does not verify or close its own finding.
- Before new work, review the findings register and the relevant prior records.
- Reopening closed work, expanding scope or starting a new improvement campaign
  needs explicit human approval.
- Two reversals in the same area within 30 days stop the work until a root-cause
  record and a human decision exist.
- Current course documents are living; dated reports and verification records are
  historical evidence. When they disagree, the verification record wins.
