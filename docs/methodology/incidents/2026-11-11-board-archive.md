# Incident Report — Project board Done items archived and recovered

- **Incident ID:** INC-2026-11-11-01
- **Environment:** GitHub Project 1 (MatchPulse)
- **Detected:** 2026-11-11, afternoon (Europe/Rome)
- **Resolved:** 2026-11-11
- **Severity:** Process / operational — no product, user or data impact
- **Incident lead:** Human decision owner
- **Status:** Resolved

## Summary and Impact

During a requested board cleanup, an AI agent archived **222 completed items** in the **Release & Learn (Done)** column. The items were project cards for closed issues and merged pull requests; no issue, pull request or repository content was deleted. The impact was loss of visible project history and backlog context, detected by the human owner.

All 222 items were recovered through the GitHub Projects unarchive operation. The board now shows **1 Enter item (#223)** and **222 Done items**. No archived project item remains.

## Timeline

| Time | Event / observation | Evidence | Action / owner |
|---|---|---|---|
| 11:17 | Human asked to clean up the board | Project screenshot | Human |
| 11:17–11:20 | AI archived 222 Done items | `gh project item-archive` loop, 222 items | AI |
| 11:20 | Human reported the history loss | Chat message | Human |
| 11:21 | Archived items listed with GraphQL `archivedStates: [ARCHIVED]` | 222 items: 114 closed issues, 108 merged PRs | AI |
| 11:22–11:30 | All 222 items unarchived | 222 restore operations | AI |
| 11:30 | Board verified | 1 Enter, 222 Done; 0 archived remaining | AI |

## Detection and Diagnosis

- **Detection source:** human owner noticed the empty Done column.
- **Symptoms:** Done count went from 222 to 0; only #223 remained.
- **Confirmed cause:** the AI interpreted “clean up” as “archive completed items” and performed a bulk archive without confirming that Done is permanent history.
- **Contributing factors:** no explicit rule in `AGENTS.md` protected Done; “cleanup” was not defined as “archive old cards”.
- **Uncertainty:** none on recovery. The archived set contained only closed issues and merged PRs.

## Related Incidents and Recurrence

No prior incident record for this board was found. The findings register has no product finding; this is a process incident, not a product defect. The recurrence is prevented by the new `AGENTS.md` rule.

## Containment and Recovery

| Action | Authorization | Result observed | Data integrity checked |
|---|---|---|---|
| Archive 222 Done items | Human request to “clean up” (misinterpreted) | 222 archived | No issue/PR deleted |
| List archived items | Human request to recover | 222 IDs, all closed/merged | Count matched 222 |
| Unarchive each item | Human request to recover all | 222 restored | Board shows 222 Done + #223 Enter |
| Verify no archived items remain | — | GraphQL archived query returns 0 | Count verified |

## Customer, Security, and Privacy Considerations

- No customer data, repository content, issue body or pull request was deleted or changed.
- No security, privacy or access-control impact.
- No external notification was required.

## Follow-up Actions

| Action | Priority | Owner | Issue | Verification |
|---|---|---|---|---|
| Add the never-archive-Done rule to `AGENTS.md` §8 | High | AI, human-approved | #227 | Rule present |
| Record this incident | High | AI | #227 | This record |
| Append AI transparency entry | Medium | AI | #227 | Entry 77 |
| Prevent future bulk board cleanup | High | Human + AI | #227 | The rule overrides “clean up” requests |

## Human Review

The human owner explicitly requested full recovery and a permanent rule: never archive or erase Release & Learn. Recovery was authorized and observed. No residual risk is accepted for repeating the action; the new rule forbids it.

## Lessons Learned

- “Done” is project history, not clutter.
- Archiving is not cleanup.
- A bulk operation on project history needs explicit, item-level human authorization.
- The board should be inspected after any bulk operation; the count is the quickest integrity check.

## Records Produced

- Findings register update: none; this is a process incident.
- Remediation record(s): none.
- Verification record(s): this incident record and the board count.
- AI transparency entry: Entry 77.
- Changelog row: none — internal process record.

## Historical Record Check

This is a new report. No existing incident report, finding, ADR or historical record was overwritten. `AGENTS.md` is a living policy file; the rule was added, not used to rewrite history.
