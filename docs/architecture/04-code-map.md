# MatchPulse — Code Map

This page maps the architecture to the code. It is a navigation aid; where this
map and the code disagree, the code and the
[invariant registry](../methodology/checkpoint-A/02-invariants.md) win.

## 1. Runtime structure

| Element | Location | Responsibility |
| :--- | :--- | :--- |
| Root layout | `src/app/layout.tsx` | Shell and metadata |
| Home route | `src/app/page.tsx` | Routes by platform admin, club membership or fan |
| Login | `src/app/login/page.tsx` | Email/password sign-in, fan sign-up, `next` redirect |
| Public events | `src/app/events/` | Published club events and event detail/checkout |
| Fan area | `src/app/fan/` | Tickets, portfolio, rewards |
| Club dashboard | `src/app/club/dashboard/page.tsx` | Plan, members, events, sales, fan cards, rewards, insights |
| Club event management | `src/app/club/events/[id]/page.tsx` | Ticket types, matches, attendees, check-in, orders, resolution |
| Club invite | `src/app/club/invite/[token]/page.tsx` | Accept a single-use invitation |
| Admin console | `src/app/admin/page.tsx` | Clubs, plans, subscription status, audit |
| Market page | `src/app/market/[id]/page.tsx` | Authenticated market, prices, positions, public trades |
| Health route | `src/app/api/health/route.ts` | Public app/database health signal |
| ELITE export | `src/app/api/club/export-v3/route.ts` | Audited aggregate CSV |
| Session proxy | `src/proxy.ts` | Refreshes the Supabase auth cookie |
| CLI | `src/cli/` | `matchpulse` command tree, profiles and JSON output |

| Shared domain | `src/lib/domain/` | Typed auth, club, event, ticket, prediction, analytics and admin wrappers |
| Viewer seam | `src/lib/viewer.ts` | Profile, club memberships and admin flag for v3 pages |

## 2. Application layer

| Action | Location | Database call |
| :--- | :--- | :--- |
| Fan sign-up/sign-in/out | `src/app/actions/auth.ts` | Supabase Auth |
| Club onboarding/plan | `src/app/actions/clubs.ts` | `create_club`, `request_plan_change` |
| Members and invites | `src/app/actions/clubs.ts` | `invite_club_member`, `accept_club_invite`, `set_club_member_role`, `remove_club_member` |
| Fan cards, rewards | `src/app/actions/tickets.ts`; `src/app/actions/analytics.ts` | `issue_club_fan_card`, `create_club_reward`, `redeem_reward` |
| Events, matches, ticket types | `src/app/actions/events.ts` | `create_club_event`, `create_ticket_type`, `publish_club_event`, `create_club_match`, `update_club_match`, `set_prediction_enabled` |
| Purchase, transfer, check-in | `src/app/actions/tickets.ts` | `purchase_ticket`, `transfer_ticket`, `check_in_ticket` |
| Market resolution | `src/app/actions/events.ts`; CLI | `resolve_market` |
| Analytics export | `src/app/api/club/export-v3/route.ts` | `club_sales_summary`, `club_prediction_insights`, `record_club_export` |
| Admin plan/status | `src/app/actions/admin.ts`; CLI | `admin_assign_plan`, `admin_set_subscription_status` |
| Prediction entry/exit | `src/app/actions/market.ts` | `open_trade` / `close_trade` with `p_request_id` |
| Legacy registration | `src/app/actions/register.ts` | `register_for_tournament` |

The v3 actions are split by the same domain boundaries as `src/lib/domain/`.
`src/app/actions/form.ts` holds shared `FormData`, redirect and error helpers; it
is not a Server Action module.

**Cross-cutting seams:**

- **Identity:** `src/lib/session.ts` — `getCurrentUser()`, `requireUser()`;
  `src/lib/viewer.ts` adds memberships and the admin flag. RPCs independently
  resolve `auth.uid()`.
- **Database client:** `src/lib/supabase/server.ts` — cookie-based
  `@supabase/ssr` client with the anon key. The service role is not used by the
  runtime.
- **Shared domain:** `src/lib/domain/` — typed RPC/read wrappers and error
  mapping. The CLI never imports Server Actions.
- **CLI profiles:** `src/cli/session.ts` — email/password login and
  `~/.config/matchpulse/<profile>.json` with `0600`.
- **Logging:** `src/lib/logger.ts` — JSON lines to stdout/stderr for health and
  key action failures; no tokens, keys, emails or form bodies.
- **Service role:** local fixtures, retention script and test setup only; never
  imported by `src/`.
- **Input validation:** Server Actions and CLI validate before the database; the
  functions re-enforce every rule regardless.

## 3. Database

Migrations in `supabase/migrations/`, replayed in filename order:

| Era | Migrations | What they add |
| :--- | :--- | :--- |
| Core tournament | `20261018`–`20261020` | `profiles`, `tournaments`, `registrations`, capacity and uniqueness |
| Market | `20261021`–`20261023` | `markets`, positions, trades, cooldowns, payouts, resolution; retires fixed-score predictions |
| Auth/RLS | `20261108`–`20261112` | `profiles.role`, auth trigger, RLS, grants, `auth.uid()` RPCs, `trade_requests`, idempotent trades |
| MVP | `20261120`–`20261130` | Tickets, rewards, audit, organizer ownership, match linkage, retention index |
| v3 tenancy | `20261201`–`20261205` | Clubs, members, invites, plans, entitlements, subscriptions, ticket types/orders/transfers, fan cards, nominal ticket RPCs, retention |
| v3 hardening | `20261206`–`20261215` | Security boundary, result binding, ticketing integrity, reward idempotency, subscription limits, privacy retention, ticket payload hash, legacy `CLUB` retirement, ticket-point caps, subscription expiry |




The state-changing functions are `SECURITY DEFINER` with
`search_path = public, pg_temp` and explicit `auth.uid()` checks. v3 functions
also check club membership, role and active entitlement. `resolve_market` is
club-aware and keeps the legacy organizer rule for non-club markets. Direct table
writes are revoked; RLS restricts private reads. The trade lock order is market →
profile → cooldown → position; the purchase lock order is ticket type → event.

`supabase/seed.sql` seeds one legacy live match, its market and one
capacity-limited tournament. `scripts/create-organizer.ts` creates the v3 demo
club, event, ticket type, match and market for local/E2E use.

## 4. Invariants → tests

| Invariant | Enforced in | Tested in |
| :--- | :--- | :--- |
| Tournament capacity and uniqueness | `20261019`, `20261020`; `register_for_tournament` | `tests/invariants/tournament-capacity.test.ts`, `registration-uniqueness.test.ts` |
| Market pricing, lifecycle, resolution, cooldown | `20261021`, `20261022`, `20261207` | `market-pricing.test.ts`, `market-lifecycle.test.ts`, `market-concurrency.test.ts` |
| Authorization and RLS | `20261108`–`20261110`, `20261206` | `authorization.test.ts` |
| Trade idempotency | `20261111`, `20261112` | `idempotency.test.ts` |
| Club tenancy, plans, nominal ticketing, retention | `20261201`–`20261212` | `tests/integration/v3-club-tenancy.test.ts` |
| CLI contract and match-day playbook | `src/cli/`, `src/lib/domain/` | `tests/agent/cli.test.ts` |
| Fault injection | Mutation scripts | `scripts/fault-injection.ts`, `tests/fault-injection/` |

Per-invariant status and evidence: the
[invariant registry](../methodology/checkpoint-A/02-invariants.md). The current
fault-injection record is
[`verification/2026-11-181-fault-injection.md`](../methodology/verification/2026-11-181-fault-injection.md).

## 5. CI and tooling

| Concern | Location |
| :--- | :--- |
| CI | `.github/workflows/ci.yml` — five jobs |
| Scripts | `package.json` — `dev`, `build`, `start`, `lint`, `typecheck`, `test`, `test:agent`, `auth:organizer`, `check:architecture`, `smoke`, `fault:inject`, `maintenance:cleanup`, `maintenance:cleanup-attendees`, `docs:pdf` |
| Architecture guard | `scripts/check-architecture.ts` |
| Smoke test | `scripts/smoke-test.ts` |
| CLI | `src/cli/`; `bun run cli -- ...` |
| Agent playbook | [`../testing/agent-playbook.md`](../testing/agent-playbook.md), `tests/agent/cli.test.ts` |
| Retention | `scripts/cleanup-trade-requests.ts`, `scripts/cleanup-attendee-data.ts` |
| PDF export | `scripts/export-pdf.ts`, `bun run docs:pdf` |
| Operations | [`../operations/runbook.md`](../operations/runbook.md), [`../operations/slo.md`](../operations/slo.md) |
| Local database | `supabase/config.toml`; `bunx supabase start` / `bunx supabase db reset` |
| Container | `Dockerfile`, `docker-compose.yml` |

## 6. Documentation map

| Document | Path |
| :--- | :--- |
| Kata | [`kata.md`](./kata.md) |
| System overview | [`01-system-overview.md`](./01-system-overview.md) |
| Domain model | [`02-domain-model.md`](./02-domain-model.md) |
| Characteristics | [`03-architecture-characteristics.md`](./03-architecture-characteristics.md) |
| Current architecture report | [`reports/2026-11-10.md`](./reports/2026-11-10.md) |
| C4 views | [`05-c4-diagrams.md`](./05-c4-diagrams.md) |
| ADRs | [`adr/`](./adr/) |
| Methodology checkpoints | [`../methodology/reports/2026-11-10.md`](../methodology/reports/2026-11-10.md), [`../methodology/checkpoints/`](../methodology/checkpoints/) |
| Invariant registry | [`../methodology/checkpoint-A/02-invariants.md`](../methodology/checkpoint-A/02-invariants.md) |
| Findings register | [`../methodology/findings-register.md`](../methodology/findings-register.md) |
| Agent playbook | [`../testing/agent-playbook.md`](../testing/agent-playbook.md) |
