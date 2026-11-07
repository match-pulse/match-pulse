# Refactor Assessment — <scope>

- **Assessment ID:** <identifier>
- **Register IDs:** <FND-NNN list>
- **Baseline:** <commit or tag>
- **Date:** <YYYY-MM-DD>
- **Assessor:** <role/agent>
- **Status:** Draft | Reviewed | Approved for planning
- **Behavior-preserving scope:** <what must remain unchanged>
- **Read-only confirmation:** No implementation changes made during assessment.

## Summary

<Structural condition, major opportunities, limitations, and baseline metrics/evidence.>

## Prior Assessments and Recurrence Check

<Search the findings register and prior refactor, audit, and incident records. List related, duplicate, or recurrent findings with their FND IDs. State what was reviewed and what was not.>

## Findings

| ID | Register ID | Impact | Area | Structural finding | Evidence | Principle | Recommended change | Verification | Status |
|---|---|---|---|---|---|---|---|---|---|
| REF-001 | FND-001 | High/Medium/Low | <...> | <...> | <...> | <...> | <...> | <...> | Open |

## Finding Details

### REF-001 — <title>

- **Impact:** High | Medium | Low
- **Location:** <files, modules, symbols>
- **Current structure:** <...>
- **Evidence:** <dependency, duplication, complexity, naming, testability, or cohesion evidence>
- **Quality characteristic:** <simplicity, atomicity, cohesion, coupling, modularity, testability, maintainability, etc.>
- **Options and trade-offs:**
  1. <Option>
  2. <Alternative where useful>
- **Recommended change:** <...>
- **Behavioral contract to preserve:** <inputs, outputs, side effects, errors, persistence, external interfaces>
- **Equivalence verification:** <tests, characterization fixtures, invariant checks>
- **Risks / constraints:** <...>
- **Related issue / plan / PR:** <...>

## Human Decisions

| Finding | Decision | Approved scope | Human approval / date |
|---|---|---|---|
| REF-001 | Pending | <...> | Pending |

## Verification and Loop Decision

| Finding | Diff review | Tests / equivalence evidence | Structural improvement evidence | Verifier | Status |
|---|---|---|---|---|---|
| REF-001 | Not run | Not run | Not measured | Pending | Open |

<Continue, stop, defer, or request a new approval. A refactor finding is not Verified by its implementer.>

## Records Produced

- Findings register update:
- Remediation record(s):
- Verification record(s):
- AI transparency entry:
- Changelog row:

## Historical Record Check

<Confirm this assessment is new and that no existing assessment, finding, or ADR was overwritten. If this assessment supersedes another, link it here.>

