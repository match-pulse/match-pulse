# ADR 002: Live prediction markets with an LMSR market maker

- **Status:** Accepted
- **Date:** 2026-10-19
- **Decision owner:** human developer

## Context

The original model accepted one fixed-score prediction per match before kickoff and scored it after the result. The owner replaced it with a live market:

- fans hold positions during the match and may exit part or all of them at any moment before resolution;
- PnL is proportional to how the market moved after entry, not all-or-nothing on the final score;
- the sellable dataset is the crowd's aggregate position over time — what the majority believed and when it changed;
- the platform takes no commission of any kind;
- re-entry is cooled down to keep the sentiment signal meaningful, while exits stay free.

The domain still requires correctness under concurrency: balances and holdings never negative, positions and market state consistent, resolution paid once.

## Decision

- **One three-outcome market per match** (`HOME`, `DRAW`, `AWAY`), open from kickoff until resolution. The market status, not the match status, decides whether trades are accepted.
- **LMSR pricing** with liquidity parameter `b` (default 100): cost `C(q) = b·ln(Σ e^{q_i/b})`; price `p_i = e^{q_i/b} / Σ e^{q_j/b}`.
- **Entries choose a point budget.** The database solves the largest share quantity whose cost fits the budget and debits `ceil(cost)`.
- **Exits sell shares back to the curve**, crediting `floor(cost_before − cost_after)`. No fee is charged.
- **Zero commission** on entry, exit and settlement. Rounding dust is never credited to any account.
- **Entry cooldown per user × market:** 5 s for the first re-entry, then a linear `+15 s` ladder (5, 15, 30, 45, 60, …) capped at 600 s. It decays one level per five quiet minutes; refused attempts do not escalate; exits are exempt.
- **All state changes in transactional `SECURITY INVOKER` functions**, locking in the order market → profile → cooldown → position.
- **Resolution is terminal** and pays exactly one point per winning share, once per holder.
- **Fixed-score predictions are retired**, including their tables, actions, components and tests.

## Alternatives considered

| Option | Why it was not chosen |
| :--- | :--- |
| **Fixed-score predictions with after-the-fact scoring** | No dynamic PnL, no positions to exit, and no time series of the crowd's view. Rejected by the owner. |
| **Order book** (Polymarket-style) | Needs makers, matching and partial fills; no liquidity guarantee when hundreds of fans want to trade at kickoff. |
| **Constant-product market maker** (`x·y = k`) | Natural for binary outcomes; a three-outcome version needs a multi-asset generalisation that is harder to explain and verify than LMSR. |
| **Parimutuel pool** | The payout is only known after resolution and positions cannot be exited at a price during the match, contradicting the required dynamic exits. |
| **Pricing in application code** | A price read and a balance write outside one transaction can double-spend or diverge from the market state. Rejected; the invariant must hold under concurrency. |

## Consequences

- **Bounded maker loss.** LMSR's worst-case loss is `b·ln(3)`; accepted as the cost of always quoting a price.
- **Spread is real.** The quoted price is marginal, so a large entry pays slightly more than the pre-trade price. This is a mechanic, not a commission.
- **Numeric guard.** The engine refuses a trade that would push `q/b` above 25, keeping the exponential inside a safe range.
- **Dust.** Whole-point rounding leaves fractional dust that belongs to no account. It is recorded, not redistributed.
- **Waiting is a feature.** An accepted entry can face up to 10 minutes of cooldown. This reduces churn but is deliberate friction; exits remain free.
- **Analytics path.** The trade log is the dataset of record for club insights. Export and privacy rules remain unimplemented (INV-05).
- **Docs and code move together.** Invariants M-INV1–M-INV8 are specified here and become `Verified` only when the corresponding tests fail under fault injection.

## Related

- [`../../methodology/exec-plans/live-prediction-market.md`](../../methodology/exec-plans/live-prediction-market.md) — approved execution plan
- [`../01-system-overview.md`](../01-system-overview.md) — domain model and journeys
- [`../../methodology/checkpoint-A/02-invariants.md`](../../methodology/checkpoint-A/02-invariants.md) — invariant registry
- [`../02-architecture-characteristics.md`](../02-architecture-characteristics.md) — characteristics and measurements
