# MatchPulse — Code Map

> **Purpose.** The architecture deliverable must describe the structure of the
> system with references to the code. This map links each element described in
> [`01-system-overview.md`](./01-system-overview.md) to the exact files, symbols
> and migrations that implement it. It is a navigation aid: where this map and
> the code disagree, the code and the
> [invariants registry](../methodology/checkpoint-A/02-invariants.md) win.

## 1. Runtime structure (Next.js App Router)

| Element | Location | Responsibility |
| :--- | :--- | :--- |
| Root layout | `src/app/layout.tsx` | Shell, metadata, top bar |
| Home route | `src/app/page.tsx` | Redirects to the demo market |
| Market page (Server Component) | `src/app/market/[id]/page.tsx` | Loads the market, reads prices via the `market_price` RPC, renders the trader |
| Tournament page (Server Component) | `src/app/tournaments/[id]/page.tsx` | Tournament detail and registration entry point |
| Market client component | `src/components/MarketTrader.tsx` | Entry/exit form; renders prices and holdings |
| Registration form | `src/components/RegistrationForm.tsx` | Registration form bound to the Server Action |
| Top bar | `src/components/TopBar.tsx` | Demo identity and points display |

## 2. Application layer (Server Actions)

| Action | Location | Database call |
| :--- | :--- | :--- |
| Enter a market position | `src/app/actions/market.ts` — `enterPosition` | `open_trade` |
| Exit a position | `src/app/actions/market.ts` — `exitPosition` | `close_trade` |
| Register for a tournament | `src/app/actions/register.ts` — `registerForTournament` | `register_for_tournament` |

Cross-cutting seams:

- **Identity:** `src/lib/session.ts` — `getCurrentUserId()` resolves a fixed demo identity on the server. It is the single place the system reads the caller from, and it is explicitly **not authentication** (INV-05).
- **Database client:** `src/lib/supabase.ts` — one Supabase client built from `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`. Only an anon key is used; no service-role key exists in the repository.
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

`supabase/seed.sql` seeds the demo profile (200 points), one LIVE match and its `b = 100` market.

The state-changing functions (`open_trade`, `close_trade`, `resolve_market`) are `SECURITY INVOKER` and lock the market row before the profile, cooldown and position rows (ADR-002). Grants and RLS are **not implemented**: every exposed table is currently reachable with the anon key (INV-05).

## 4. Invariants → enforcement → tests

| Invariant | Enforced in | Tested in |
| :--- | :--- | :--- |
| INV-01 tournament capacity | `register_for_tournament` + CHECK constraints (`20261019`, `20261020`) | `tests/invariants/tournament-capacity.test.ts` |
| INV-02 registration uniqueness | `registrations_tournament_user_unique` + exception handling (`20261019`) | `tests/invariants/registration-uniqueness.test.ts` |
| M-INV1 – M-INV8 market invariants | `20261021_market_core.sql`, `20261022_market_resolution.sql` | `tests/invariants/market-pricing.test.ts`, `market-lifecycle.test.ts`, `market-concurrency.test.ts` |

Per-invariant statuses, targets and fault-injection evidence: [`02-invariants.md`](../methodology/checkpoint-A/02-invariants.md).

## 5. CI and tooling

| Concern | Location |
| :--- | :--- |
| CI | `.github/workflows/ci.yml` — jobs "Lint, typecheck and build" and "Domain invariants" |
| Scripts | `package.json` — `dev`, `build`, `start`, `lint`, `typecheck`, `test` |
| Local database | `supabase/config.toml`; `bunx supabase start` / `bunx supabase db reset` |
| Container | `Dockerfile`, `docker-compose.yml` |

## 6. Documentation map

| Document | Path |
| :--- | :--- |
| Kata (domain scope) | [`kata.md`](./kata.md) |
| System overview and journeys | [`01-system-overview.md`](./01-system-overview.md) |
| Characteristics and measures | [`02-architecture-characteristics.md`](./02-architecture-characteristics.md) |
| Decisions | [`adr/`](./adr/) |
| Invariants registry and evidence | [`../methodology/checkpoint-A/02-invariants.md`](../methodology/checkpoint-A/02-invariants.md) |
| Methodology checkpoints | [`../methodology/`](../methodology/) |
| Agent instructions and governance | [`../../AGENTS.md`](../../AGENTS.md) |
