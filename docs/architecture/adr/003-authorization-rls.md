# ADR 003: Authentication, authorization and least-privilege grants

- **Status:** Accepted
- **Date:** 2026-11-07
- **Decision owner:** human developer
- **Supersedes:** the `SECURITY INVOKER` implementation note in ADR-002 for state-changing market RPCs
- **Related:** [ADR-001](./001-use-nextjs-and-supabase.md), [ADR-002](./002-live-prediction-market.md), [Checkpoint C risk map](../../methodology/checkpoint-C/01-risk-control-map.md), [INV-05](../../methodology/checkpoint-A/02-invariants.md)

## Context

The first increments deliberately left authentication and authorization out of scope. The result was a database that anyone with the anon key could read and write, including calling `open_trade`, `close_trade` and `resolve_market` as any participant. That is a critical residual risk (FND-001), not a neutral prototype choice: the system moves points and resolves markets, and the domain rule says only an authorized organizer may finalize a result.

The course's quality and review material treats authentication and authorization as separate properties. Authentication establishes who is making a request; authorization decides whether that identity may act on the resource. Hiding a button is not enforcement. The enforcement must sit at the database boundary, not only in the UI.

## Decision

1. **Identity:** Supabase Auth is the identity provider.
2. **Fans:** anonymous sign-in creates a real `auth.users` identity and a `profiles` row with 200 points and role `FAN`.
3. **Organizers:** email/password sign-in; role `ORGANIZER` is assigned by a local administrative script, not by self-service.
4. **Profile link:** `profiles.id` references `auth.users.id` with `ON DELETE CASCADE`; a trigger creates the profile on user creation.
5. **Roles:** `profiles.role` is constrained to `FAN` or `ORGANIZER`.
6. **RLS:** every exposed table has row-level security enabled.
7. **Grants:** direct table writes are revoked from `anon` and `authenticated`. Public read tables are granted explicitly; private tables are readable only by their owner through RLS. Mutations happen only through approved RPCs.
8. **Mutation RPCs:** `register_for_tournament`, `open_trade`, `close_trade` and `resolve_market` are `SECURITY DEFINER` with `SET search_path = public, pg_temp` and explicit `auth.uid()` checks. `resolve_market` additionally requires an organizer profile.
9. **Public trade feed:** a read-only `market_public_trades(p_market_id)` function exposes recent trade data without `user_id` or per-user balance information.
10. **Service role:** used only by local scripts and test setup/teardown; never shipped to the browser, never used by the application runtime.
11. **Market resolution UI:** not part of this decision. Resolution is an RPC/test path; the organizer management UI remains a future increment.

## Alternatives considered

| Option | Why it was rejected |
| :--- | :--- |
| Keep the demo identity and rely on the UI to hide controls | Not authentication and not authorization. The anon key still reaches every table and RPC. |
| `SECURITY INVOKER` RPCs plus broad table grants and RLS | To let the functions update protected tables, the invoker would need table privileges; a caller could then write directly. RLS policies cannot reliably distinguish a function call from a direct write. |
| App-only authorization in Server Actions | A caller can bypass the app and call the database API directly. The rule must hold at the database boundary. |
| `service_role` in the application | Would bypass RLS and expose a privileged key to the server process. It is appropriate for local administration and tests, not for normal request handling. |
| Magic-link email for every fan | Higher friction for a local course demo; anonymous auth gives a real identity with no email loop. Organizers still use email/password. |

## Consequences

- `SECURITY DEFINER` functions are a high-trust boundary. Every function must contain an explicit `auth.uid()` check, a role check where required, input validation and a safe `search_path`. Review and tests are mandatory.
- The database is no longer directly writable through the Data API. The application must use the RPCs, and the tests must use authenticated clients for the real path.
- Existing local data must be reset: the demo profile has no auth identity and profiles gains a foreign key to `auth.users`.
- Anonymous users are real auth users. They consume auth rows and are subject to local auth rate limits; local limits may be raised for tests.
- The public trade feed is a controlled disclosure. It must return only safe columns and must be reviewed when trade data changes.
- The service-role key is a local operational secret. It must stay in `.env.local`/CI, never in `NEXT_PUBLIC_*`, client code, logs or the repository.
- Organizer accounts need a local setup step. There is no self-service organizer sign-up and no organizer management UI yet.
- The authorization suite becomes part of the invariant evidence. A green build without it does not prove the boundary.

## Related

- [`../../methodology/exec-plans/95-authorization-rls.md`](../../methodology/exec-plans/95-authorization-rls.md) — approved execution plan
- [`../01-system-overview.md`](../01-system-overview.md) — current security boundary and data flows
- [`../02-domain-model.md`](../02-domain-model.md) — roles, identity and invariants
- [`../03-architecture-characteristics.md`](../03-architecture-characteristics.md) — security/authorization characteristic
- [`../../methodology/checkpoint-C/05-residual-risk.md`](../../methodology/checkpoint-C/05-residual-risk.md) — RR-01 and its closure evidence

## Update 2026-11-09 — v3 tenancy and entitlements

The database-boundary decision is unchanged. v3 adds a second authorization dimension: a caller must be a club member with the required role and an active subscription entitlement. Platform administration is a separate `platform_admins` capability. The service role remains an operator/fixture/retention credential outside the application runtime. See [ADR-007](./007-club-tenancy-and-entitlements.md) and [ADR-008](./008-platform-admin-and-operator-boundary.md).
