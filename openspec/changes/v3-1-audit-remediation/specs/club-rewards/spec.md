# Spec Delta

## Purpose

Defines retry-safe redemption of club rewards so a retry or double submit cannot debit points twice.

## ADDED Requirements

### Requirement: Reward redemption is idempotent
A reward redemption SHALL require a request key; the same key and payload SHALL replay the recorded redemption, while a different payload or reward SHALL be refused.

#### Scenario: Identical retry replays one redemption
- **WHEN** a fan retries a redemption with the same request key and reward
- **THEN** the recorded code is returned and points are not debited again

#### Scenario: Concurrent duplicate creates one redemption
- **WHEN** two redemptions with the same request key arrive concurrently
- **THEN** one redemption and one debit are committed and the other request replays or is refused

#### Scenario: Changed payload is refused
- **WHEN** a request key is reused for a different reward or cost
- **THEN** the request is refused and no debit or code is created
