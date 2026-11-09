# MatchPulse

## Description

A club-first football ticketing and fan-engagement platform. Clubs subscribe to plans, create events and sell nominal tickets, check in attendees and see aggregate prediction insights for their own matches. Fans use one email/password account to buy tickets and trade prediction points across clubs. Points are redeemable for club discounts. Commerce is simulated: no real money, financial KYC or data resale.

## Users

| User | Expected number and pattern | What they do |
| :--- | :--- | :--- |
| **Fans** | Hundreds concurrently during a match; one global account across clubs. Planning assumption, not real-user measured. | Buy nominal tickets, predict, hold a cross-club portfolio, redeem club rewards. |
| **Attendees** | One per ticket; no account required. | Enter the stadium with their identity and ticket code/QR. |
| **Club staff** | 1–10 per club; `OWNER`, `ADMIN`, `STAFF`, `ANALYST`. | Create events/ticket types, manage orders and attendees, check in, resolve markets, read aggregate insights. |
| **Platform admin** | The solo operator. | Manage clubs, plans and subscription status; review audit. |
| **Ops** | CLI with the service role. | Maintenance, attendee retention, backup and recovery checks. |

Venue capacity and ticket allocation bound sales; the platform must never oversell or register more participants than the configured limits.

## Requirements

- **K1.** Club staff create and manage events, matches and ticket types.
- **K2.** Staff set a maximum participant capacity and ticket allocation for each event.
- **K3.** Fans buy tickets and receive prediction points.
- **K4.** Fans register for a place while capacity remains, and are told when the event is full.
- **K5.** Fans view the scoreboard, kickoff time and available market on their phones.
- **K6.** Fans trade points on the match outcome — home win, draw or away win — while the market is open.
- **K7.** A fan chooses how many points to commit; the market prices the position, and the fan may exit part or all of it before resolution.
- **K8.** Exiting settles at the current odds: a position opened at shorter odds and closed at longer odds gains points; a position that moves against the fan loses in proportion to the movement, not the whole stake.
- **K9.** The platform takes **no commission** on entries, exits or settlement.
- **K10.** Re-entry into the same market is delayed by an escalating cooldown; exits are never blocked and never charged.
- **K11.** Match scores are updated during games and staff finalise the result.
- **K12.** When a result is finalised, winning shares pay exactly one point each and losing shares pay nothing; resolution is terminal and one-shot.
- **K13.** Fans redeem points for club rewards and discounts.
- **K14.** Club representatives access and export their own aggregate prediction data, including how the crowd's view changed over time.
- **K15.** The platform provides aggregate insights to the organizing club; it does not sell personal data, and points cannot be converted into cash.
- **K16.** Clubs are tenants with a plan (`STARTER`, `PRO`, `ELITE`); the plan gates prediction markets, rewards, export and event/member limits in the database.
- **K17.** Ticketing is nominal: a buyer purchases 1–4 tickets, each assigned to a named attendee with identity data, terms acceptance, a digital code/QR and idempotent check-in; a transferable ticket may change attendee before the deadline.
- **K18.** One fan account can buy and predict across clubs; a club sees only its own event orders, attendees and aggregate insights.
- **K19.** Attendee identity is event-access data, separate from prediction data; cohorts below 5 are suppressed and personal data is not sold.
- **K20.** A platform admin manages clubs, plans and audit without impersonation; every feature is reachable through the CLI for agent audits, with no real payments or financial KYC.

## Additional Context

- Traffic peaks during matches, with hundreds of concurrent fans as the planning assumption.
- Participation and ticket sales must never exceed the configured capacity/allocation, including under concurrent requests.
- Point balances, positions and trades must remain consistent under concurrent requests; retries must not double-charge.
- The prediction data combines the crowd's aggregate position with time: what the majority believed, and when it changed.
- Revenue comes from club subscriptions and simulated per-event plans, not from selling fan data.
- The platform uses simulated commerce; there is no payment provider, financial KYC, invoice, refund or settlement.
- The v3 increment covers club tenancy, nominal ticketing, cross-club fans, aggregate insights and the CLI. Seat maps, wallet passes, turnstile hardware and FIGC/Questura integration remain later work.
