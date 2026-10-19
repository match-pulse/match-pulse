# MatchPulse

A platform for managing local football tournaments where spectators buy tickets, wager prediction points on live match outcomes, and earn rewards redeemable for ticket discounts. The platform sells aggregated prediction data to football clubs to support their strategic decisions.

- **Users:** Spectators, tournament staff, and football club representatives.

- **Requirements:**
  - staff create matches and manage ticket sales
  - staff set a maximum participant capacity for each tournament, bounded by the venue
  - spectators buy tickets and receive prediction points
  - spectators register for a place in a tournament while capacity remains, and are told when it is full
  - spectators view the live scoreboard, timer, and available predictions on their phones
  - spectators wager points on match outcomes
  - match scores are updated during games, triggering reward calculations
  - spectators redeem points for future ticket discounts
  - club representatives access and export aggregated prediction data

- **Additional Context:**
  - traffic peaks during matches, with hundreds of concurrent spectators
  - participation must never exceed the capacity a staff member has set, including when requests arrive at the same moment
  - point balances must remain consistent under concurrent requests
  - revenue comes from selling prediction data to football clubs to support strategic decisions
  - prediction points cannot be converted into cash