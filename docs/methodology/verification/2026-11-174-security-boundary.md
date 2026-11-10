# Verification Record — Security Boundary

- **Issue:** [#174](https://github.com/match-pulse/match-pulse/issues/174)
- **PR:** [#184](https://github.com/match-pulse/match-pulse/pull/184)
- **Date:** 2026-11-10
- **Environment:** Local Fedora 44; Node 22.23.1; Bun 1.4.2; Docker CE 29.9.3; local Supabase PostgreSQL 17.11
- **Status:** Partially verified — implementer evidence; independent verification pending
- **Verifier:** Implementation Agent (evidence only; independent verifier required)

## 1. Claim or Acceptance Criterion

FND-009: anonymous sign-ins are disabled.
FND-010: current club membership, not a legacy `organizer_id`, controls direct attendee ticket/registration reads.
FND-022: platform-admin direct reads of invitation emails and fan-card numbers are removed.

## 2. Method

- Applied a new migration to the local Supabase database and ran the database-backed authorization and v3 tenancy suites.
- Exercised anonymous sign-in through the Supabase client.
- Exercised direct PostgREST selects as a current staff member, a removed staff creator, a legacy organizer and a platform admin.
- Exercised the legacy organizer RPC to confirm the supported path still works.
- Ran the repository's static checks and production build.
- The tests use the real local Supabase Auth/PostgREST/PostgreSQL boundary, not mocks.

## 3. Command or Evidence

```text
bun test --env-file=.env.local tests/invariants/authorization.test.ts tests/integration/v3-club-tenancy.test.ts
14 pass / 0 fail, 138 expect() calls

bun run test
44 pass / 0 fail, 391 expect() calls
```

Additional observed checks:

```text
bun run lint                         passed
bun run typecheck                    passed
NEXT_PUBLIC_SUPABASE_URL=... bun run build
                                     passed
bun run check:architecture           passed
bun run check:secrets                passed (278 tracked files)
bun audit --audit-level=high         no vulnerabilities found
```

Observed behaviour:

- Anonymous `signInAnonymously()` returned an error and no session.
- A staff member could select the event's ticket before removal, then received no rows after `remove_club_member`.
- The owner still received the ticket row after removal.
- A legacy organizer's direct `registrations` select returned no rows, while `organizer_tournament_registrations` returned the registration.
- A platform admin's direct `club_invites` and `club_fan_cards` selects returned no rows; the owner still saw one of each.

Environment note: `supabase start` health checks returned 502 for the REST and edge-runtime services because Kong 2.8.1 under Docker 29 resolved the Supabase container upstreams as `127.0.0.1`. The stack was started with `--ignore-health-check`; the running Kong declarative config was patched to the actual container IPs for this local session, after which `/rest/v1/`, `/auth/v1/health`, `/rest-admin/v1/ready` and `/functions/v1/_internal/health` returned 200. This is a local Docker/Kong compatibility workaround, not an application change; CI uses its own stack. It must be rechecked or fixed in the environment issue before relying on a clean `supabase start` in this host.

## 4. Result

- Database authorization tests pass.
- The static checks and build pass.
- FND-009, FND-010 and FND-022 are implementation-complete and eligible for independent verification after the PR merges.
- No independent human verifier has confirmed the result yet; the findings must not be marked Verified by the implementer.

## 5. Limitations

- The Kong/Docker workaround means the local `supabase start` health check is not yet clean on this host.
- E2E, fault injection and smoke were not run for this narrow security PR; they remain in the campaign final gate.
- The test uses local synthetic users and a disposable database. It does not prove production configuration.
- Anonymous auth is disabled in `supabase/config.toml`; a hosted project would need the same setting checked.

## 6. Links

- Issue: [#174](https://github.com/match-pulse/match-pulse/issues/174)
- PR: [#184](https://github.com/match-pulse/match-pulse/pull/184)
- Execution plan / audit / refactor / incident record: [v3 audit](../audits/2026-11-10-171-v3-audit.md), [execution plan](../exec-plans/173-audit-remediation.md)
- Findings register: FND-009, FND-010, FND-022
- AI transparency entry: Entry 52
- Changelog row: pending release section

## 7. Addenda

2026-11-10: PR [#184](https://github.com/match-pulse/match-pulse/pull/184) opened. Independent verification and CI results are pending.
