# ADR 011: Result-Bound Market Closure and Resolution

- **Status:** Accepted
- **Date:** 2026-11-10
- **Decision owner:** human developer

## Context

ADR-002 defined a live market that opened at kickoff and stopped only when the organizer resolved it. The v3.0.0 audit (AUD-003) found that the match score and status are public, so entries remained possible after `FINISHED` while the market was still `OPEN`, allowing the known winner to be bought at a price below one and paid one point per share. The audit also found that resolution did not require a finished match or a score-matching winner, and that disabling predictions blocked exits (AUD-006).

## Decision

- Entries are accepted from kickoff while the market is `OPEN`, the match status is not `FINISHED`, and the event is not `CANCELLED`.
- Exits remain accepted while the market is `OPEN`, including after `FINISHED` and during an entry cooldown.
- Resolution requires the match to be `FINISHED`.
- The resolution winner must equal the outcome derived from `home_score` and `away_score`: home greater, away greater, or draw.
- A match cannot be marked `FINISHED` before kickoff.
- A score cannot be changed after the market has been resolved.
- Enabling predictions on a finished or cancelled event is refused.
- The prediction-enabled flag gates `BUY` trades only; `SELL` exits are always allowed while the market is open.

## Alternatives considered

| Option | Why it was not chosen |
| :--- | :--- |
| Keep entries until manual resolution | The result is public after full time; the market becomes an arbitrage and points-creation path. |
| Let any authorized staff choose the winner | The recorded score is already the result of record; an arbitrary winner can mint payouts and makes the market untrustworthy. |
| Freeze all trading, including exits, at full time | Traps holders who want to realise a position before settlement; exits do not create the same information exploit as new entries. |
| Rely on the UI to hide the entry form | The database must enforce the boundary; direct RPC calls remain reachable. |

## Consequences

- The market remains live for entries during the match and for exits after it, but it is no longer tradable on a known result.
- Organizers must update the match score and status before resolving. A wrong score must be corrected before resolution; post-resolution score changes are refused.
- Legacy markets linked to matches must be finished before resolution; this may require fixture updates.
- Existing M-INV1/M-INV6 wording is superseded by this ADR and the v3.1.0 remediation records.
- The guards are database triggers so all mutation paths, including service-role maintenance, are covered.

## Related

- [ADR-002](./002-live-prediction-market.md) — original live-market decision
- [v3.0.0 audit](../../methodology/audits/2026-11-10-171-v3-audit.md) AUD-003/AUD-006
- [Execution plan](../../methodology/exec-plans/173-audit-remediation.md)
- [Prediction-market spec](../../../openspec/changes/v3-1-audit-remediation/specs/prediction-market/spec.md)
- [Invariant registry](../../methodology/checkpoint-A/02-invariants.md)
