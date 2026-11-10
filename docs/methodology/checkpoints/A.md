# Checkpoint A — Context, Claim and First Evidence

**3-minute checkpoint.** The question is: who is the user, what is the bounded
problem, and what evidence could challenge the claim?

## Context and claim

MatchPulse is a club-first football ticketing and fan-engagement platform. The
first user is a **club organizer** running a local match. The first bounded
problem is capacity: when many fans act at the same moment, the event must not
sell or admit more people than the configured limit.

The first increment was capacity-safe tournament registration. The behaviour
claim was:

> For a tournament organizer, the platform will keep participation at or below
> the configured capacity and keep point balances, positions and trades
> consistent under concurrent requests, measured by a concurrent burst and
> committed-state assertions against a real PostgreSQL database, with the
> limitation that the evidence is local/CI, uses one database instance, and has
> no real-user observation.

This is a **behaviour claim**, not an outcome claim. The problem claim — that
organizers experience overbooking and value the control — is a hypothesis. The
outcome claim — that the platform reduces reconciliation work — is also a
hypothesis. I state both limits rather than presenting technical evidence as user
validation.

## First increment

An organizer creates an event with a capacity. A fan registers. The database
function locks the event row, checks capacity, inserts the registration and
increments the counter in one transaction. A duplicate is refused without
consuming a second place. A full event tells the fan that it is full.

The architecture boundary was visible: the UI did not decide capacity. The
database did.

## Evidence

The test is 100 concurrent registration requests against capacity 32. It asserts
the accepted/refused split **and** committed rows, the stored counter and
`counter <= capacity`. The first version of this evidence was reopened because it
could only pass: it checked response counts, not committed state. The corrected
suite was observed failing when the capacity guard and CHECK constraints were
removed (`Expected: 32, Received: 100`) and when uniqueness was removed
(`Expected: 1, Received: 10`).

**Finding.** The original capacity guard was already correct; the real defect was
uniqueness. The earlier documentation had mislabelled it. That is why fault
injection matters more than a green run.

## Limit and decision

The limit is one local database, one machine, authenticated clients, no
production network or retry behaviour, and a planning-assumption traffic number.
The capacity claim is accepted for the recorded mechanism. The next increments
were the live market, authentication/RLS and club tenancy. I did not claim a
security boundary until authentication and RLS existed.

**Detail:** [invariant registry](../checkpoint-A/02-invariants.md) ·
[methodology checkpoints](../reports/2026-11-10.md) · [requirements](../../architecture/requirements.md)
