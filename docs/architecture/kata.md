# MatchPulse

A platform for local football tournaments where spectators buy tickets, receive prediction points, and wager points on live match outcomes. The platform sells aggregated prediction data to football clubs.

- **Users:** Spectators, tournament staff, and football club representatives.

- **Requirements:**
  - staff create matches and manage ticket sales
  - spectators buy tickets and receive prediction points
  - spectators view the live scoreboard, timer, and available predictions on their phones
  - spectators wager points on match outcomes
  - referees update scores, triggering reward calculations
  - spectators redeem points for future ticket discounts
  - club representatives access and export aggregated prediction data

- **Additional Context:**
  - traffic peaks during matches, with hundreds of concurrent spectators
  - point balances must remain consistent under concurrent requests
  - revenue comes from selling prediction data to football clubs to support strategic decisions
