# Spec Delta

## Purpose

Define points-only predictions across clubs, club-scoped aggregate insights and the threshold-5 privacy rule.

## ADDED Requirements

### Requirement: Points-only predictions
A fan SHALL enter and exit prediction positions using points only. No real money, cash prize or payment instrument SHALL be accepted. A fan SHALL predict on events from any club.

#### Scenario: Fan enters a position
- **WHEN** a fan enters a position with a valid budget
- **THEN** points are debited and a position is recorded

#### Scenario: Fan exits a position
- **WHEN** a fan exits part of a position while the market is open
- **THEN** the position is reduced and points are credited

#### Scenario: Cross-club prediction
- **WHEN** the same fan predicts on a Club A event and a Club B event
- **THEN** both positions belong to the same profile

### Requirement: Club-scoped aggregate insights
A club SHALL read aggregate prediction choices and engagement for its own events only. The response SHALL NOT contain a fan id, email, username or individual position.

#### Scenario: Club reads its own insights
- **WHEN** a Club A member reads prediction insights for a Club A event
- **THEN** aggregate outcome counts and percentages are returned

#### Scenario: Other club is refused
- **WHEN** a Club A member reads insights for a Club B event
- **THEN** the operation is refused

#### Scenario: No personal identity
- **WHEN** the insights payload is inspected
- **THEN** it contains no fan identity or individual position

### Requirement: Privacy threshold
The system SHALL suppress a prediction cohort with fewer than 5 participants. The suppression SHALL apply to counts, percentages and exports.

#### Scenario: Four predictors are suppressed
- **WHEN** an event has four predictors
- **THEN** the insight is suppressed

#### Scenario: Five predictors are aggregated
- **WHEN** an event has five predictors
- **THEN** aggregate counts and percentages are returned

#### Scenario: Export is aggregate only
- **WHEN** an `ELITE` club exports prediction insights
- **THEN** the export contains aggregates and no personal data

### Requirement: Prediction data is separate from attendee identity
Prediction insights SHALL NOT join or expose ticket attendee identity. A club SHALL receive aggregate prediction data and operational attendee data as separate capabilities.

#### Scenario: Insights contain no attendee data
- **WHEN** a club reads prediction insights
- **THEN** the response contains no attendee name, document, tax code, email or ticket code

#### Scenario: Attendee list contains no prediction data
- **WHEN** club staff read the attendee list
- **THEN** the response contains no individual prediction position

#### Scenario: Cross-club separation
- **WHEN** a club reads either insights or attendees
- **THEN** only its own events are included

### Requirement: Prediction entitlement
Prediction markets and prediction insights SHALL require the club's active plan to include the relevant entitlement.

#### Scenario: STARTER is refused
- **WHEN** a `STARTER` club enables predictions or reads insights
- **THEN** the operation is refused

#### Scenario: PRO is allowed
- **WHEN** a `PRO` club enables predictions and reads insights
- **THEN** both operations succeed
