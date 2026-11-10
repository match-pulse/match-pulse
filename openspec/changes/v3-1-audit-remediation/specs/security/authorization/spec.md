# Spec Delta

## Purpose

Defines the authentication and authorization boundary for anonymous visitors, current and former club members, and platform administrators.

## ADDED Requirements

### Requirement: Anonymous authentication is disabled
The system SHALL require an email/password identity for every authenticated session and SHALL NOT accept anonymous Supabase sign-ins.

#### Scenario: Anonymous sign-in is refused
- **WHEN** a client attempts an anonymous Supabase sign-in
- **THEN** the auth provider refuses the request and no profile, points or authenticated session is created

#### Scenario: Anonymous session cannot mutate
- **WHEN** a client without an email/password session calls a mutation RPC
- **THEN** the database refuses the call and no club, ticket, trade, claim or registration is created

### Requirement: Current club membership controls attendee data
Only a current `OWNER`, `ADMIN` or `STAFF` member of the event's club SHALL read attendee identity or registrations directly; a former member or event creator SHALL NOT retain that access.

#### Scenario: Removed staff cannot read attendee identity
- **WHEN** a staff member who created an event is removed from the club and selects `tickets` or `registrations` directly
- **THEN** no attendee identity or registration row is returned

#### Scenario: Current staff can read attendee identity
- **WHEN** a current `OWNER`, `ADMIN` or `STAFF` member selects the club's attendee records
- **THEN** the permitted rows are returned

### Requirement: Platform admin access is scoped and audited
The platform admin SHALL NOT read invitation emails or fan-card numbers through direct table policies without an audited support path.

#### Scenario: Direct platform-admin read is denied
- **WHEN** a platform admin selects `club_invites` or `club_fan_cards` directly
- **THEN** no rows are returned

#### Scenario: Scoped admin operation still works
- **WHEN** a platform admin calls an approved club/plan/audit RPC
- **THEN** the operation succeeds and writes its audit event
