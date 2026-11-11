# Spec Delta

## Purpose

Defines how Server Action form input is validated before it reaches a domain call, so absent or malformed values cannot be silently converted into valid domain data.

## ADDED Requirements

### Requirement: Required numeric fields reject absent values

A required numeric form field SHALL be rejected when the submitted value is missing, empty or whitespace-only. The system MUST NOT convert an absent value to zero.

#### Scenario: Missing required number

- **WHEN** a form submission omits a required numeric field
- **THEN** validation fails with an error that the field is required
- **AND** no domain call is made

#### Scenario: Empty required number

- **WHEN** a form submission sends an empty or whitespace-only value for a required numeric field
- **THEN** validation fails with an error that the field is required
- **AND** no domain call is made

### Requirement: Required numeric fields reject malformed values

A required numeric form field SHALL be rejected when the value is present but not a finite number.

#### Scenario: Non-numeric required value

- **WHEN** a form submission sends `abc` for a required numeric field
- **THEN** validation fails with an error that the field must be a number
- **AND** no domain call is made

### Requirement: Required numeric fields accept valid numbers

A required numeric form field SHALL accept any finite numeric value, including an explicit zero.

#### Scenario: Explicit zero

- **WHEN** a form submission sends `0` for a required numeric field
- **THEN** validation succeeds with the value `0`
- **AND** the domain call receives `0`

#### Scenario: Positive and negative numbers

- **WHEN** a form submission sends a finite positive or negative number for a required numeric field
- **THEN** validation succeeds with the parsed number unchanged

### Requirement: Optional numeric fields keep their existing behavior

An optional numeric form field SHALL remain optional. A missing optional field MUST NOT fail validation, and a malformed optional value MUST still be rejected.

#### Scenario: Missing optional number

- **WHEN** a form submission omits an optional numeric field
- **THEN** validation succeeds with no value for that field

#### Scenario: Malformed optional number

- **WHEN** a form submission sends `abc` for an optional numeric field
- **THEN** validation fails with an error that the field must be a number
