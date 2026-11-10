# Spec Delta

## Purpose

Defines how attendee and club identity data is removed after its retention window while preserving non-identifying ticket, order and audit records.

## ADDED Requirements

### Requirement: Derived identity is removable
After the retention window, the cleanup SHALL remove attendee identity from tickets, transfer history and audit metadata that contains identity, and SHALL apply a retention rule to invitation emails.

#### Scenario: Old transferred ticket is redacted
- **WHEN** an event and its retention window have passed and its ticket was transferred
- **THEN** the current ticket identity and the previous/new transfer identity are removed while ticket, order, timestamps and audit identity are preserved

#### Scenario: Old card number is removed from audit
- **WHEN** a fan-card audit event is older than the retention window
- **THEN** the card number is removed from the audit metadata and the non-identifying event remains

#### Scenario: Old invitation email is removed
- **WHEN** an invitation is accepted or expired beyond the retention window
- **THEN** its email address is deleted or redacted according to the approved retention rule

#### Scenario: Recent identity remains
- **WHEN** an event or record is inside the retention window
- **THEN** its attendee identity remains available to authorised club staff
