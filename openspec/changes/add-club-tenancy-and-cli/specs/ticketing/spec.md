# Spec Delta

## Purpose

Define nominal ticket types, simulated orders, named attendees, digital tickets, name changes, box-office sales and club check-in without real payments or financial KYC.

## ADDED Requirements

### Requirement: Ticket type management
A club `OWNER`, `ADMIN` or `STAFF` member SHALL manage ticket types for the club's events. A ticket type SHALL define a name, sector, simulated price, allocation, sales window, maximum per buyer, fan-card requirement, transferability and away-sector flag.

#### Scenario: Staff creates a ticket type
- **WHEN** club staff create a ticket type for a published event
- **THEN** the ticket type is available for purchase within its sales window

#### Scenario: Another club is refused
- **WHEN** a member of Club B attempts to create a ticket type for a Club A event
- **THEN** the operation is refused

#### Scenario: Away-sector cutoff
- **WHEN** a fan attempts to buy an away-sector ticket after its sales window closes
- **THEN** the purchase is refused

### Requirement: Buyer and attendee are distinct
A buyer SHALL purchase one to four tickets per event, each assigned to a named attendee. The buyer SHALL NOT be required to be the attendee.

#### Scenario: Buyer purchases for two attendees
- **WHEN** a buyer purchases two tickets and assigns a different attendee to each
- **THEN** one order contains two tickets, each with its own attendee and code

#### Scenario: Maximum four tickets
- **WHEN** a buyer attempts to purchase a fifth ticket for the same event
- **THEN** the purchase is refused and no ticket is created

#### Scenario: Attendee data is required
- **WHEN** a ticket is submitted without the required attendee fields
- **THEN** the purchase is refused

### Requirement: Attendee identity data
Each ticket SHALL store the attendee's first name, last name, date of birth, place of birth and tax code or document number. A fan-card number SHALL be stored when the ticket type requires it.

#### Scenario: Fan-card ticket without a card
- **WHEN** a fan attempts to buy a ticket type that requires a fan card without providing one
- **THEN** the purchase is refused

#### Scenario: Fan-card ticket with a valid card
- **WHEN** a fan provides a valid fan-card number for a restricted ticket type
- **THEN** the purchase succeeds

#### Scenario: Attendee data is retained
- **WHEN** the event and its retention window have passed
- **THEN** the cleanup process can remove attendee identity data while preserving the audit record

### Requirement: Simulated purchase
A fan SHALL buy tickets through a simulated checkout. The system SHALL require terms acceptance, SHALL record no payment instrument, and SHALL mark the order as simulated. A request id SHALL make the purchase idempotent.

#### Scenario: Terms are missing
- **WHEN** a fan attempts checkout without accepting the terms
- **THEN** the purchase is refused

#### Scenario: Retry with the same request id
- **WHEN** the same purchase is retried with the same request id
- **THEN** the same order is returned and no duplicate tickets are created

#### Scenario: Capacity is exhausted
- **WHEN** the requested quantity exceeds the remaining capacity or allocation
- **THEN** the purchase is refused and the sold count does not exceed the limit

### Requirement: Digital ticket and check-in
Each purchased ticket SHALL have a unique code and a digital QR page. Club `OWNER`, `ADMIN` or `STAFF` members SHALL check in a ticket for their own club. Check-in SHALL be idempotent.

#### Scenario: Staff checks in a ticket
- **WHEN** staff check in a valid ticket code for their club's event
- **THEN** the ticket is marked as checked in

#### Scenario: Second check-in
- **WHEN** the same ticket is checked in again
- **THEN** the attendance time is unchanged and no duplicate attendance is recorded

#### Scenario: Other club check-in is refused
- **WHEN** Club B staff attempt to check in a Club A ticket
- **THEN** the operation is refused

### Requirement: Name change
A buyer SHALL transfer a ticket to a new named attendee before the configured deadline when the ticket type is transferable. A non-transferable ticket or a late request SHALL be refused.

#### Scenario: Transfer before the deadline
- **WHEN** a buyer transfers a transferable ticket before the deadline
- **THEN** the attendee data changes and the transfer is recorded

#### Scenario: Transfer after the deadline
- **WHEN** a buyer attempts a transfer after the deadline
- **THEN** the transfer is refused

#### Scenario: Non-transferable ticket
- **WHEN** a buyer attempts to transfer a non-transferable ticket
- **THEN** the transfer is refused

### Requirement: Box-office channel
Club `OWNER`, `ADMIN` or `STAFF` members SHALL sell tickets through a box-office channel. The order SHALL record the channel and write an audit event.

#### Scenario: Staff sells at the box office
- **WHEN** staff sell a ticket through the box-office command
- **THEN** the order is marked `BOX_OFFICE` and audited

#### Scenario: Analyst cannot sell
- **WHEN** an `ANALYST` attempts a box-office sale
- **THEN** the operation is refused

### Requirement: Attendee-data access
Attendee identity data SHALL be visible only to `OWNER`, `ADMIN` and `STAFF` members of the event's club. An `ANALYST` SHALL see aggregate sales data only. The platform admin SHALL require an audited support path.

#### Scenario: Staff reads the attendee list
- **WHEN** club staff list attendees for their event
- **THEN** the named attendees and ticket codes are returned

#### Scenario: Analyst is refused
- **WHEN** an `ANALYST` requests the attendee list
- **THEN** the operation is refused

#### Scenario: Other club is refused
- **WHEN** a Club B member requests a Club A attendee list
- **THEN** the operation is refused

### Requirement: Cross-club fan tickets
A fan SHALL buy tickets for events from multiple clubs with one account. A club SHALL see only its own orders, attendees and tickets.

#### Scenario: Fan buys from two clubs
- **WHEN** one fan buys a Club A ticket and a Club B ticket
- **THEN** the fan's ticket list contains both

#### Scenario: Club sees only its own orders
- **WHEN** Club A lists orders
- **THEN** no Club B order is returned
