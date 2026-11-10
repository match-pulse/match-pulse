# MatchPulse — Code Map

> **Purpose.** The architecture deliverable must describe the structure of the
> system with references to the code. This map links each element described in
> the [system overview](./01-system-overview.md) and the
> [domain model](./02-domain-model.md) to the exact files, symbols and
> migrations that implement it. It is a navigation aid: where this map and the
> code disagree, the code and the
> [invariants registry](../methodology/checkpoint-A/02-invariants.md) win.

## 1. Runtime structure (Next.js App Router)

| Element | Location | Responsibility |
| :--- | :--- | :--- |
| Root layout | `src/app/layout.tsx` | Shell and metadata |
| Home route | `src/app/page.tsx` | Routes by platform admin, legacy role, club membership or fan |
| Login page | `src/app/login/page.tsx` | Email/password sign-in and fan sign-up; supports `next` |
| Public events | `src/app/events/page.tsx` | Published club events across clubs |
| Event detail/checkout | `src/app/events/[id]/page.tsx`, `src/components/EventCheckout.tsx` | Ticket types, matches, 1–4 attendee checkout |
| Fan tickets | `src/app/fan/tickets/page.tsx` | Nominal tickets, QR image, entry code and name change |
| Fan rewards | `src/app/fan/rewards/page.tsx` | Club-scoped reward list and redemption |
| Club dashboard | `src/app/club/dashboard/page.tsx` | Plan, members, events, sales, fan cards, rewards and insights |
| Club event management | `src/app/club/events/[id]/page.tsx` | Ticket types, matches, attendees, check-in, orders and resolution |
| Club invite | `src/app/club/invite/[token]/page.tsx` | Accept a single-use invitation |
| Admin console | `src/app/admin/page.tsx` | Clubs, plans, subscription status and audit |
| v3 shell | `src/components/V3Shell.tsx` | Fan/club/admin navigation and context |
| Notices | `src/components/Notice.tsx` | Success/error banners |
| Market page (Server Component) | `src/app/market/[id]/page.tsx` | Authenticated market, prices, positions and public trades |
| Market client component | `src/components/MarketTrader.tsx` | Entry/exit form; keeps one request key across retries |
| Health route | `src/app/api/health/route.ts` | Public read-only app/database health signal |
| Legacy club export | `src/app/api/club/export/route.ts` | v2 aggregate CSV |
| ELITE export | `src/app/api/club/export-v3/route.ts` | v3 aggregate sales/prediction CSV, audited |
| Login client component | `src/components/LoginForms.tsx` | Email/password fan sign-up/sign-in and organizer/club sign-in |
| Session proxy | `src/proxy.ts` | Refreshes the Supabase auth cookie on each request |
| CLI | `src/cli/index.ts`, `src/cli/args.ts`, `src/cli/session.ts` | `matchpulse` command tree, profiles and JSON output |
| Shared domain | `src/lib/domain/` | Typed auth, club, event, ticket, prediction, analytics and admin wrappers |
| Viewer seam | `src/lib/viewer.ts` | Profile, club memberships and admin flag for v3 pages |

## 2. Application layer (Server Actions)

| Action | Location | Database call |
| :--- | :--- | :--- |
| Fan sign-up / sign-in / sign-out | `src/app/actions/auth.ts` — `signUpFan`, `signInFan`, `signInOrganizer`, `signInClub`, `signOut` | Supabase Auth |
| Club onboarding / plan | `src/app/actions/v3.ts` — `createClubAction`, `requestPlanAction` | `create_club`, `request_plan_change` |
| Members / fan cards / rewards | `src/app/actions/v3.ts` — `inviteMemberAction`, `acceptInviteAction`, `setMemberRoleAction`, `removeMemberAction`, `issueFanCardAction`, `createRewardAction`, `redeemRewardAction` | `invite_club_member`, `accept_club_invite`, `set_club_member_role`, `remove_club_member`, `issue_club_fan_card`, `create_club_reward`, `redeem_reward` |
| Events / matches / ticket types | `src/app/actions/v3.ts` — `createEventAction`, `createTicketTypeAction`, `publishEventAction`, `createMatchAction`, `updateMatchAction`, `setPredictionAction` | `create_club_event`, `create_ticket_type`, `publish_club_event`, `create_club_match`, `update_club_match`, `set_prediction_enabled` |
| Nominal purchase / transfer / check-in | `src/app/actions/v3.ts` — `purchaseTicketAction`, `transferTicketAction`, `checkInAction` | `purchase_ticket`, `transfer_ticket`, `check_in_ticket` |
| Market resolution | `src/app/actions/v3.ts` — `resolveMarketAction`; CLI `club predictions resolve` | `resolve_market` |
| Analytics export | `src/app/api/club/export-v3/route.ts` | `club_sales_summary`, `club_prediction_insights`, `record_club_export` |
| Admin plan/status | `src/app/actions/v3.ts` — `assignPlanAction` | `admin_assign_plan` |
| Fan prediction entry/exit | `src/app/actions/market.ts` — `enterPosition`, `exitPosition` | `open_trade` / `close_trade` with `p_request_id` |
| Legacy registration | `src/app/actions/register.ts` — `registerForTournament` | `register_for_tournament` |

Cross-cutting seams:

- **Identity:** `src/lib/session.ts` — `getCurrentUser()` reads the Supabase Auth session; `requireUser()` redirects unauthenticated page requests to `/login`; `src/lib/viewer.ts` adds club memberships and the admin flag. The database RPCs independently resolve the caller with `auth.uid()`.
- **Database client:** `src/lib/supabase/server.ts` — a cookie-based `@supabase/ssr` client using `NEXT_PUBLIC_SUPABASE_URL` and the anon key. No service-role key is used by the application runtime.
- **Shared domain:** `src/lib/domain/` — typed RPC/read wrappers and error mapping used by the v3 Server Actions and the CLI. The CLI never imports Server Actions.
- **CLI profiles:** `src/cli/session.ts` — email/password login, `~/.config/matchpulse/<profile>.json` with `0600`, and a separate user session per actor.
- **Logging:** `src/lib/logger.ts` — JSON lines to stdout/stderr for health and key action failures; no tokens, keys, emails or form bodies.
- **Service role:** local fixtures (`scripts/create-organizer.ts`), the attendee-retention script and test setup only. It is never imported by `src/`.
- **Input validation:** the Server Actions and CLI validate input before it reaches the database; the database functions re-enforce every rule regardless.

## 3. Database (schema of record)

Migrations in `supabase/migrations/`, replayed in filename order:

| Migration | Tables created | Functions defined |
| :--- | :--- | :--- |
| `20261018_init.sql` | `matches`, `profiles`, `tournaments`, `registrations`, `predictions` (retired later) | `submit_prediction` (retired) |
| `20261019_registration_integrity.sql` | — (adds `registrations_tournament_user_unique`) | `register_for_tournament` |
| `20261020_tournament_counter_not_null.sql` | — (`current_players` set `NOT NULL`) | — |
| `20261021_market_core.sql` | `markets`, `market_positions`, `market_trades`, `market_entry_cooldowns` | `market_cooldown_seconds`, `market_cost`, `market_price`, `open_trade`, `close_trade` |
| `20261022_market_resolution.sql` | `market_payouts` | `resolve_market` |
| `20261023_retire_predictions.sql` | — (drops `predictions`) | drops `submit_prediction` |
| `20261108_auth_profiles.sql` | — (`profiles.role`, auth FK, registration FK) | `handle_new_user`, auth-user trigger |
| `20261109_rls_grants.sql` | — (RLS policies and grants) | `market_public_trades` |
| `20261110_rpc_auth.sql` | — | `register_for_tournament`, `open_trade`, `close_trade`, `resolve_market` with auth checks |
| `20261111_trade_requests.sql` | `trade_requests` | — |
| `20261112_idempotent_rpcs.sql` | — | `open_trade`/`close_trade` with request-key replay; drops the 3-arg versions |
| `20261120_mvp_schema.sql` | `tickets`, `rewards`, `reward_redemptions`, `audit_events`; adds `CLUB`, organizer ownership, match linkage/scores, ticket allocation | — |
| `20261121_mvp_rls.sql` | — (RLS and grants for the MVP tables) | — |
| `20261122_mvp_rpcs.sql` | — | organizer tournament/match CRUD, ticket claim, reward redemption, club analytics, export audit, ownership-aware `resolve_market` |
| `20261130_trade_request_retention.sql` | — (partial index) | `cleanup_completed_trade_requests` |
| `20261201_v3_club_tenancy.sql` | `clubs`, `club_members`, `club_invites`, `platform_admins`, `plans`, `plan_entitlements`, `club_subscriptions`, `club_plan_requests`, `ticket_types`, `ticket_orders`, `ticket_transfers`, `club_fan_cards`; extends tickets, tournaments, matches, rewards, audit | `enforce_prediction_enabled` |
| `20261202_v3_club_rls.sql` | public views, RLS and grants | `require_auth`, `is_platform_admin`, `is_club_member`, `has_club_role`, `has_entitlement`, `entitlement_limit`, `require_entitlement`, `require_club_role`, `club_id_for_event`, `require_event_role` |
| `20261203_v3_club_rpcs.sql` | — | club/plan/member/event/match/admin RPCs |
| `20261204_v3_ticketing_rpcs.sql` | — | nominal purchase, transfer, check-in, attendees, orders, analytics, rewards, fan cards, club-aware `resolve_market` |
| `20261205_v3_attendee_retention.sql` | — | `cleanup_expired_attendee_data` |
| `20261206_security_boundary.sql` | — (RLS policy corrections) | — |
| `20261207_market_result_binding.sql` | — (trigger-based market guards) | `enforce_prediction_enabled`, `enforce_market_window`, `enforce_market_resolution`, `enforce_match_result_integrity` |
| `20261208_ticketing_integrity.sql` | — (ticket-order/tournament/ticket triggers) | `enforce_ticket_buyer_limit`, `enforce_event_capacity_config`, `enforce_ticket_capacity`; `claim_ticket`/`register_for_tournament` legacy guard |
| `20261209_reward_idempotency.sql` | `reward_redemptions.request_id`, `points_after` | `redeem_reward` replay/refusal semantics |
| `20261210_subscription_limits.sql` | — | `invite_club_member`, `accept_club_invite`, `create_club_event` active-entitlement checks and subscription locks |
| `20261211_privacy_retention.sql` | `ticket_transfers` nullable identity columns | `cleanup_expired_attendee_data`, `issue_club_fan_card`, `club_prediction_insights`, `club_prediction_timeseries` |
| `20261212_ticket_payload_hash.sql` | — (ticket order payload fingerprint) | `purchase_ticket` payload-aware replay |
| `20261215_subscription_expiry.sql` | `pg_cron` schedule; subscription period-end checks | `has_entitlement`, `entitlement_limit`, `expire_subscriptions`, admin club list |

`supabase/seed.sql` seeds one legacy LIVE match, its `b = 100` market and one capacity-limited tournament. It does **not** seed a profile: profiles are created by the auth trigger. `scripts/create-organizer.ts` creates the v3 demo club, event, ticket type, match and market for local/E2E use.

The state-changing functions are `SECURITY DEFINER` with `search_path = public, pg_temp` and explicit `auth.uid()` checks. v3 functions additionally check club membership, role and the active subscription entitlement. `resolve_market` is club-aware and keeps the legacy organizer rule for non-club markets. Direct table writes are revoked; RLS restricts private reads to the owner or club. The lock order remains market → profile → cooldown → position for trades, and ticket type → event for purchases (ADR-002/003/010).

## 4. Invariants → enforcement → tests

| Invariant | Enforced in | Tested in |
| :--- | :--- | :--- |
| INV-01 tournament capacity | `register_for_tournament` + CHECK constraints (`20261019`, `20261020`); authenticated caller | `tests/invariants/tournament-capacity.test.ts` |
| INV-02 registration uniqueness | `registrations_tournament_user_unique` + exception handling (`20261019`) | `tests/invariants/registration-uniqueness.test.ts` |
| M-INV1 – M-INV8 market invariants | `20261021_market_core.sql`, `20261022_market_resolution.sql`, `20261110_rpc_auth.sql`, `20261207_market_result_binding.sql` | `tests/invariants/market-pricing.test.ts`, `market-lifecycle.test.ts`, `market-concurrency.test.ts` |
| INV-05 / A-INV1 – A-INV5 authorization | `20261108_auth_profiles.sql`, `20261109_rls_grants.sql`, `20261110_rpc_auth.sql` | `tests/invariants/authorization.test.ts` |
| M-INV9 request-key idempotency | `20261111_trade_requests.sql`, `20261112_idempotent_rpcs.sql` | `tests/invariants/idempotency.test.ts` |
| Three-role MVP backend | `20261120_mvp_schema.sql`, `20261121_mvp_rls.sql`, `20261122_mvp_rpcs.sql` | `tests/integration/mvp-backend.test.ts` |
| Club tenancy, plans and entitlements | `20261201_v3_club_tenancy.sql`, `20261202_v3_club_rls.sql`, `20261203_v3_club_rpcs.sql` | `tests/integration/v3-club-tenancy.test.ts` |
| Nominal ticketing, transfer, check-in, box office, insights | `20261201_v3_club_tenancy.sql`, `20261204_v3_ticketing_rpcs.sql` | `tests/integration/v3-club-tenancy.test.ts` |
| CLI contract and match-day playbook | `src/cli/`, `src/lib/domain/` | `tests/agent/cli.test.ts` |
| Attendee retention | `20261205_v3_attendee_retention.sql` | `tests/integration/v3-club-tenancy.test.ts` |

Per-invariant statuses, targets and fault-injection evidence: [`02-invariants.md`](../methodology/checkpoint-A/02-invariants.md).

## 5. CI and tooling

| Concern | Location |
| :--- | :--- |
| CI | `.github/workflows/ci.yml` — five jobs: "Lint, typecheck and build", "Domain invariants", "Delivery and recovery", "Fault injection", "E2E and accessibility" |
| Scripts | `package.json` — `dev`, `build`, `start`, `lint`, `typecheck`, `test`, `test:agent`, `auth:organizer`, `check:architecture`, `smoke`, `maintenance:cleanup`, `maintenance:cleanup-attendees`, `docs:pdf` |
| Architecture guards | `scripts/check-architecture.ts` — service-role, direct-mutation, client/server import and mutation-RPC checks; runs in CI |
| Smoke test | `scripts/smoke-test.ts` — health, login and unauthenticated home redirect against a running app |
| CLI | `src/cli/index.ts`, `src/cli/args.ts`, `src/cli/session.ts`; `bun run cli -- ...` |
| Agent playbook | [`../testing/agent-playbook.md`](../testing/agent-playbook.md), `tests/agent/cli.test.ts` |
| Retention | `scripts/cleanup-trade-requests.ts`, `scripts/cleanup-attendee-data.ts` |
| PDF export | `scripts/export-pdf.ts`, `bun run docs:pdf` |
| Operations | [`../operations/runbook.md`](../operations/runbook.md), [`../operations/slo.md`](../operations/slo.md) |
| Delivery/observability pre-read | [`../methodology/checkpoint-E/README.md`](../methodology/checkpoint-E/README.md) |
| Local database | `supabase/config.toml`; `bunx supabase start` / `bunx supabase db reset` |
| Container | `Dockerfile`, `docker-compose.yml` |

## 6. Documentation map

| Document | Path |
| :--- | :--- |
| Kata (domain scope) | [`kata.md`](./kata.md) |
| System overview (purpose, users, data flows) | [`01-system-overview.md`](./01-system-overview.md) |
| Domain model (entities, relationships, journeys) | [`02-domain-model.md`](./02-domain-model.md) |
| Characteristics and measures | [`03-architecture-characteristics.md`](./03-architecture-characteristics.md) |
| Dated architecture report | [`reports/2026-11-08.md`](./reports/2026-11-08.md) plus the 2026-11-09 v3 addendum |
| C4 views (context, containers, components) | [`05-c4-diagrams.md`](./05-c4-diagrams.md) |
| Decisions | [`adr/`](./adr/) — ADR-003 authorization, ADR-007 tenancy, ADR-008 platform admin, ADR-009 email/password, ADR-010 nominal ticketing |
| Competitive landscape | [`../product/competitive-landscape.md`](../product/competitive-landscape.md) |
| Execution plan v3.0.0 | [`../methodology/exec-plans/153-v3-club-subscriptions.md`](../methodology/exec-plans/153-v3-club-subscriptions.md) |
| Agent playbook and capability manifest | [`../testing/agent-playbook.md`](../testing/agent-playbook.md), [`../testing/capabilities.md`](../testing/capabilities.md) |
| Invariants registry and evidence | [`../methodology/checkpoint-A/02-invariants.md`](../methodology/checkpoint-A/02-invariants.md) |
| Authorization verification | [`../methodology/verification/2026-11-95-authorization-rls.md`](../methodology/verification/2026-11-95-authorization-rls.md) |
| Methodology checkpoints | [`../methodology/`](../methodology/) |
| Checkpoint D pre-read | [`../methodology/checkpoint-D/README.md`](../methodology/checkpoint-D/README.md) |
| Checkpoint E pre-read | [`../methodology/checkpoint-E/README.md`](../methodology/checkpoint-E/README.md) |
| Agent instructions and governance | [`../../AGENTS.md`](../../AGENTS.md) |
