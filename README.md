# MatchPulse

MatchPulse is a **prediction market and aggregate fan-data service for football
clubs**. Clubs pay a subscription, create and manage their events, and use
MatchPulse to register attendees and run a points-based prediction market. Fans
create an account, register attendees for an event, and use the points they earn
to predict the match outcome.

**No money betting.** MatchPulse does not take bets, hold money or pay cash.
Fans earn points when they register for a ticket. These points are the platform's
credit system: they are per person, belong to the fan's account and are not
transferable. They can be redeemed for club discounts or gifts and are never
convertible to money.

**Per-person registration.** Every ticket is tied to a named attendee. A buyer
can register 1–4 people, and each person needs the required identity details.
Fans must create an account to register, predict and hold points.

**What MatchPulse is not.** It is not a ticket shop, not a rewards shop and not a
payment provider. Clubs own their events, set their prices and define their
rewards. MatchPulse provides the login, the prediction market and the aggregate
data service. Clubs fulfil the discounts or gifts; MatchPulse only records the
points and the redemption.

## At a glance

| Who | What they do | What they pay |
| :--- | :--- | :--- |
| **Fan** | Create an account, register named attendees, earn points, predict, redeem club rewards | Nothing to MatchPulse |
| **Club** | Subscribe to a plan, create events, manage attendees, see aggregate prediction data | The club subscription |
| **Platform admin** | Manage clubs, plans and audit; no impersonation | — |

Fans log in to predict. Clubs log in to see their event data. The product is
deliberately simple.

## Status

This is the **v3.0.0 course prototype** plus the v3.1.0 security and integrity
remediation. Subscriptions, ticket prices and rewards are simulated; there is no
real payment provider, financial KYC, invoice, refund or settlement.

## Documentation

| Document | What it covers |
| :--- | :--- |
| [Course package](docs/course/README.md) | Kata, characteristics, architecture description and methodology checkpoints |
| [Architecture](docs/architecture/README.md) | Structure, modules, C4 views, code map and decisions |
| [Methodology](docs/methodology/README.md) | Claim, checkpoints A–E, evidence and AI use |
| [Development](docs/development.md) | Local setup, demo accounts, CLI, Docker and tests |
| [Operations](docs/operations/runbook.md) | Environments, health, release and recovery |
| [Workflows](docs/workflows/README.md) | Issue, branch, review and release flow |

See [`AGENTS.md`](AGENTS.md) for the engineering rules and human decision gates.
