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

| ID | Type | Title | Severity / Impact | Status | Source record | Issue | PR | Remediation | Verification |
|---|---|---|---|---|---|---|---|---|---|

*No findings recorded yet. The first approved audit, refactor, incident, or verification finding adds the first row.*

## Relations

| ID | Relation | Related ID | Evidence | Date |
|---|---|---|---|---|

*Duplicates, recurrences, and supersessions are linked here when they occur.*

## Lifecycle log

| Date | ID | Event | Evidence / link |
|---|---|---|---|

*Status changes are appended here. Rows are never deleted.*

## Historical baseline

No historical findings are retroactively invented. Existing gaps and evidence remain in their original records:

- [`README.md`](../../README.md) — current product status and known gaps.
- [`checkpoint-A/02-invariants.md`](checkpoint-A/02-invariants.md) — invariant registry and evidence status.
- [`checkpoint-B/03-flow-evidence.md`](checkpoint-B/03-flow-evidence.md) — flow evidence and deviations.
- [`ai-transparency-log.md`](ai-transparency-log.md) — dated AI contributions and corrections.

The first new finding after this register is established must cite the record it came from and any related historical evidence.
