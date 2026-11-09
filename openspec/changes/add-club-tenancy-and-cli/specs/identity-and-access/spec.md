# Spec Delta

## Purpose

Define the email/password account model, the global fan identity, club membership roles and the separate platform-admin identity.

## ADDED Requirements

### Requirement: Email/password authentication
All users SHALL authenticate with email and password. The system SHALL NOT create anonymous fan sessions. A successful sign-up SHALL create a profile with the starting points balance.

#### Scenario: Fan signs up
- **WHEN** a visitor signs up with a valid email and password
- **THEN** the system creates a profile and the visitor can sign in

#### Scenario: Anonymous access is refused
- **WHEN** a caller attempts a protected operation without a session
- **THEN** the system refuses the operation

#### Scenario: Fan signs in and out
- **WHEN** a registered fan signs in and later signs out
- **THEN** the session is created and then invalidated

### Requirement: Global fan identity
A fan account SHALL be global. One fan SHALL be able to buy tickets and make predictions for events from any number of clubs without creating another account.

#### Scenario: Fan participates in two clubs
- **WHEN** the same fan buys a ticket for Club A and Club B
- **THEN** both tickets belong to the same profile

#### Scenario: Club cannot follow the fan across clubs
- **WHEN** Club A reads its analytics
- **THEN** the response contains no Club B event or cross-club fan history

### Requirement: Club membership roles
A user SHALL be able to belong to one or more clubs. Club capabilities SHALL be determined by the membership role: `OWNER`, `ADMIN`, `STAFF` or `ANALYST`.

#### Scenario: Owner invites a staff member
- **WHEN** a club owner invites a user as `STAFF`
- **THEN** the user can manage events and tickets for that club after accepting

#### Scenario: Analyst is read-only
- **WHEN** an `ANALYST` attempts to create an event
- **THEN** the system refuses the mutation

#### Scenario: Non-member is refused
- **WHEN** a user who is not a member of a club attempts a club operation
- **THEN** the system refuses the operation

### Requirement: Platform admin identity
Platform administration SHALL be granted by a separate platform-admin record, not by a club role. Admin actions SHALL be audited, and the platform admin SHALL NOT impersonate a user or change fan points.

#### Scenario: Admin assigns a plan
- **WHEN** a platform admin assigns a plan to a club
- **THEN** the subscription changes and an audit event is written

#### Scenario: Admin cannot change points
- **WHEN** a platform admin attempts to change a fan points balance
- **THEN** the system refuses the operation

#### Scenario: Non-admin is refused
- **WHEN** a club owner attempts a platform-admin operation
- **THEN** the system refuses the operation
