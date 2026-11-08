# MatchPulse

## Description

A platform for managing local football tournaments. Spectators buy tickets, register for a place, follow live match data, and trade prediction points on the match outcome. Points earned from accurate predictions are redeemable for future ticket discounts. The platform also sells aggregated, time-stamped prediction data to football clubs so they can understand how the crowd's view changed during a match.

## Users

| User | Expected number and pattern | What they do |
| :--- | :--- | :--- |
| **Spectators** | Hundreds concurrently during a match; thousands across a tournament. This is a planning assumption, not yet measured with real users. | Buy tickets, register for a place, follow the match, trade points, redeem rewards. |
| **Tournament staff** | A small team, roughly 1–5 people per tournament, active at setup, during the match and at result time. | Create matches, set capacity, update scores, finalise results. |
| **Club representatives** | A few analysts per club, reading and exporting data after matches. | Access and export aggregated prediction data. |

Venue capacity bounds the number of participants; the platform must not sell or register more places than the venue allows.

## Requirements

- **K1.** Staff create and manage matches and ticket sales.
- **K2.** Staff set a maximum participant capacity for each tournament, bounded by the venue.
- **K3.** Spectators buy tickets and receive prediction points.
- **K4.** Spectators register for a place while capacity remains, and are told when the tournament is full.
- **K5.** Spectators view the live scoreboard, timer and available market on their phones.
- **K6.** Spectators trade points on the match outcome — home win, draw or away win — while the match is running, entering and exiting positions at the current market odds.
- **K7.** A spectator chooses how many points to commit when entering; the market prices the position, and the spectator may exit part or all of it at any later moment before the result is finalised.
- **K8.** Exiting settles the position against the current odds: a position opened at shorter odds and closed at longer odds gains points; a position that moves against the spectator loses points in proportion to the movement, not the whole stake.
- **K9.** The platform takes **no commission of any kind** on entries, exits or settlement.
- **K10.** To keep the sentiment signal meaningful, re-entry into the same match market after a position is closed is delayed by an escalating cooldown; exiting a position is never blocked and never charged.
- **K11.** Match scores are updated during games, and staff finalise the result.
- **K12.** When a result is finalised, open positions settle: winning shares pay exactly one point each, losing shares pay nothing.
- **K13.** Spectators redeem points for future ticket discounts.
- **K14.** Club representatives access and export aggregated prediction data, including how the crowd's view changed over the course of a match.
- **K15.** The platform sells aggregated prediction data to clubs; prediction points cannot be converted into cash.

## Additional Context

- Traffic peaks during matches, with hundreds of concurrent spectators as the current planning assumption.
- Participation must never exceed the capacity a staff member has set, including when requests arrive at the same moment.
- Point balances, positions and trade records must remain consistent under concurrent requests.
- The prediction data is valuable because it combines the crowd's aggregate position with time: what the majority believed, and when it changed.
- Revenue comes from selling prediction data to football clubs to support strategic decisions.
- Prediction points cannot be converted into cash.
- The first implementable increment covers capacity-safe registration and the live market. Ticket purchase, rewards redemption and club analytics are part of the product vision but are not all implemented yet.
