# Verification — Authorization, RLS and Grants

- **Date:** 2026-11-07
- **Issue:** #95
- **PR:** #96
- **Status:** Verified in CI for the local Supabase/PostgreSQL environment.
- **Related:** [ADR-003](../../architecture/adr/003-authorization-rls.md), [execution plan](../exec-plans/95-authorization-rls.md), [invariant registry](../checkpoint-A/02-invariants.md), [Checkpoint C residual risk](../checkpoint-C/05-residual-risk.md)

## 1. What was verified

- Anonymous visitors can read public tournaments, matches, markets and the
  public trade feed, but cannot read private tables or execute mutations.
- A fan can read only their own profile, registration, positions, trades,
  payouts and cooldown.
- A fan cannot resolve a market; an organizer can.
- Direct table writes are denied for `anon` and `authenticated`.
- The public trade feed returns no `user_id` or `points_after`.
- An anonymous fan is a real auth user with a profile and can trade on it.
- The pre-existing capacity, uniqueness, pricing, lifecycle and concurrency
  invariants still hold through authenticated clients.

## 2. Environment

- GitHub Actions `ubuntu-latest`.
- Supabase local stack, PostgreSQL 17.
- Migrations replayed from an empty schema by `supabase db reset`; seed applied.
- Bun 1.4.2 in CI.
- The service role is used only for test setup/reads; the application runtime
  uses the cookie-based anon client.

## 3. Commands and observed results

| Command | Result |
| :--- | :--- |
| `bun install --frozen-lockfile` | Passed; `@supabase/ssr@0.12.7` installed. |
| `bun run lint` | Passed. |
| `bun run build` | Passed; `/login` dynamic, market/tournament partial-prerender. |
| `bun run typecheck` | Passed after the Next build generated route types. |
| CI "Lint, typecheck and build" | Passed in 24s. |
| CI "Domain invariants" | Passed in 2m13s. |
| Test summary | **21 pass, 0 fail, 205 expect() calls, 6 files.** |

CI run: [42397891717](https://github.com/match-pulse/match-pulse/actions/runs/42397891717)

### Authorization suite

```text
(pass) authorization boundary > anonymous can read public data but cannot read private tables or execute mutations
(pass) authorization boundary > a fan can read only their own private rows
(pass) authorization boundary > a fan cannot resolve a market; an organizer can
(pass) authorization boundary > direct table writes are denied for an authenticated fan
(pass) authorization boundary > the public trade feed exposes trades without identity
(pass) authorization boundary > an anonymous fan is a real auth user and can trade on their own profile
```

### Existing invariants

The capacity, uniqueness, pricing, lifecycle and concurrency suites all passed
through authenticated clients, including the 100-request capacity burst and the
cross-market double-spend race. The test rewrite preserved the assertions; it
changed the identity boundary, not the invariant definitions.

## 4. Security review notes

- Every mutation RPC is `SECURITY DEFINER` with `SET search_path = public, pg_temp`.
- `register_for_tournament`, `open_trade` and `close_trade` check `auth.uid()`.
- `resolve_market` checks `auth.uid()` and `profiles.role = 'ORGANIZER'`.
- Execute is revoked from `PUBLIC` and `anon` for mutation RPCs; authenticated
  users may call them.
- Direct table writes are revoked from `anon` and `authenticated`; there are no
  insert/update/delete policies.
- Private reads are owner-only through RLS.
- `market_public_trades` is a read-only definer function returning safe columns.
- The service role has explicit local grants but is not imported by `src/` and is
  not shipped to the browser.

## 5. Limits and unverified claims

- Local Supabase/PostgreSQL only; no production deployment, session hardening,
  rate-limit tuning or backup/recovery evidence.
- No load or p95 measurement.
- No organizer management UI; resolution is exercised through the RPC and tests.
- No idempotency keys; a retry after cooldown remains a new entry.
- No fine-grained club-analytics privacy rule; analytics is not implemented.
- The authorization suite does not exhaustively test every PostgREST path or
  every JWT/session edge case.

## 6. Findings

- **FND-001** is verified for the platform boundary; see the [findings register](../findings-register.md).
- **FND-005** (test independence) is fixed: the capacity suite is one
  self-contained scenario and the uniqueness tests each create their own user
  and tournament.
- FND-002, FND-003, FND-004, FND-006, FND-007 and FND-008 remain open.

## 7. Decision

The authorization increment is accepted for the local course environment. The
remaining residual risks are recorded in the [Checkpoint C residual-risk
record](../checkpoint-C/05-residual-risk.md); none is implicitly accepted by
this verification.
