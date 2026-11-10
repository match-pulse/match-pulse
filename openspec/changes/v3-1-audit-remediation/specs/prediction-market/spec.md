# Spec Delta

## Purpose

Defines when prediction positions may be entered or exited and what makes a market resolution valid.

## ADDED Requirements

### Requirement: Entry ends when the match finishes
A prediction entry SHALL be accepted only from kickoff while the market is `OPEN` and the match is not `FINISHED`; an exit SHALL remain available while the market is `OPEN`.

#### Scenario: Entry after full time is refused
- **WHEN** a fan attempts to enter a position after the match status is `FINISHED`
- **THEN** the entry is refused and no position, debit or trade is created

#### Scenario: Exit after full time is accepted
- **WHEN** a holder exits while the market is `OPEN` and the match is `FINISHED`
- **THEN** the exit is accepted and the position and balance are updated

### Requirement: Resolution requires a finished, matching result
Resolution SHALL require the match to be `FINISHED` and SHALL accept only the outcome derived from the final home and away score; resolution remains terminal and one-shot.

#### Scenario: Resolution before full time is refused
- **WHEN** a club member resolves a market before the match is `FINISHED`
- **THEN** the resolution is refused and no payout is created

#### Scenario: Resolution with a mismatched winner is refused
- **WHEN** a club member selects a winner that does not match the final score
- **THEN** the resolution is refused and no payout is created

#### Scenario: Matching resolution pays once
- **WHEN** a club member resolves a finished match with the score-matching winner
- **THEN** each winning share pays once, losing shares pay nothing, and a second resolution is refused

### Requirement: Disabling predictions preserves exits
Disabling predictions SHALL prevent new `BUY` trades but SHALL NOT prevent `SELL` exits while the market is open.

#### Scenario: Exit succeeds after predictions are disabled
- **WHEN** a holder exits after the club disables predictions
- **THEN** the exit succeeds and the position and balance are updated

#### Scenario: New entry is refused after disabling
- **WHEN** a fan attempts a new entry after predictions are disabled
- **THEN** the entry is refused and no position, debit or trade is created
