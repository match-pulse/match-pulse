# MatchPulse

A platform for managing local football tournaments where spectators buy tickets, wager prediction points on live match outcomes, and earn rewards redeemable for ticket discounts. The platform sells aggregated prediction data to football clubs to support their strategic decisions.

- **Users:** Spectators, tournament staff, and football club representatives.

- **Requirements:**
  - staff create matches and manage ticket sales
  - staff set a maximum participant capacity for each tournament, bounded by the venue
  - spectators buy tickets and receive prediction points
  - spectators register for a place in a tournament while capacity remains, and are told when it is full
  - spectators view the live scoreboard, timer, and available market on their phones
  - spectators trade points on the outcome of a match — home win, draw, or away win — while the match is running, entering and exiting positions at the current market odds
  - a spectator chooses how many points to commit when entering; the market prices the position, and the spectator may exit part or all of it at any later moment before the result is finalised
  - exiting settles the position against the current odds: a position opened at shorter odds and closed at longer odds gains points; a position that moves against the spectator loses points in proportion to the movement, not the whole stake
  - the platform takes **no commission of any kind** on entries, exits or settlement
  - to keep the sentiment signal meaningful, re-entry into the same match market after a position is closed is delayed by an escalating cooldown; exiting a position is never blocked and never charged
  - match scores are updated during games, and staff finalise the result
  - when a result is finalised, open positions settle: winning shares pay exactly one point each, losing shares pay nothing
  - spectators redeem points for future ticket discounts
  - club representatives access and export aggregated prediction data, including how the crowd's view changed over the course of a match

- **Additional Context:**
  - traffic peaks during matches, with hundreds of concurrent spectators
  - participation must never exceed the capacity a staff member has set, including when requests arrive at the same moment
  - point balances must remain consistent under concurrent requests
  - the prediction data is valuable because it combines the crowd's aggregate position with time: what the majority believed, and when it changed
  - revenue comes from selling prediction data to football clubs to support strategic decisions
  - prediction points cannot be converted into cash
