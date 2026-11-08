# MatchPulse MVP Scope

- **Version:** v2.0.0 target
- **Status:** Approved scope; implementation in progress.
- **Roles:** Fan, Organizer, Club.

## 1. Fan

- Anonymous sign-in.
- Browse tournaments and matches.
- Claim one simulated ticket per tournament; receive points.
- Register while capacity remains.
- View live score, timer and market.
- Enter and exit positions at current odds.
- View portfolio, trades and payouts.
- Redeem points for a local discount code.

## 2. Organizer

- Email/password sign-in.
- Create and update tournaments; set capacity, ticket allocation and ticket points.
- Create matches; a market is created with each match.
- Update scores and status.
- View registrations and tickets for owned tournaments.
- Finalize the match and resolve the owned market.
- Cannot manage another organizer's data.

## 3. Club

- Email/password sign-in.
- View aggregate crowd analytics by match/outcome.
- Cohorts below 5 traders are suppressed.
- Export aggregate-only CSV.
- Cannot read profiles, individual trades, positions or identities.

## 4. Ops

- Health endpoint, JSON logs, smoke test, release/rollback/backup runbook.
- Local/CI delivery only; no hosted production environment.

## 5. Non-goals

- Real ticket payments or refunds.
- Real coupon or discount-provider integration.
- Production cloud deployment, TLS/DNS, on-call or external monitoring.
- External club contracts or analytics integrations.
- Multi-instance or production-scale elasticity claims.
- Literal 100% test coverage.

## 6. Acceptance

The MVP is accepted when the three role journeys work end-to-end, the critical invariants and role boundaries pass in CI, E2E and critical accessibility checks pass, the documentation is current, and the release limits are recorded.
