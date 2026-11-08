# ADR 006: Simulated Tickets and Rewards

- **Status:** Accepted
- **Date:** 2026-11-08

## Context

The MVP needs to demonstrate ticket purchase and rewards without a payment provider or external coupon system.

## Decision

Ticket claim is simulated: one ticket per user/tournament, bounded by `ticket_allocation`, and it credits `ticket_points`. Reward redemption deducts points and creates a unique local code in `reward_redemptions`. No real money or external coupon is involved.

## Consequences

- The full fan journey is demonstrable locally.
- Real payments, refunds, tax and coupon integration remain out of scope.
- The simulation must be labelled clearly in the UI and documentation.
