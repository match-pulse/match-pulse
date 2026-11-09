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

## Update 2026-11-09 — v3 nominal simulated orders

The v2 claim flow is superseded for the current product by simulated nominal orders: a buyer purchases 1–4 tickets, each assigned to a named attendee, with a simulated price, terms acceptance, a code/QR and check-in. There is still no real payment, financial KYC, invoice, refund or external coupon. The legacy claim path remains for backward compatibility. See [ADR-010](./010-nominal-ticketing-and-attendee-identity.md).
