# Verification Record — Result-Bound Market Lifecycle

- **Issue:** [#175](https://github.com/match-pulse/match-pulse/issues/175)
- **PR:** Pending
- **Date:** 2026-11-10
- **Environment:** Local Fedora 44; Node 22.23.1; Bun 1.4.2; Docker CE 29.9.3; local Supabase PostgreSQL 17.11
- **Status:** Partially verified — implementer evidence; full suite and independent verification pending
- **Verifier:** Implementation Agent (evidence only; independent verifier required)

## 1. Claim or Acceptance Criterion

FND-011: entries stop when the match is `FINISHED`; resolution requires a finished match and the score-derived winner.
FND-014: disabling predictions blocks new `BUY` trades but not `SELL` exits.

## 2. Method

- Added database triggers for the market window, resolution binding, match-result integrity and prediction-enabled `BUY` gating.
- Applied the migration to the local database and ran the targeted market lifecycle and MVP backend suites.
- The tests exercise the real PostgreSQL transaction boundary, including failed resolutions that must roll back payouts.
- UI and CLI paths were updated to stop offering entries/resolution when the database would refuse them; a full E2E run is pending.

## 3. Command or Evidence

```text
bun test --env-file=.env.local tests/invariants/market-lifecycle.test.ts
9 pass / 0 fail, 78 expect() calls

bun test --env-file=.env.local tests/integration/mvp-backend.test.ts
8 pass / 0 fail, 47 expect() calls
```

Static checks:

```text
bun run typecheck   passed
bun run lint        passed
bun run build       passed
bun run check:architecture passed
```

Observed behaviour:

- An entry after `FINISHED` is refused with `market is closed`; an exit after `FINISHED` succeeds.
- Resolution before `FINISHED` is refused with `match is not finished`; a winner that does not match the score is refused; the matching winner resolves.
- A score change after resolution is refused.
- Marking a future match `FINISHED` is refused.
- Disabling predictions allows a `SELL` exit and refuses a new `BUY`.
- The existing one-shot payout and cooldown tests still pass.

## 4. Result

- Targeted database tests pass.
- Static checks and build pass.
- The full database suite and E2E were not run on this branch because the security-boundary PR #184 is not merged yet; the branch will be rebased and the full suite run before review.
- FND-011 and FND-014 are implementation-complete and eligible for independent verification after merge.

## 5. Limitations

- The tests use synthetic matches/markets and a disposable local database.
- The new guards are trigger-based; fault-injection mutations for them are not added yet (FND-020 evidence work).
- The UI change is compiled but not exercised end-to-end in this branch.
- The local Kong/Docker DNS workaround from the security verification remains an environment limitation.

## 6. Links

- Issue: [#175](https://github.com/match-pulse/match-pulse/issues/175)
- PR: Pending
- Execution plan / audit / ADR: [v3 audit](../audits/2026-11-10-171-v3-audit.md), [execution plan](../exec-plans/173-audit-remediation.md), [ADR-011](../../architecture/adr/011-result-bound-market-lifecycle.md)
- Findings register: FND-011, FND-014
- AI transparency entry: Entry 53
- Changelog row: pending release section

## 7. Addenda

Pending PR link, full-suite evidence and independent verification.
