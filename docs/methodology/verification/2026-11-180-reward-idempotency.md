# Verification Record — Reward Idempotency

- **Issue:** [#180](https://github.com/match-pulse/match-pulse/issues/180)
- **PR:** Pending
- **Date:** 2026-11-10
- **Environment:** Local Fedora 44; Node 22.23.1; Bun 1.4.2; Docker CE 29.9.3; local Supabase PostgreSQL 17.11
- **Status:** Partially verified — targeted implementer evidence; full suite and independent verification pending
- **Verifier:** Implementation Agent (evidence only; independent verifier required)

## 1. Claim or Acceptance Criterion

FND-013: a reward redemption requires a request key; the same key and payload replay the recorded code without a second debit, and a different payload is refused.

## 2. Method

- Added a required request key and stored points-after to `reward_redemptions`.
- Replaced `redeem_reward` with reward → profile → replay → eligibility → debit/insert lock order.
- Updated the domain wrapper, Server Action, fan rewards client form and CLI.
- Ran the real database-backed reward tests, including identical replay, payload mismatch and concurrent duplicates.

## 3. Command or Evidence

```text
bun test --env-file=.env.local tests/integration/mvp-backend.test.ts -t 'reward'
3 pass / 0 fail, 24 expect() calls
```

Observed behaviour:

- The first redemption returns a code and the expected points-after.
- Retrying with the same key returns the same code with no second debit.
- Reusing the key with a different reward is refused with `request id reused with a different payload`.
- A new key with insufficient points is refused.
- Two concurrent redemptions with the same key return the same code, debit once and store one redemption.

## 4. Result

- Targeted reward tests pass.
- The old one-argument `redeem_reward` signature was removed; the CLI and web callers send a key.
- Full-suite/CLI/E2E and independent verification remain pending after the branch is rebased onto the merged market/ticketing work.

## 5. Limitations

- The full suite was not run on this branch because the market lifecycle and ticketing PRs are not both merged yet.
- The client form holds one key while mounted; a full page reload after an ambiguous response creates a new key. The CLI supports explicit key reuse.
- Local Kong/Docker DNS workaround remains an environment limitation.

## 6. Links

- Issue: [#180](https://github.com/match-pulse/match-pulse/issues/180)
- PR: Pending
- Execution plan / audit: [v3 audit](../audits/2026-11-10-171-v3-audit.md), [execution plan](../exec-plans/173-audit-remediation.md)
- Findings register: FND-013
- AI transparency entry: Entry 55
- Changelog row: pending release section

## 7. Addenda

Pending PR link, full-suite evidence and independent verification.
