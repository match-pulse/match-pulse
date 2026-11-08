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
| Home route | `src/app/page.tsx` | Redirects to the demo market |
| Login page | `src/app/login/page.tsx` | Fan and organizer entry point; redirects an existing session |
| Market page (Server Component) | `src/app/market/[id]/page.tsx` | Loads the authenticated user's market, prices, positions and public trades |
| Tournament page (Server Component) | `src/app/tournaments/[id]/page.tsx` | Tournament detail and authenticated registration entry point |
| Market client component | `src/components/MarketTrader.tsx` | Entry/exit form; renders prices and holdings; keeps one request key across retries |
| Health route | `src/app/api/health/route.ts` | Public read-only app/database health signal; no sensitive data |
| Registration form | `src/components/RegistrationForm.tsx` | Registration form bound to the Server Action |
| Login client component | `src/components/LoginForms.tsx` | Fan anonymous sign-in and organizer password sign-in |
| Top bar | `src/components/TopBar.tsx` | Authenticated username, points and sign-out |
| Session proxy | `src/proxy.ts` | Refreshes the Supabase auth cookie on each request |

## 2. Application layer (Server Actions)

| Action | Location | Database call |
| :--- | :--- | :--- |
| Sign in as fan / organizer | `src/app/actions/auth.ts` — `signInAnonymously`, `signInOrganizer` | Supabase Auth |
| Sign out | `src/app/actions/auth.ts` — `signOut` | Supabase Auth |
| Enter a market position | `src/app/actions/market.ts` — `enterPosition` | `open_trade` with `p_request_id` |
| Exit a position | `src/app/actions/market.ts` — `exitPosition` | `close_trade` with `p_request_id` |
| Register for a tournament | `src/app/actions/register.ts` — `registerForTournament` | `register_for_tournament` |

Cross-cutting seams:

- **Identity:** `src/lib/session.ts` — `getCurrentUser()` reads the Supabase Auth session; `requireUser()` redirects unauthenticated page requests to `/login`. The database RPCs independently resolve the caller with `auth.uid()`.
- **Database client:** `src/lib/supabase/server.ts` — a cookie-based `@supabase/ssr` client using `NEXT_PUBLIC_SUPABASE_URL` and the anon key. No service-role key is used by the application runtime.
- **Logging:** `src/lib/logger.ts` — JSON lines to stdout/stderr for health and key action failures; no tokens, keys, emails or form bodies.
- **Service role:** local `scripts/create-organizer.ts` and test setup only. It is never imported by `src/`.
- **Input validation:** the Server Actions validate form input before it reaches the database; the database functions re-enforce every rule regardless.

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

`supabase/seed.sql` seeds one LIVE match, its `b = 100` market and one capacity-limited tournament. It does **not** seed a profile: profiles are created by the auth trigger when a user signs in.

The state-changing functions (`register_for_tournament`, `open_trade`, `close_trade`, `resolve_market`) are `SECURITY DEFINER` with `search_path = public, pg_temp` and explicit `auth.uid()` checks; `resolve_market` additionally checks the organizer role. `open_trade`/`close_trade` claim a `trade_requests` key before the trade and replay or refuse a duplicate. Direct table writes are revoked; RLS restricts private reads to the owner. The lock order remains market → profile → cooldown → position (ADR-002, superseded implementation note in ADR-003).

## 4. Invariants → enforcement → tests

| Invariant | Enforced in | Tested in |
| :--- | :--- | :--- |
| INV-01 tournament capacity | `register_for_tournament` + CHECK constraints (`20261019`, `20261020`); authenticated caller | `tests/invariants/tournament-capacity.test.ts` |
| INV-02 registration uniqueness | `registrations_tournament_user_unique` + exception handling (`20261019`) | `tests/invariants/registration-uniqueness.test.ts` |
| M-INV1 – M-INV8 market invariants | `20261021_market_core.sql`, `20261022_market_resolution.sql`, `20261110_rpc_auth.sql` | `tests/invariants/market-pricing.test.ts`, `market-lifecycle.test.ts`, `market-concurrency.test.ts` |
| INV-05 / A-INV1 – A-INV5 authorization | `20261108_auth_profiles.sql`, `20261109_rls_grants.sql`, `20261110_rpc_auth.sql` | `tests/invariants/authorization.test.ts` |
| M-INV9 request-key idempotency | `20261111_trade_requests.sql`, `20261112_idempotent_rpcs.sql` | `tests/invariants/idempotency.test.ts` |

Per-invariant statuses, targets and fault-injection evidence: [`02-invariants.md`](../methodology/checkpoint-A/02-invariants.md).

## 5. CI and tooling

| Concern | Location |
| :--- | :--- |
| CI | `.github/workflows/ci.yml` — jobs "Lint, typecheck and build", "Domain invariants" and "Delivery smoke" |
| Scripts | `package.json` — `dev`, `build`, `start`, `lint`, `typecheck`, `test`, `auth:organizer`, `check:architecture`, `smoke` |
| Architecture guards | `scripts/check-architecture.ts` — service-role, direct-mutation, client/server import and RPC-definer checks; runs in CI |
| Smoke test | `scripts/smoke-test.ts` — health, login and unauthenticated home redirect against a running app |
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
| C4 views (context, containers, components) | [`05-c4-diagrams.md`](./05-c4-diagrams.md) |
| Decisions | [`adr/`](./adr/) — ADR-003 is the authorization model |
| Invariants registry and evidence | [`../methodology/checkpoint-A/02-invariants.md`](../methodology/checkpoint-A/02-invariants.md) |
| Authorization verification | [`../methodology/verification/2026-11-95-authorization-rls.md`](../methodology/verification/2026-11-95-authorization-rls.md) |
| Methodology checkpoints | [`../methodology/`](../methodology/) |
| Checkpoint D pre-read | [`../methodology/checkpoint-D/README.md`](../methodology/checkpoint-D/README.md) |
| Checkpoint E pre-read | [`../methodology/checkpoint-E/README.md`](../methodology/checkpoint-E/README.md) |
| Agent instructions and governance | [`../../AGENTS.md`](../../AGENTS.md) |
