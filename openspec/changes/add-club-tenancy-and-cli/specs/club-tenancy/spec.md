# Spec Delta

## Purpose

Define clubs as tenants, their members and invitations, club-owned events and the isolation between clubs.

## ADDED Requirements

### Requirement: Club creation and ownership
An authenticated user SHALL be able to create a club and become its `OWNER`. A club SHALL have a unique slug and a display name.

#### Scenario: User creates a club
- **WHEN** an authenticated user creates a club with a valid name and slug
- **THEN** the club exists and the creator is its `OWNER`

#### Scenario: Duplicate slug is refused
- **WHEN** a user creates a club with a slug already in use
- **THEN** the system refuses the creation

### Requirement: Membership and invitations
A club `OWNER` or `ADMIN` SHALL be able to invite a user by email with a role. The invitation SHALL expire and SHALL be single-use. The invitee SHALL accept it while authenticated with the invited email.

#### Scenario: Invitation is accepted
- **WHEN** an invited user accepts an unexpired invitation
- **THEN** a club membership with the invited role is created

#### Scenario: Expired invitation is refused
- **WHEN** a user accepts an expired invitation
- **THEN** the system refuses the acceptance

#### Scenario: Owner removes a member
- **WHEN** the owner removes a member
- **THEN** the member loses access to the club

### Requirement: Club-owned events
Events SHALL belong to a club. Club `OWNER`, `ADMIN` and `STAFF` members SHALL manage events; `ANALYST` members SHALL read them. Published events SHALL be publicly readable.

#### Scenario: Staff creates an event
- **WHEN** a `STAFF` member creates an event for the club
- **THEN** the event belongs to that club

#### Scenario: Another club is refused
- **WHEN** a member of Club B attempts to update a Club A event
- **THEN** the system refuses the mutation

#### Scenario: Published event is public
- **WHEN** a club publishes an event
- **THEN** an unauthenticated visitor can read its public details

### Requirement: Club isolation
The database SHALL isolate club data. A club member SHALL NOT read or mutate another club's members, events, orders, tickets or analytics.

#### Scenario: Cross-club read is refused
- **WHEN** a Club A member reads a Club B event or order
- **THEN** the database returns no row

#### Scenario: Platform admin can list clubs
- **WHEN** a platform admin lists clubs
- **THEN** all clubs are visible and the action is audited
