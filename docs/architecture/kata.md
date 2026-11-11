# MatchPulse — Kata

## One-minute pitch

For a club organizer, MatchPulse sells named tickets and runs a points prediction
market for a match day. The hard part is concurrency: capacity, balances and club
data must stay correct when many fans act at once. The system is one Next.js app
and one PostgreSQL database. The database enforces the rules through RLS, row
locks and transactional functions. I claim that ticket sales and prediction
trades stay correct under concurrent requests — no oversell, no double charge, no
double payout, no cross-club leak — with the limitation that commerce is
simulated and the evidence is local/CI. The detail is in the architecture
description and the requirement register.

MatchPulse is a club-first football ticketing and fan-engagement platform. Clubs
subscribe to a plan, create events and matches, sell named tickets, check
attendees in, and read aggregate prediction insights. Fans use one account to buy
tickets and predict with points across clubs. A platform admin manages clubs,
plans and audit. Commerce is simulated.

**Users:** hundreds of fans at kickoff; 1–10 club staff (`OWNER`, `ADMIN`,
`STAFF`, `ANALYST`); one platform admin/operator.

## Requirements

- **R1. Club tenancy.** `STARTER`, `PRO` and `ELITE` plans gate features and
  limits in the database.
- **R2. Events and capacity.** Staff create events and matches; sales and
  registrations never exceed capacity or allocation.
- **R3. Nominal tickets.** A buyer gets 1–4 named attendees with identity, terms,
  a code/QR, transfer rules and idempotent check-in.
- **R4. Cross-club account.** One fan account buys and predicts across clubs; a
  club sees only its own data.
- **R5. Points market.** Fans enter and exit HOME/DRAW/AWAY while open; no
  commission, a re-entry cooldown, and score-bound one-shot resolution.
- **R6. Rewards.** Tickets earn points; fans redeem club rewards; points are not
  cash.
- **R7. Privacy.** Clubs see aggregate insights only; cohorts below 5 are
  suppressed; attendee identity is excluded.
- **R8. Administration.** Clubs, plans and audit without impersonation; CLI
  parity; no real payments or KYC.

**Context:** kickoff peaks; correctness under concurrency and retries; seat maps,
wallet passes, turnstile hardware, FIGC integration and real money are out of
scope.

**Detail:** [requirements](./requirements.md) · [domain model](./02-domain-model.md) ·
[invariant registry](../methodology/checkpoint-A/02-invariants.md)
