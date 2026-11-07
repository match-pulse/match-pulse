# Execution Plan — Authentication, Authorization, RLS and Grants

- **Status:** Executed and verified in CI (2026-11-07). See [verification record](../verification/2026-11-95-authorization-rls.md).
- **Issue:** #95
- **Branch:** `feat/95-authorization-rls`
- **Decision owner:** Human developer
- **Risk level:** High — authentication, authorization, schema and security boundary
- **Related:** [AGENTS.md](../../../AGENTS.md), [Checkpoint C risk map](../checkpoint-C/01-risk-control-map.md), [Checkpoint C residual risk](../checkpoint-C/05-residual-risk.md), [INV-05](../checkpoint-A/02-invariants.md), [ADR-001](../../architecture/adr/001-use-nextjs-and-supabase.md), [ADR-002](../../architecture/adr/002-live-prediction-market.md)

## 1. Intent and affected users

MatchPulse currently has no authentication or authorization. The anon key can read and write every table and call every RPC, including `resolve_market`. That is a critical residual risk (FND-001) and it contradicts the repository's own rule that only authorized organizers may finalize results.

This increment makes the database a real authorization boundary:

- **Anonymous visitor:** may read public tournament, match, market and public-trade data. Cannot read private profiles/positions/trades/payouts and cannot execute mutations.
- **Fan:** signs in, receives a profile and 200 points, can register, enter and exit positions, and read only their own private data. Cannot act as another user and cannot resolve markets.
- **Organizer:** can resolve markets. The organizer role is assigned locally, not by the fan.
- **Operator/developer:** can reproduce the setup, run the tests, and see the security evidence.

## 2. Current state and evidence

- `profiles.id` is a bare UUID with no link to `auth.users`.
- `getCurrentUserId()` returns a fixed demo UUID; it is not authentication.
- No RLS policies, no grants and no role model.
- `register_for_tournament`, `open_trade` and `close_trade` take `p_user_id` from the caller and are `SECURITY INVOKER`.
- `resolve_market` has no caller check.
- Tests use the anon key and direct table writes; they depend on the open database.
- CI runs the invariant suites with `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` only.
- The market page shows all recent trades with `user_id` excluded from the UI but present in the table.
- The seeded demo profile `00000000-0000-0000-0000-000000000000` has no auth identity.

Evidence: [Checkpoint C risk map](../checkpoint-C/01-risk-control-map.md) R-01; [residual risk](../checkpoint-C/05-residual-risk.md) RR-01; [invariant registry](../checkpoint-A/02-invariants.md) INV-05.

## 3. Prior records reviewed

- `AGENTS.md` domain guardrails and human gates.
- `README.md` known gaps and current status.
- Checkpoint A invariant registry, product claims and bounded proposal.
- Checkpoint B operating model and SDLC decision.
- Checkpoint C risk control map, review decisions and residual risk.
- ADR-001 and ADR-002.
- `docs/architecture/01-system-overview.md`, `02-domain-model.md`, `03-architecture-characteristics.md`, `04-code-map.md` and `05-c4-diagrams.md`.
- All migrations, RPC definitions, Server Actions and invariant tests.
- Course L09/L10 quality, authorization and test-design material; L11 review/AI.

## 4. Scope

### Included

- Supabase Auth as the identity provider.
- Anonymous fan sign-in and email/password organizer sign-in.
- `profiles.role` (`FAN` / `ORGANIZER`) and an auth-user profile trigger.
- Foreign key from `profiles.id` to `auth.users.id`.
- RLS on every exposed table, with least-privilege grants.
- Direct table writes revoked from `anon` and `authenticated`.
- State-changing RPCs converted to `SECURITY DEFINER` with explicit `auth.uid()` and organizer checks.
- A public trade feed that exposes trades without `user_id`.
- Cookie-based Supabase server client and a minimal login/sign-out flow.
- Rewritten invariant tests using authenticated clients and an admin client for setup.
- New authorization test suite.
- CI service-role credentials for test setup only.
- ADR-003, invariant registry, README, architecture docs, Checkpoint C residual-risk addendum, findings register update, AI log, changelog and verification record.

### Non-goals

- Organizer management UI (creating tournaments, matches, resolving from the browser).
- Reward redemption, club analytics, ticket sales, brackets.
- Idempotency keys, load/p95 testing, deployment and production hardening.
- Multi-tenant roles, fine-grained club permissions, audit-log product features.
- Changing the domain rules for capacity, pricing, cooldown or payouts.

## 5. Assumptions and uncertainty

- Supabase local Auth supports anonymous sign-ins and email/password sign-ins.
- The app can use `@supabase/ssr` with Next.js 16 App Router and Server Actions.
- A local `db reset` is acceptable; the database is a development environment.
- The demo profile can be removed; the seeded tournament and market remain.
- The service role key is available locally and in CI, and is never shipped to the browser.
- The 100-user capacity test can create 100 auth users and sign them in within the CI timeout; local auth rate limits may need raising.
- Organizer accounts are created by a local script; no self-service organizer sign-up.
- The market page may show public trades without identity; that is acceptable for the course demo.

## 6. Decisions requiring approval

| ID | Decision | Why | Consequence |
| --- | --- | --- | --- |
| **D1** | Use Supabase Auth as the identity provider. | It is already the database platform; it gives `auth.uid()` and JWT integration. | Adds auth configuration and a server-side cookie client. |
| **D2** | Fans sign in anonymously; organizers use email/password. | Anonymous fans keep the demo friction low; organizers need a real role. | Anonymous users are real auth users; organizer accounts need a local setup script. |
| **D3** | `profiles.id` references `auth.users.id`; a trigger creates the profile. | Identity must be a real auth identity, not a caller-supplied UUID. | Existing orphan/demo profiles must be removed; local reset required. |
| **D4** | `profiles.role` is `FAN` or `ORGANIZER`; only organizers may resolve. | The domain rule names an authorized organizer. | Role assignment is local/administrative; no fan self-promotion. |
| **D5** | Enable RLS and revoke direct table writes from `anon`/`authenticated`. | RLS alone is not enough if direct table grants remain. | All mutations must go through approved RPCs. |
| **D6** | State-changing RPCs become `SECURITY DEFINER` with `search_path = public, pg_temp` and explicit `auth.uid()`/role checks. | Invoker functions cannot update protected tables without broad grants; DEFINER lets us keep table writes closed. | This supersedes the `SECURITY INVOKER` note in ADR-002. New ADR-003 required. |
| **D7** | Expose recent trades through a read-only `market_public_trades` function without `user_id`. | The page needs a public trade feed; the private table must stay private. | The function is a controlled read surface; it must be reviewed. |
| **D8** | Tests use the service role for setup/teardown and authenticated clients for RPC calls. | This exercises the real authorization boundary without exposing the service key to the app. | CI/README must provide `SUPABASE_SERVICE_ROLE_KEY`; tests are slower. |
| **D9** | No organizer management UI in this increment. | It expands scope and UI risk; the database rule and tests are the evidence. | Resolving a market is done via the RPC/script/test, documented as a non-goal. |

## 7. Acceptance criteria

| ID | Criterion | Verification |
| --- | --- | --- |
| **AC-1** | Anonymous can read public tournaments, matches, markets and the public trade feed. | Authorization suite |
| **AC-2** | Anonymous cannot read profiles, registrations, positions, trades or payouts; cannot execute mutations. | Authorization suite |
| **AC-3** | A fan can sign in anonymously, receives a profile with 200 points, registers, enters and exits, and reads own data. | Authorization suite + manual smoke |
| **AC-4** | A fan cannot read another fan's profile, positions, trades or payouts. | Authorization suite |
| **AC-5** | A fan cannot resolve a market; an organizer can. | Authorization suite |
| **AC-6** | Direct insert/update/delete on protected tables is denied for anon and authenticated. | Authorization suite |
| **AC-7** | The existing invariant suites pass using authenticated clients; the invariants still hold. | CI |
| **AC-8** | The 100-request capacity scenario still accepts exactly 32 of 100. | Updated capacity suite |
| **AC-9** | No service-role key appears in client code, the browser bundle, logs or the repository. | Secret scan + code review |
| **AC-10** | README setup, login and organizer creation are reproducible by another person. | Manual run + README review |
| **AC-11** | Lint, typecheck, build and all tests pass in CI. | CI |
| **AC-12** | ADR-003, invariant registry, README, Checkpoint C residual risk and findings register reflect the new state. | Documentation review |

## 8. Work breakdown

| Slice | Work | Main paths | Owner |
| --- | --- | --- | --- |
| **I1 — Plan and ADR** | Approve this plan; write ADR-003 and the security threat model. | `docs/architecture/adr/003-authorization-rls.md`, this plan | Architect + human |
| **I2 — Schema and identity** | Add `profiles.role`, FK to `auth.users`, profile trigger; remove the demo profile from seed. | `supabase/migrations/20261108_auth_profiles.sql`, `supabase/seed.sql` | Implementer |
| **I3 — RLS and grants** | Enable RLS, revoke direct writes, add own-row policies, grant public reads, add the public trade function. | `supabase/migrations/20261109_rls_grants.sql` | Implementer |
| **I4 — RPC authorization** | Convert mutation RPCs to `SECURITY DEFINER`, use `auth.uid()`, add organizer check, revoke anon execute. | `supabase/migrations/20261110_rpc_auth.sql` | Implementer |
| **I5 — App auth** | Add `@supabase/ssr`, server client, session seam, auth actions, login page, sign-out, page/action updates. | `src/lib/supabase/server.ts`, `src/lib/session.ts`, `src/app/actions/auth.ts`, `src/app/login/page.tsx`, page/action files | Implementer |
| **I6 — Public trade feed** | Replace the market page's all-trades query with the public RPC; keep the table private. | `src/app/market/[id]/page.tsx` | Implementer |
| **I7 — Test infrastructure** | Add admin/auth client helper; rewrite the five invariant suites; add the authorization suite; raise local auth rate limits for tests. | `tests/support/`, `tests/invariants/`, `supabase/config.toml` | Test engineer |
| **I8 — CI** | Add `SUPABASE_SERVICE_ROLE_KEY` to the test environment; keep it out of the build. | `.github/workflows/ci.yml` | DevOps |
| **I9 — Docs and evidence** | Update README, system overview, domain model, characteristics, code map, C4, invariant registry, Checkpoint C residual risk, findings register, AI log, changelog and verification record. | `README.md`, `docs/` | Orchestrator + human |

Each slice: one branch/PR only if the human chooses to split; otherwise one PR with a coherent security story. No slice may claim the next slice's evidence.

## 9. Verification

### Automated

- `bunx supabase db reset` — replay all migrations and seed on a clean database.
- `bun run test` — existing invariant suites plus the authorization suite.
- `bun run lint`
- `bun run typecheck`
- `bun run build`
- `bunx supabase db lint` (if available) or the Supabase security advisor; document any accepted warning.
- CI: both jobs green, including the service-role test setup.

### Manual / observed

- Anonymous visitor: market/tournament pages redirect to login or show public data only.
- Fan: sign in anonymously, see 200 points, register, enter, exit, sign out.
- Organizer: sign in with the local script account, resolve a market; fan attempt is refused.
- Direct API attempt with the anon key: `select` on private tables returns no rows/error; `insert`/`update`/`delete` denied; mutation RPCs denied.
- Direct API attempt with a fan token: cannot read another fan's rows; cannot call `resolve_market`.
- Browser bundle: no service-role key.

### Records

- `docs/methodology/verification/2026-11-<issue>-authorization-rls.md` with commands, environment, observed results and limits.
- Update `INV-05` and add A-INV1–A-INV4 to the invariant registry.
- Update FND-001 with a lifecycle entry; do not mark it Verified until the verification record supports closure.
- Add a dated addendum to Checkpoint C residual risk; do not rewrite the original.
- AI transparency Entry 20; the authentication/RLS change becomes a `v1.1.0` release note at release preparation, not a per-PR changelog row.

## 10. Risks and recovery

| Risk | Likelihood | Impact | Mitigation / recovery |
| --- | --- | --- | --- |
| RLS locks the app out of its own data | Medium | High | Test every page/action; keep the service role for tests only; rollback by reverting the RLS migration and resetting locally. |
| `SECURITY DEFINER` function has a missing or wrong authorization check | Medium | Critical | Function-by-function review; explicit `auth.uid()` check; organizer check; safe `search_path`; revoke execute from anon; authorization tests; security review pass. |
| Direct table grants remain and bypass RLS | Medium | High | Revoke all, then grant only the intended read surfaces; inspect `information_schema.role_table_grants`; test direct writes. |
| Public trade function leaks identity | Low | High | Return only safe columns; no `user_id`, no `points_after`; test the response keys. |
| Local reset destroys development data | High | Medium | The database is local; take a `pg_dump` before reset if the human wants to preserve data; document the reset. |
| 100-user test hits auth rate limits or times out | Medium | Medium | Raise local auth rate limits for tests; create users via the admin API; batch; set a realistic test timeout. |
| `@supabase/ssr`/Next.js 16 cookie handling breaks builds | Medium | Medium | Follow the documented server-client pattern; run build/typecheck; fallback to a route-handler auth callback if needed. |
| Service-role key leaks | Low | Critical | Keep it in `.env.local`/CI only; never `NEXT_PUBLIC_*`; secret scan; do not log it. |
| Organizer account is hard to create | Medium | Low | Provide a local `scripts/create-organizer.ts`; document it; tests create their own organizer. |
| Test rewrite weakens invariant evidence | Medium | High | Preserve the same assertions and fault injections; use authenticated clients for the real path; record the change in the invariant registry. |

**Rollback:** revert the branch/PR; locally `git switch main`, `bunx supabase db reset` to the previous migration set. The database is local; no production rollback is required.

## 11. Stop conditions

Stop and request direction if:

- The human does not approve the `SECURITY DEFINER` model or the local reset.
- A `SECURITY DEFINER` function cannot be written with an explicit, reviewable authorization check.
- RLS or grants cannot be verified without exposing the service role to the client.
- The test suite cannot preserve the capacity/double-spend/resolution evidence with authenticated clients.
- The 100-user test cannot run within the CI timeout without weakening the scenario.
- The auth flow requires a larger UI rewrite than this plan describes.
- A new domain rule, migration or dependency becomes necessary beyond this plan.

## 12. Approval requested

The human owner is asked to approve:

1. The scope and non-goals in this plan.
2. Decisions D1–D9, especially `SECURITY DEFINER` + ADR-003 and the destructive local reset.
3. The new dependency `@supabase/ssr`.
4. The local auth rate-limit changes for tests.
5. The test rewrite and CI service-role credential.

No implementation begins until this plan is approved.

## 13. Delivery note (2026-11-07)

Approved by the human owner and executed on `feat/95-authorization-rls` (PR #96).

Observed in CI run [42397891717](https://github.com/match-pulse/match-pulse/actions/runs/42397891717):

- Lint, typecheck and build passed in 24s.
- Domain invariants passed in 2m13s.
- 21 tests passed across 6 files, including the six authorization tests.

The verification record is [`../verification/2026-11-95-authorization-rls.md`](../verification/2026-11-95-authorization-rls.md). The plan's non-goals remain non-goals: no organizer UI, idempotency, load/p95, deployment, reward redemption or club analytics.
