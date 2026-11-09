# Spec Delta

## Purpose

Define the subscription plan catalog, the club subscription status and the database-enforced feature and limit entitlements.

## ADDED Requirements

### Requirement: Plan catalog
The system SHALL provide `STARTER`, `PRO` and `ELITE` plans. Each plan SHALL define active-event and member limits and the prediction, insight, reward and export features.

#### Scenario: Plans are readable
- **WHEN** a club member reads the plan catalog
- **THEN** the three plans and their entitlements are returned

#### Scenario: Club has one active subscription
- **WHEN** a club is created and a plan is selected
- **THEN** the club has one subscription with a status

### Requirement: Entitlement enforcement
Every gated operation SHALL check the club's `ACTIVE` subscription and the required entitlement inside the database RPC. A refused operation SHALL NOT change committed state.

#### Scenario: STARTER cannot enable predictions
- **WHEN** a `STARTER` club enables predictions
- **THEN** the operation is refused and no market is opened

#### Scenario: PRO can enable predictions
- **WHEN** a `PRO` club enables predictions
- **THEN** the operation succeeds

#### Scenario: ELITE can export
- **WHEN** an `ELITE` club requests an analytics export
- **THEN** the export is produced and an audit event is written

#### Scenario: Past-due subscription is refused
- **WHEN** a club with `PAST_DUE` status attempts a gated operation
- **THEN** the operation is refused

### Requirement: Plan changes
A club `OWNER` SHALL be able to request a plan change. A platform admin SHALL be able to assign a plan and set the subscription status. A downgrade SHALL preserve existing data but SHALL block new creation beyond the new limit.

#### Scenario: Owner requests an upgrade
- **WHEN** the owner requests `ELITE`
- **THEN** a pending plan request is recorded

#### Scenario: Admin approves the plan
- **WHEN** the platform admin assigns the requested plan
- **THEN** the subscription reflects the new plan and an audit event is written

#### Scenario: Downgrade over the event limit
- **WHEN** a club downgrades below its current active-event count and creates another event
- **THEN** the new event is refused while existing events remain readable

### Requirement: Plan limits
The system SHALL enforce the active-event and member limits for the club's plan.

#### Scenario: STARTER event limit
- **WHEN** a `STARTER` club with three active events creates a fourth
- **THEN** the creation is refused

#### Scenario: Member limit
- **WHEN** a club at its member limit invites another member
- **THEN** the invitation is refused
