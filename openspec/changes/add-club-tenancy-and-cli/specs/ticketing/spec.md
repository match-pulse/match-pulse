# Spec Delta

## Purpose

Define ticket types, simulated orders, ticket issuance, terms acceptance and club check-in without real payments or KYC.

## ADDED Requirements

### Requirement: Ticket type management
A club `OWNER`, `ADMIN` or `STAFF` member SHALL manage ticket types for the club's events. A ticket type SHALL have a name, simulated price, allocation and sales window.

#### Scenario: Staff creates a ticket type
- **WHEN** club staff create a ticket type for a published event
- **THEN** the ticket type is available for purchase

#### Scenario: Another club is refused
- **WHEN** a member of Club B attempts to create a ticket type for a Club A event
- **THEN** the operation is refused

### Requirement: Simulated purchase
A fan SHALL buy tickets through a simulated checkout. The system SHALL require terms acceptance, SHALL record no payment instrument, and SHALL mark the order as simulated. A request id SHALL make the purchase idempotent.

#### Scenario: Fan buys two tickets
- **WHEN** a fan buys two tickets and accepts the terms
- **THEN** one order and two tickets are created

#### Scenario: Terms are missing
- **WHEN** a fan attempts checkout without accepting the terms
- **THEN** the purchase is refused

#### Scenario: Retry with the same request id
- **WHEN** the same purchase is retried with the same request id
- **THEN** the same order is returned and no duplicate tickets are created

#### Scenario: Capacity is exhausted
- **WHEN** the requested quantity exceeds the remaining capacity or allocation
- **THEN** the purchase is refused and the sold count does not exceed the limit

### Requirement: Ticket issuance and check-in
Each purchased ticket SHALL have a unique code. Club `OWNER`, `ADMIN` or `STAFF` members SHALL check in a ticket for their own club. Check-in SHALL be idempotent.

#### Scenario: Staff checks in a ticket
- **WHEN** staff check in a valid ticket code for their club's event
- **THEN** the ticket is marked as checked in

#### Scenario: Second check-in
- **WHEN** the same ticket is checked in again
- **THEN** the attendance time is unchanged and no duplicate attendance is recorded

#### Scenario: Other club check-in is refused
- **WHEN** Club B staff attempt to check in a Club A ticket
- **THEN** the operation is refused

### Requirement: Cross-club fan tickets
A fan SHALL buy tickets for events from multiple clubs with one account. A club SHALL see only its own orders and tickets.

#### Scenario: Fan buys from two clubs
- **WHEN** one fan buys a Club A ticket and a Club B ticket
- **THEN** the fan's ticket list contains both

#### Scenario: Club sees only its own orders
- **WHEN** Club A lists orders
- **THEN** no Club B order is returned
