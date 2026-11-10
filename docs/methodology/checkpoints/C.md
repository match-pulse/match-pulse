# Checkpoint C — Quality and Residual Risk

**3-minute checkpoint.** Which risk matters most, what behaviour did you test,
what did review change or keep, and what remains uncertain?

## Risk control matrix

| Risk | Control | Effort | Residual risk |
| :--- | :--- | :--- | :--- |
| **R1. Unauthorized access or role escalation** | Supabase Auth, RLS, least-privilege grants, `SECURITY DEFINER` RPCs with `auth.uid()`, role checks, authorization suite | High | No independent audit; legacy `CLUB` role remains (FND-023) |
| **R2. Oversell or over-capacity** | Event/ticket row locks, capacity and allocation triggers, cumulative buyer-limit trigger, v3 tests, fault injection | High | Sales-path trigger not separately mutated; no production load |
| **R3. Double charge or double payout** | Profile/market locks, conditional debit, request-key idempotency, terminal resolution, double-spend and lifecycle tests | High | M-INV2 forced-failure only; single database instance |
| **R4. Privacy leak in insights** | Club-scoped RPCs, aggregate-only columns, outcome/time-bucket suppression, audited export, retention cleanup | High | No independent privacy review; legacy analytics deferred |
| **R5. Operational failure without recovery** | Health, logs, smoke, CI delivery/recovery, runbook, public-schema restore | Medium | No hosted deployment, external monitoring or production recovery (FND-006) |

**Non-test control:** the RLS/grants boundary, architecture guard, code review,
branch protection and human merge gates. R1 and R4 are not solved by tests alone.

**Which risk matters most?** R1. An authorization failure makes every other
guarantee meaningless: a person who can act as another user can move points or
resolve a market. It was the top risk until authentication and RLS existed; the
boundary is tested but not independently audited.

## Quality story

**Behaviour.** One profile with 60 points; two concurrent 50-point entries in two
markets. Exactly one commits. The other is refused for insufficient points. The
balance never goes negative. Exactly one trade and one position exist.

**Evidence.** `market-concurrency.test.ts` runs the race against a real PostgreSQL
database and asserts committed state. With the profile lock and both balance
guards removed, both entries were accepted, the balance reached **−40**, and the
test failed (`Expected: 1, Received: 2`). Restored, the suite returned green.

**Limit.** One local database, two markets, no network retry. It proves the
transactional rule, not production or multi-instance behaviour.

## Review and AI

Review changed the `close_trade` lock order before commit: the first draft locked
the position before the profile, contradicting `market → profile → cooldown →
position`. Review also kept the cooldown-exit implementation and added the missing
test. The v3.1.0 audit then found and fixed real defects in anonymous sign-in,
legacy attendee reads, result binding, buyer limits, reward idempotency and
retention.

AI contributed code, tests and docs; the human decided scope, rules and risk.
AI-generated tests can share assumptions with AI-generated code, so the checks are
the business-rule oracle, observed-red fault injection, CI and human gates. No
third-party audit.

## Residual risk and next action

FND-002: 27 fault-injection entries, but M-INV2 is forced-failure only. FND-004:
p95 is asserted in CI for the 100-registration and 20-ticket bursts; production
and multi-instance load are not measured. FND-006: local/CI delivery, production
deferred. FND-023: legacy `CLUB` analytics deferred. FND-026/027: simulated points
and manual subscription periods accepted. The next evidence is a hosted recovery
drill and an independent privacy review.

**Detail:** [risk map](../checkpoint-C/01-risk-control-map.md) ·
[quality story](../checkpoint-C/02-quality-story.md) · [residual risk](../checkpoint-C/05-residual-risk.md) ·
[findings register](../findings-register.md)
