# MatchPulse — Requirements

This is the detailed requirement register. The kata uses the broad **R1–R8**
requirements; this page keeps the detailed **R1.1–R8.x** requirements that were
previously numbered K1–K20. The old K IDs are retired; the mapping at the bottom
preserves traceability.

## Broad requirements

| ID | Broad requirement |
| :--- | :--- |
| **R1** | Club tenancy and plans |
| **R2** | Events, capacity and matches |
| **R3** | Nominal ticketing and check-in |
| **R4** | Fan account and cross-club access |
| **R5** | Points prediction market |
| **R6** | Rewards and points |
| **R7** | Club insights and privacy |
| **R8** | Platform administration and simulated commerce |

## Detailed requirements

### R1 — Club tenancy and plans

- **R1.1.** Clubs are tenants with a plan (`STARTER`, `PRO`, `ELITE`). The plan
  gates prediction markets, rewards, export, members and events in the database.
  Only an `ACTIVE` subscription grants entitlements.

### R2 — Events, capacity and matches

- **R2.1.** Club staff create and manage events, matches and ticket types.
- **R2.2.** Staff set an event capacity and a ticket allocation; sales and
  registrations never exceed them.
- **R2.3.** Fans register for a place while capacity remains and are told when the
  event is full. This is the legacy path for club-less events.
- **R2.4.** Fans view the scoreboard, kickoff time and available market on their
  phones.
- **R2.5.** Match scores are updated during the game and staff finalise the
  result.

### R3 — Nominal ticketing and check-in

- **R3.1.** A buyer purchases 1–4 named tickets. Each attendee has identity data,
  terms acceptance, a unique code/QR, transfer rules and idempotent check-in.

### R4 — Fan account and cross-club access

- **R4.1.** Fans buy tickets and receive prediction points.
- **R4.2.** One fan account can buy and predict across clubs; a club sees only its
  own event orders, attendees and aggregate insights.

### R5 — Points prediction market

- **R5.1.** Fans trade points on the match outcome (HOME, DRAW or AWAY) while the
  market is open.
- **R5.2.** A fan chooses how many points to commit; the market prices the
  position, and the fan may exit part or all of it.
- **R5.3.** An exit settles at current odds: a position that moves in the fan's
  favour gains points; a position that moves against the fan loses in proportion
  to the movement, not the whole stake.
- **R5.4.** The platform takes no commission on entries, exits or settlement.
- **R5.5.** Re-entry into the same market is delayed by an escalating cooldown;
  exits are never blocked or charged.
- **R5.6.** When a result is finalised, winning shares pay exactly one point each
  and losing shares pay nothing; resolution is terminal, one-shot and bound to
  the score-derived winner.

### R6 — Rewards and points

- **R6.1.** Fans redeem points for club rewards and discounts. Points are not
  convertible to cash.

### R7 — Club insights and privacy

- **R7.1.** Club representatives access and export their own aggregate prediction
  data, including how the crowd's view changed over time.
- **R7.2.** The platform provides aggregate insights to the organising club; it
  does not sell personal data.
- **R7.3.** Attendee identity is event-access data, separate from prediction
  data; cohorts below 5 are suppressed and personal data is not sold.

### R8 — Platform administration and simulated commerce

- **R8.1.** A platform admin manages clubs, plans and audit without impersonation;
  every capability is reachable through the CLI for agent audits. There are no
  real payments or financial KYC.

## Legacy K → R mapping

| Old | New | Requirement |
| :--- | :--- | :--- |
| K16 | R1.1 | Club plans and entitlements |
| K1 | R2.1 | Create events, matches, ticket types |
| K2 | R2.2 | Capacity and allocation |
| K4 | R2.3 | Capacity-bounded registration |
| K5 | R2.4 | Scoreboard and market on phones |
| K11 | R2.5 | Scores and finalisation |
| K17 | R3.1 | Nominal ticketing and check-in |
| K3 | R4.1 | Tickets and points |
| K18 | R4.2 | Cross-club account and club isolation |
| K6 | R5.1 | Trade the outcome |
| K7 | R5.2 | Choose points and exit |
| K8 | R5.3 | Exit settlement |
| K9 | R5.4 | No commission |
| K10 | R5.5 | Entry cooldown |
| K12 | R5.6 | Terminal resolution |
| K13 | R6.1 | Rewards |
| K14 | R7.1 | Club insights and export |
| K15 | R7.2 | Aggregate only, no data sale |
| K19 | R7.3 | Attendee identity and suppression |
| K20 | R8.1 | Admin, CLI and simulated commerce |
