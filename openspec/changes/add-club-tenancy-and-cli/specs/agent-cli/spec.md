# Spec Delta

## Purpose

Define a CLI client that exposes the same capabilities as the web UI, produces machine-readable output and is covered by an executable agent playbook.

## ADDED Requirements

### Requirement: Command parity
Every customer-visible and platform-admin capability SHALL have a CLI command. The capability manifest SHALL map each command to its database contract, web path, authorization test and agent scenario. Nominal ticketing commands SHALL accept attendee data as repeated flags or a JSON file.

#### Scenario: Command discovery
- **WHEN** an agent runs `matchpulse commands --json`
- **THEN** the command tree and descriptions are returned

#### Scenario: Nominal ticket purchase
- **WHEN** an agent buys two tickets with two attendee records
- **THEN** the command succeeds and returns both ticket codes

#### Scenario: Missing command is detected
- **WHEN** a verified capability has no CLI command
- **THEN** the parity test fails

### Requirement: Machine-readable output
Every CLI command SHALL support `--json`, return deterministic exit codes and use a stable error shape. Mutating commands SHALL accept a request id.

#### Scenario: Successful command
- **WHEN** a valid command completes
- **THEN** it exits with code 0 and prints JSON

#### Scenario: Refused command
- **WHEN** a command is refused by authorization or a domain rule
- **THEN** it exits with code 1 and prints a stable error object

#### Scenario: Usage error
- **WHEN** a command is called with invalid arguments
- **THEN** it exits with code 2 and prints usage guidance

#### Scenario: Duplicate request id
- **WHEN** a mutating command is retried with the same request id
- **THEN** the same result is returned and no duplicate state is created

### Requirement: Authentication profiles
The CLI SHALL authenticate with email/password and store each profile's session separately. User profiles SHALL NOT contain the service role.

#### Scenario: Login and identity
- **WHEN** a user logs in and runs `matchpulse auth whoami --json`
- **THEN** the profile, memberships and admin flag are returned

#### Scenario: Logout
- **WHEN** the user logs out
- **THEN** the stored session is invalidated

#### Scenario: Service role is rejected
- **WHEN** a user profile is configured with the service role
- **THEN** the CLI refuses to use it for business commands

### Requirement: Executable agent playbook
The repository SHALL contain executable scenarios for the match-day journey, cross-club fans, entitlement denial, authorization denial, capacity/concurrency and privacy. CI SHALL run them and upload evidence.

#### Scenario: Match-day journey passes
- **WHEN** the agent runs the match-day scenario against local Supabase
- **THEN** every step succeeds and the database assertions pass

#### Scenario: Refusal leaves state unchanged
- **WHEN** an entitlement or authorization refusal occurs
- **THEN** the committed state is unchanged

#### Scenario: Evidence is retained
- **WHEN** the scenario suite completes
- **THEN** a JSON evidence artifact is uploaded
