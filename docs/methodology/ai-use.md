# AI Use — Short Record

AI contributed code, tests, documentation and review passes. The human owner
decided the product, domain rules, architecture, scope, releases and residual
risk. AI could propose and implement within an approved scope; it could not
approve its own work or accept risk.

The full dated record is the [AI transparency log](ai-transparency-log.md).

## What AI did

| Phase | Contribution | Human decision |
| :--- | :--- | :--- |
| Design | Options and trade-off summaries | Chose the modular monolith, database boundary and market design |
| Schema/RPCs | Draft migrations, functions, constraints, RLS, grants | Approved each migration; chose the lock order and idempotency contract |
| Application | Draft pages, actions, components, CLI commands | Approved UX and command surface; corrected redirects, validation, accessibility |
| Tests | Draft invariant, integration, CLI, E2E and fault-injection tests | Chose the oracle; required observed-red evidence |
| Docs/review | Draft reports, ADRs, checkpoints, review passes | Removed overclaims; required limits and links |

## Prompt pattern

Prompts were bounded by a file, a rule and a verification condition. Examples:

- “Read the migrations and the failing test. Write a transaction-safe function
  that enforces the cumulative buyer limit and capacity. Add a test that fails if
  the trigger is removed. Do not change the API shape.”
- “Review this diff for lock-order, authorization and scope defects. Do not fix
  anything outside the approved issue.”
- “Rewrite this for a course reader. Keep every claim traceable; mark unverified
  statements as limits; do not invent results.”

## What AI got wrong

- A wrong `close_trade` lock order, caught by review before commit.
- A wrong stock/flow model: requests were treated as an inflow into capacity.
- Overclaiming documentation; the human chose explicit withdrawal over hedging.
- A `gen_random_bytes` default that broke the scratch-database restore.
- Early evidence that asserted response counts but not committed state. It was
  reopened and rebuilt with committed-state assertions and fault injection.

The v3.1.0 audit found 20 real defects; they were fixed and verified. That is why
the record is credible.

## Verification and limits

The checks are a business-rule oracle, a real PostgreSQL database, committed-state
assertions, observed-red fault injection, CI and human gates. A green test is not
proof; AI-generated code and tests can share assumptions. There is no independent
third-party audit. The log is a provenance record, not a quality certificate.

**Detail:** [AI transparency log](ai-transparency-log.md) ·
[findings register](findings-register.md) · [methodology checkpoints](reports/2026-11-10.md)
