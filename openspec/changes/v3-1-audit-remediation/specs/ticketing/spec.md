# Spec Delta

## Purpose

Defines cumulative buyer limits, venue-capacity limits, legacy claim compatibility and retry safety for nominal tickets.

## ADDED Requirements

### Requirement: Buyer cap is cumulative per event
A buyer SHALL NOT hold more than the configured maximum number of tickets for one event across orders and channels.

#### Scenario: Fifth ticket is refused across orders
- **WHEN** a buyer already holds four tickets for an event and submits another order
- **THEN** the purchase is refused and no ticket, order or points change is created

#### Scenario: Concurrent orders cannot exceed the cap
- **WHEN** a buyer submits concurrent orders that together exceed the cap
- **THEN** only orders within the remaining allowance are accepted and committed rows never exceed the cap

### Requirement: Ticket sales respect venue capacity and allocation
Ticket sales SHALL never exceed the event `max_capacity` or the ticket-type and event allocation; an event SHALL NOT be configured with a ticket allocation above its venue capacity.

#### Scenario: Oversized allocation is refused
- **WHEN** club staff create or update an event with `ticket_allocation` greater than `max_capacity`
- **THEN** the operation is refused

#### Scenario: Purchase beyond capacity is refused
- **WHEN** a purchase would make committed tickets exceed the event capacity
- **THEN** the purchase is refused and the sold count does not exceed the limit

### Requirement: Legacy claim and registration are legacy-only
`claim_ticket` and `register_for_tournament` SHALL accept only tournaments with no club; v3 club events SHALL use nominal ticketing.

#### Scenario: V3 event claim is refused
- **WHEN** a fan attempts a legacy claim on a club-owned v3 event
- **THEN** the claim is refused and no ticket or points are created

#### Scenario: Legacy event claim still works
- **WHEN** a fan claims a ticket on a legacy tournament with no club
- **THEN** the legacy claim succeeds under its existing rules

### Requirement: Ticket retries are payload-aware
A ticket request key SHALL replay only when the ticket type, quantity, channel, buyer and attendee payload match the recorded order; a changed payload SHALL be refused.

#### Scenario: Identical retry replays
- **WHEN** a purchase is retried with the same request key and identical payload
- **THEN** the recorded order and tickets are returned without a second debit or order

#### Scenario: Changed payload is refused
- **WHEN** a purchase is retried with the same request key but different attendee data
- **THEN** the request is refused and no second order or ticket is created
