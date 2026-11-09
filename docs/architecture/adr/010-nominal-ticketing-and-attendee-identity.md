# ADR 010: Nominal Ticketing and Attendee Identity

- **Status:** Accepted
- **Date:** 2026-11-09

## Context

Italian football ticketing is nominative. The club is the organizer; a ticket is tied to the named person who will enter the stadium, not only to the account that paid. Clubs commonly require identity data at purchase, cap a buyer at four tickets per match, require a fan card for some sectors, allow a name change only before a deadline, and are moving to digital tickets in an app or wallet.

The v2 model ties one claimed ticket to one user and has no price, order, attendee, QR code or check-in. That is not a realistic Italian club ticketing model.

The project does not process real money and does not perform financial KYC. The identity data exists for event access and security, not for payments or AML.

## Decision

- Separate the **buyer** from the **attendee**. A buyer may purchase one to four tickets per event, each assigned to a named attendee.
- Store attendee identity fields per ticket: first name, last name, date of birth, place of birth, tax code or document number, and an optional fan-card number. The required fields are configurable per club/event.
- Model ticket types with sector, simulated price, allocation, sales window, maximum per buyer (default four), fan-card requirement, transferability and away-sector flag.
- Issue a unique ticket code and a digital QR page per ticket. Club staff check in by code; check-in is idempotent.
- Support a name change/transfer before the configured deadline when the ticket type is transferable. Non-transferable tickets and late requests are refused. Every transfer is recorded.
- Support a box-office channel for club staff sales and check-in, with audit.
- Keep nominal identity data separate from prediction data. Clubs see aggregate prediction choices only; attendee identity is operational data for the club's own event.
- Treat the club as the data controller and MatchPulse as the processor. Restrict attendee data to `OWNER`, `ADMIN` and `STAFF`; `ANALYST` sees aggregates only. Define a retention window and a cleanup path.
- Continue to use simulated money. No payment instrument, card data, financial KYC or AML process is collected.

## Consequences

- The ticket schema and checkout flow are larger than the v2 claim flow.
- The buyer can purchase for friends or family without creating multiple accounts.
- The club's attendee list and check-in view are useful for real match-day operations.
- Privacy and retention become part of the ticketing design, not an afterthought.
- Full seat maps, wallet passes, turnstile hardware and FIGC/Questura integration remain later work.
- Legacy claimed tickets remain non-transferable and have no attendee identity.

## Alternatives considered

- **Keep one ticket tied to the buyer.** Rejected: it does not match Italian nominal ticketing or group purchases.
- **Collect no identity data.** Rejected: the club cannot issue a realistic nominal ticket or operate the gate.
- **Delegate all ticketing to TicketOne/Vivaticket.** Rejected for this product: it removes the club-owned relationship and the integrated prediction layer that differentiate MatchPulse.
- **Add financial KYC.** Rejected: there is no real money, and it is unnecessary for event access.
