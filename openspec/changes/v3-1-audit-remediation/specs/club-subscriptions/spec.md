# Spec Delta

## Purpose

Defines active-subscription entitlement enforcement and concurrency-safe plan limits.

## ADDED Requirements

### Requirement: Only active subscriptions grant limits
A club SHALL create events or invite members only when its subscription is `ACTIVE` and the relevant entitlement is enabled; a missing, `PAST_DUE` or `CANCELED` subscription SHALL NOT be treated as unlimited.

#### Scenario: Canceled club cannot create
- **WHEN** a canceled club attempts to create an event or invite a member
- **THEN** the operation is refused and no event or invitation is created

#### Scenario: Active club remains within its plan
- **WHEN** an active STARTER or PRO club is below its limit
- **THEN** the operation succeeds and the limit is reported

### Requirement: Plan limits are concurrency-safe
Member and active-event limit checks SHALL serialise with the insert so concurrent requests cannot exceed the active plan limit.

#### Scenario: Concurrent invites cannot exceed the limit
- **WHEN** more concurrent invitations than the remaining member allowance are submitted
- **THEN** the committed member plus pending count never exceeds the limit

#### Scenario: Concurrent events cannot exceed the limit
- **WHEN** more concurrent event creations than the remaining active-event allowance are submitted
- **THEN** the committed active-event count never exceeds the limit
