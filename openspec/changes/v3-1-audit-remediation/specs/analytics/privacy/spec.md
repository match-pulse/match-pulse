# Spec Delta

## Purpose

Defines outcome-level privacy suppression for club prediction insights and safe aggregate CSV export.

## ADDED Requirements

### Requirement: Cohort suppression is outcome-level
Club prediction insights SHALL count distinct predictors per outcome and per time bucket, and SHALL suppress any cohort below five predictors.

#### Scenario: One-person outcome is suppressed
- **WHEN** a market has five total predictors but only one chose an outcome
- **THEN** that outcome's trades, shares and price are suppressed while cohorts of five or more may be shown

#### Scenario: Exactly five predictors is allowed
- **WHEN** an outcome cohort has exactly five distinct predictors
- **THEN** its aggregate metrics may be returned

#### Scenario: Time bucket below five is suppressed
- **WHEN** a time bucket and outcome contain fewer than five distinct predictors
- **THEN** that bucket's metrics are suppressed

### Requirement: Aggregate CSV is formula-safe
Aggregate CSV exports SHALL neutralise spreadsheet formula prefixes so club-controlled text cannot execute a formula.

#### Scenario: Formula prefix is neutralised
- **WHEN** an event or team name begins with `=`, `+`, `-` or `@` and is exported
- **THEN** the cell is encoded as text and does not execute as a spreadsheet formula
