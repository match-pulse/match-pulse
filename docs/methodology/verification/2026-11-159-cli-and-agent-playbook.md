# Verification — v3 Shared Contract and CLI

- **Date:** 2026-11-09
- **Issue:** #159 (part of #153)
- **Pull request:** #160
- **CI run:** [42612258666](https://github.com/match-pulse/match-pulse/actions/runs/42612258666)
- **Scope:** shared domain wrappers, `matchpulse` CLI, CLI profiles, end-to-end agent scenarios
- **Related:** [Execution plan](../exec-plans/153-v3-club-subscriptions.md), [capability manifest](../../testing/capabilities.md), [agent playbook](../../testing/agent-playbook.md), [ADR-009](../../architecture/adr/009-email-password-and-simulated-commerce.md), [ADR-010](../../architecture/adr/010-nominal-ticketing-and-attendee-identity.md)

## 1. What was verified

- `matchpulse commands --json` and `matchpulse describe <command> --json` return the command registry.
- Email/password sign-up creates a fan profile and a stored CLI profile with `0600` permissions.
- `auth whoami` returns the profile, club memberships and platform-admin flag.
- A club owner creates a club, requests a plan, and a platform admin assigns it.
- The owner creates an event, a ticket type and a published match with a prediction market.
- A fan discovers the published event.
- The fan buys two nominal tickets for two named attendees and lists both.
- The club lists the attendees and checks in one ticket; the second check-in is idempotent.
- Sales analytics report two tickets, one check-in and the simulated revenue.
- The fan enters a points-only prediction; the club sees suppressed aggregate insight; the fan sees the position in the portfolio.
- The platform admin sees the plan assignment and ticket-order audit events.
- Cross-club attendee access is refused with a `FORBIDDEN` error.
- A five-ticket purchase is refused with a `VALIDATION` error.

## 2. Observed results

| Check | Result |
| :--- | :--- |
| `Domain invariants` | 41 pass / 0 fail |
| `test:agent` CLI journey | 2 pass / 0 fail |
| `Lint, typecheck and build` | passed |
| `Delivery and recovery` | passed |
| `Fault injection` | passed |
| `E2E and accessibility` | passed |

## 3. Defects found and fixed during verification

No new CLI defect was observed in the final run. The earlier schema verification fixed the legacy resolution, check-in ambiguity, restore dependency and CI port collision.

## 4. Limits

- The web application still uses the v2 anonymous-fan and global-role paths. The v3 auth and UI migration is the next increment.
- The CLI stores access and refresh tokens in a `0600` file. OS keychain integration is not implemented.
- `ops cleanup` remains a separate maintenance script, not a CLI command.
- No real payments, financial KYC, hosted deployment or production recovery is claimed.
- FND-007 and FND-008 remain open human gates.

## 5. Conclusion

The shared contract and CLI are verified against the real database boundary. The CLI can drive the full match-day journey and the main refusal cases, giving the agent playbook an executable foundation.
