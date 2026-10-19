# Execution Plan — Invariant Evidence and the Registration Path

> **Superseded in part (2026-10-19).** INV-03 and INV-04 were withdrawn when the owner replaced fixed-score predictions with a live market. See [`live-prediction-market.md`](./live-prediction-market.md). This file remains the record of the Checkpoint A increment.

- **Issue:** #50 (plan owner; full plan spans #50–#55)
- **Status:** Executed
- **Approved:** 2026-10-19
- **Executed:** 2026-10-19
- **Governance:** AI executes this approved scope. No product, architecture, schema or scope decision is delegated to AI. Merges require explicit human authorisation.

## 1. Intent

The repository documents guarantees its code does not enforce, and the tests meant to prove them cannot fail. Every downstream artifact inherits that unverified foundation.

**Problem.** A methodological portfolio and an architecture submission both rest on evidence that is currently unenforceable.

**Outcome.** Tournament registration capacity becomes a genuine thin end-to-end behaviour with executable, CI-enforced, honestly-labelled evidence, and the kata contains the behaviour it implements.

**Users.** Tournament organizers (the Checkpoint A user) obtain capacity limits they can trust and defend; spectators obtain a registration path.

## 2. Current state

Verified by inspection and live probing of the local Supabase stack (PostgreSQL 17.11):

- `submit_prediction` checks `status` only, never `kickoff_time` (`supabase/migrations/20261018_init.sql`).
- Prediction insert and point deduction are separate, non-transactional operations (`src/app/actions/predict.ts`).
- Neither test can fail a build: no assertion, no non-zero exit (`tests/invariants/`).
- No unique constraint on `registrations (tournament_id, user_id)`; `02-invariants.md` claims one exists.
- Zero RLS and zero grants. Confirmed live: an arbitrary `apikey` against the local API returned profile rows and executed `register_for_tournament`.
- Tests absent from CI (`.github/workflows/ci.yml` runs lint and build only).
- `Dockerfile` copies `bun.lockb`; the repository contains `bun.lock`.
- `README.md` documents `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`; all code reads `NEXT_PUBLIC_SUPABASE_ANON_KEY`.
- Clean history: 64 commits, 49 merged PRs, 23 issues, one contributor, no uncommitted work.

## 3. Scope

**In:** kata alignment; database integrity migration; registration Server Action, page and component; assertion-based tests with cleanup and stored-state verification; CI enforcement; correction of overclaiming documentation; AI transparency log; build and environment fixes.

**Out (explicit non-goals):** Supabase Auth, RLS policies, atomic prediction+point accounting, the kickoff guard, the points ledger, ticket purchase, club analytics. The kickoff guard is recorded as *not implemented* rather than silently fixed or silently claimed.

## 4. Assumptions and uncertainty

- "Hundreds of concurrent spectators" is an estimate, not a measurement. Every elasticity target depends on it.
- No deployment environment exists, so deployability cannot be measured.
- Whether the Checkpoint A pitch has already been delivered to the professor is unknown. Existing test transcripts are therefore treated as **unverified claims**, not as evidence, until reproduced.
- Selecting architectural characteristics is a human decision; this plan does not re-select the set.

## 5. Decisions

All decisions were made by the human owner on 2026-10-19:

| # | Decision |
| :--- | :--- |
| D1 | Registration capacity remains the anchor increment; prediction submission becomes increment 2. |
| D2 | The kata gains an explicit capacity-limited participation requirement. |
| D3 | Depth covers audit Priorities 1–3 plus database integrity. |
| D4 | Database work runs through the local Supabase stack (`supabase_db_match-pulse`). |
| D5 | CI gains a Supabase-backed job that executes the invariant suite. |
| D6 | PRs are opened and CI watched; merges occur only on explicit human instruction. |
| D7 | Branch protection is not configured. |
| D8 | GitHub Issues is the work board. |
| D9 | Commit identity is `Santiago Rojas <santiago.rojas@github.com>`, repository-local only. |
| D10 | Non-goals are recorded as gaps, never claimed as delivered. |

## 6. Acceptance criteria

1. `bun test` exits non-zero if capacity is exceeded, if stored state diverges from the counter, or if a duplicate registration succeeds.
2. The suite is proven able to fail, not merely proven to pass.
3. The suite runs on every pull request.
4. Every domain invariant is either implemented-and-tested or explicitly marked not implemented.
5. No document states an unmeasured performance or scaling claim as fact.
6. The kata contains the increment's behaviour as a domain requirement.
7. `typecheck`, `lint` and `build` pass with real credentials.
8. The AI transparency log records each material AI contribution.
9. Another person can follow the README alone to install, reset the database, run tests and start the app.

## 7. Work breakdown

| Issue | Branch type | Content |
| :--- | :--- | :--- |
| #50 | `docs/` | Kata, measurable characteristics, ADR alternatives, this plan |
| #52 | `docs/` | Methodology corrections and AI transparency log |
| #51 | `feat/` | Integrity migration, idempotent RPC, seed cleanup |
| #53 | `feat/` | Registration Server Action, page, component, identity seam |
| #54 | `test/` | Assertions, stored-state checks, cleanup, CI job |
| #55 | `chore/` | Docker, Compose, README, package scripts |

Dependencies: #54 requires #51 (the uniqueness constraint it tests). #53 requires #51 (the registration function it calls). Sequence #50 → #52 → #51 → #53 → #54 → #55.

## 8. Verification

| Item | Command | Pass condition |
| :--- | :--- | :--- |
| Capacity under burst | `bun test tests/invariants/tournament-capacity.test.ts` | 32 accepted, 68 rejected, 0 errors |
| Stored state | same | Rows = 32, `current_players` = 32, `current_players <= max_capacity` |
| Uniqueness | `bun test tests/invariants/registration-uniqueness.test.ts` | Duplicate returns false; one row; counter +1 |
| Harness can fail | Relax a CHECK constraint, re-run | Suite **must** fail, then revert |
| Static checks | `bun run typecheck && bun run lint && bun run build` | Exit 0 |
| CI enforcement | PR run | Invariants job executes; failing test turns CI red |
| End to end | `bun run dev` | Capacity honoured in the UI |
| Container build | `docker build .` | Image builds |
| No secret exposure | Ignore-file and history audit | No `.env` in image, history or commits |

## 9. Risks and recovery

| Risk | Recovery |
| :--- | :--- |
| Unique constraint fails on pre-existing duplicates | Local database is disposable; replay all migrations from an empty schema |
| Lock change alters burst behaviour | Re-run the 100/32 burst and report actual numbers |
| CI `supabase start` slow or flaky | Job timeout; verify equivalence locally before merge |
| Six pull requests exceed available time | #50 is self-contained and protects the 23 October deadline |
| A recorded test result cannot be reproduced | Report the discrepancy; do not overwrite a transcript already presented |

## 10. Stop conditions

Execution stops and returns to the human owner if: the burst test produces different numbers than documented; a migration fails against a replayed schema; the registration path cannot be completed without authentication; or any change would require weakening a test or an invariant.

---

## 11. Execution record

| Issue | PR | Outcome |
| :--- | :--- | :--- |
| #50 | #56 | Merged. Kata aligned; measurable targets added; claims withdrawn. |
| #52 | #57 | Merged. Methodology corrected; AI log populated. |
| #51 | #58 | Merged. Schema enforces INV-01 and INV-02. |
| #53 | #59 | Merged. Registration reachable end to end. |
| #54 | #60 | Merged. Suite can fail; runs in CI. |
| #55 | #61 | Merged. `docker build` succeeds; no secret in image. |

### Acceptance criteria

| # | Criterion | Result |
| :--- | :--- | :--- |
| 1 | Suite exits non-zero on capacity breach, counter divergence or duplicate acceptance | Met — demonstrated twice by fault injection, exit 1 |
| 2 | Suite proven able to fail | Met — two injections, both reverted |
| 3 | Suite runs on every pull request | Met — CI job executes all 7 named tests |
| 4 | Every invariant implemented-and-tested or marked not implemented | Met — INV-01/02 verified, INV-03/04/05 recorded as gaps |
| 5 | No unmeasured performance or scaling claim stated as fact | Met |
| 6 | Kata contains the increment's behaviour | Met |
| 7 | `typecheck`, `lint`, `build` pass with real credentials | Met locally and in CI |
| 8 | AI transparency log records material contributions | Met — 8 entries plus a standing gap |
| 9 | Another person can follow the README alone | **Partially met.** Documented and `docker build` verified; the built container was not observed serving a request (Docker WSL interop failure). |

### Deviations from the plan

1. **`@types/bun` added** as a dev dependency. Required for `bun:test` types; not anticipated. Surfaced in PR #60 rather than added silently.
2. **Build-stage Supabase placeholders** introduced in PR #61. All Supabase access is server-side, so real values are read at runtime. Not anticipated; needed because `src/lib/supabase.ts` validates at module load and a bare `docker build` failed.
3. **A finding reversed the diagnosis.** Fault injection showed the original capacity guard was already correct and the defect was uniqueness. Recorded rather than absorbed.
4. **The container smoke test was not completed.** Reported as unverified.

### Still open after execution

INV-03 (kickoff deadline), INV-04 (atomic point accounting) and INV-05 (authentication, RLS, grants) are unchanged. INV-05 means the system is **not** a security boundary. The open question raised in `02-architecture-characteristics.md` §6 — whether data integrity under concurrency belongs in the selected characteristics — remains a human decision and is not resolved by this plan.