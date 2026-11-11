# Verification Record — Subscription Expiry (FND-027 / #201)

- **Issue:** [#201](https://github.com/match-pulse/match-pulse/issues/201)
- **PR:** Pending
- **Date:** 2026-11-10
- **Environment:** Local Fedora 44; Bun 1.4.2; local Supabase PostgreSQL 17.11 with `pg_cron`
- **Status:** Verified — implementation and local evidence; human decision owner confirmed the campaign
- **Verifier:** Implementation Agent / Test Engineer (evidence); Human developer (final verification, 2026-11-10)

## 1. Claim or Acceptance Criterion

FND-027: `current_period_end` is enforced. At period end the subscription moves to `PAST_DUE`; entitlements continue for a 7-day grace, then are denied. A daily `pg_cron` job performs the transition.

## 2. Method

- Added `20261215_subscription_expiry.sql`:
  - `has_entitlement` and `entitlement_limit` allow `ACTIVE` or `PAST_DUE` within 7 days of `current_period_end`.
  - `expire_subscriptions()` moves `ACTIVE` subscriptions past `current_period_end` to `PAST_DUE` and writes an audit event.
  - `pg_cron` schedules `expire-subscriptions` daily at 03:00.
  - `admin_list_clubs` now returns `current_period_end`; the admin page displays it.
- Added a grace/expired test: period end 1 day ago → `PAST_DUE` but event creation allowed; period end 8 days ago → `PAST_DUE` and event creation denied.
- Verified the extension and cron job directly in PostgreSQL.

## 3. Command or Evidence

```text
bun test --env-file=.env.local tests/integration/v3-club-tenancy.test.ts -t 'subscription expiry'
1 pass / 0 fail, 5 expect() calls

bun run test
58 pass / 0 fail, 478 expect() calls

bun run test:agent
2 pass / 0 fail, 30 expect() calls

bun run typecheck / lint / check:architecture / check:secrets
passed
```

Direct database evidence:

```text
pg_cron
expire-subscriptions|0 3 * * *|SELECT public.expire_subscriptions();
```

Observed behaviour:

- A subscription with `current_period_end` one day ago becomes `PAST_DUE` after `expire_subscriptions()`, and the owner can still create an event during the grace.
- A subscription with `current_period_end` eight days ago becomes `PAST_DUE` and event creation is refused with `plan entitlement required: max_active_events`.
- The admin club list returns the period end.

## 4. Result

- The period-end and grace rules are enforced in the database.
- The daily expiry job is scheduled.
- The admin view exposes the period end.
- FND-027 is Verified.

## 5. Limitations

- The `pg_cron` schedule is verified locally; the hosted Supabase project must enable the extension when production deployment is performed (the final post-MVP step).
- The grace period is the human-approved 7-day rule.
- Local/CI evidence only; no external billing provider or payment retry process.

## 6. Links

- Issue: [#201](https://github.com/match-pulse/match-pulse/issues/201)
- PR: Pending
- Findings register: FND-027
- Audit: AUD-019
- AI transparency entry: Entry 65

## 7. Addenda

Pending PR link.
