# Proposal

## Why

The v3.0.0 audit found 3 Critical, 9 Major, 6 Minor and 2 Informational defects, including an anonymous-authentication path, a legacy RLS policy that exposes attendee identity after offboarding, and a prediction market that remains tradable after the match result is public. The v3.0.0 release cannot be treated as a verified security and market-integrity baseline until these are closed and the evidence matches the claims.

## What Changes

- Disable anonymous authenticated sessions and remove legacy organizer RLS policies that expose attendee identity or registrations after membership removal.
- Remove unaudited platform-admin direct reads of invitation emails and fan-card numbers.
- **BREAKING** Bind prediction-market entries to the match not being `FINISHED`; require a `FINISHED` match and a score-matching winner for resolution; keep exits available until resolution.
- Ensure disabling predictions only blocks new buys, not exits.
- Enforce the per-event buyer cap cumulatively, bound ticket sales by venue capacity, and scope legacy claim/registration to `club_id IS NULL` events.
- **BREAKING** Require a request ID for reward redemption and replay/refuse duplicate requests.
- Require an active subscription for limited entitlements and serialise member/event limit checks.
- Redact transfer history, audit card numbers and invitation emails under the retention rule; suppress prediction insights per outcome cohort below 5.
- Neutralise CSV formula prefixes and make the seeded demo market resolvable.
- Correct invariant claims and add failure-mode tests and fault-injection evidence.

## Capabilities

### New Capabilities

- `security/authorization`: anonymous auth removal, current-membership attendee reads and platform-admin direct-read boundaries.
- `prediction-market`: result-bound entry/exit windows, resolution and exit availability when predictions are disabled.
- `ticketing`: cumulative buyer limits, venue capacity, legacy claim/registration scope and ticket request idempotency.
- `club-rewards`: idempotent reward redemption and replay/refusal semantics.
- `club-subscriptions`: active-subscription entitlement enforcement and concurrency-safe limits.
- `privacy/retention`: retention of derived attendee, audit and invitation data.
- `analytics/privacy`: outcome-level cohort suppression and safe aggregate CSV export.

### Modified Capabilities

None. The project has no archived main specs; this change introduces the capability contracts above.

## Impact

- Configuration: `supabase/config.toml`, local auth and test fixtures.
- Database: new migrations for RLS, market RPCs, ticket purchase, reward redemption, entitlement locks, retention and analytics; new constraints and redaction paths.
- Application: market/ticket/reward actions and pages, club event/dashboard, legacy tournament pages, CLI commands and export routes.
- Contracts: `redeem_reward` request ID and market resolution behaviour are breaking client changes; the CLI, Server Actions, tests and playbook must be updated together.
- Verification: new invariant tests, fault-injection mutations, E2E coverage, verification records, ADRs and AI transparency entries.
