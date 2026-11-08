# Design

## Context

The invariant suite runs against a real local Supabase/PostgreSQL database. Some
mechanisms have already been observed failing under manual fault injection:
INV-01, INV-02, M-INV4, M-INV6 and the M-INV7 gate. The remaining market
invariants have passing tests only. The current manual procedure is not
repeatable enough to trust as a standing control.

The recovery drill already uses the database container and `psql` directly. The
same approach can apply temporary DDL mutations without adding a new runtime
dependency.

## Goals / Non-Goals

**Goals:**

- One named mutation per remaining invariant or detail.
- A runner that applies the mutation, runs the targeted test, expects failure,
  restores the database and reports a machine-readable result.
- A safe failure mode: if the mutation target text is missing, the run fails as
  a maintenance error rather than silently passing.
- Evidence that another person can reproduce locally.

**Non-Goals:**

- Production fault injection, chaos engineering or load testing.
- Changing the business rules or the schema of record.
- Running the full matrix on every pull request before its runtime is known.
- Replacing the invariant tests or the authorization suite.

## Decisions

### D1 — Mutation catalog as typed SQL transforms, not edited migrations

Each mutation is a typed entry in `scripts/fault-injection/mutations.ts`. It
extracts the current function or constraint from the migration source, applies
one explicit text replacement or DDL statement, and executes the result. The
migration files remain the source of truth and are never edited for a test.

Alternative: edit a migration, run the suite, revert. Rejected because it risks
committing the weakened rule and makes the mutation hard to review.

Alternative: store 11 full function replacements as SQL files. Rejected because
the functions are long and would drift from the migrations; a text transform
fails loudly when its target disappears.

### D2 — Runner in TypeScript, database work through the existing container

A Bun script (`scripts/fault-injection.ts`) reads the typed catalog, applies
each mutation with `psql` through the Supabase database container, runs the
targeted `bun test`, compares the exit code with the declared expectation, then
restores the database with `bun x supabase db reset`. The script prints one JSON
line per mutation and exits non-zero if any mutation did not produce the
declared result.

Alternative: a shell script. Simpler, but harder to structure the result and
the restore checks. The project already uses TypeScript scripts for smoke and
architecture checks.

Alternative: run mutations through the Supabase JS client. Rejected because DDL
and `SECURITY DEFINER` function replacement are not exposed as RPCs.

### D3 — Reset after each mutation

`supabase db reset` replays every migration and the seed. It is slower than
restoring one function definition, but it is deterministic and already used by
CI. The runner records the reset time; if the matrix becomes too slow, a
function-level restore can replace it later.

### D4 — Targeted test per mutation, not the whole suite

Each mutation names the test file and, where possible, the test name. Running
only the targeted test keeps the signal clear: the failure must come from the
intended rule, not from an unrelated test. The catalog distinguishes
**observed-red** mutations (the test must fail) from the **forced-failure**
M-INV2 check (the test must pass while proving rollback).

### D5 — CI scope

The matrix runs locally and in a dedicated CI job. The first run is on this
change's pull request so the runtime is measured; if it is too slow for every
PR, the job can move to a schedule or manual trigger without changing the
evidence format.

## Mutation catalog

| Invariant | Mutation | Targeted test | Expected red signal |
| :--- | :--- | :--- | :--- |
| M-INV1 | Remove the market-window guard from `open_trade`/`close_trade` | `market-lifecycle.test.ts` | Pre-kickoff or post-resolution entry succeeds |
| M-INV2 | Add a `BEFORE INSERT` trigger on `market_trades` that raises after the profile/position/market writes | `tests/fault-injection/atomic-rollback.ts` | The RPC fails and **no** partial profile debit, position, market update or trade survives; this is a forced-failure test, not an observed-red mutation |
| M-INV3 | Remove the position guard in `close_trade` and the `shares >= 0` constraint | `market-pricing.test.ts` | Over-sell succeeds or holdings go negative |
| M-INV5 | Update `q` without the matching position update, or vice versa | `market-pricing.test.ts` | Position sum and market `q` diverge |
| M-INV8 | Replace `ceil(cost)` with `floor(cost)` or add a fee path | `market-pricing.test.ts` | Debit/credit or no-fee assertion fails |
| M-INV7 ladder | Disable the `+15 s` increment | `market-lifecycle.test.ts` | Ladder assertion fails |
| M-INV7 cap | Remove the 600 s cap | `market-lifecycle.test.ts` | Cap assertion fails |
| M-INV7 decay | Disable the five-minute decay | `market-lifecycle.test.ts` | Decay assertion fails |
| M-INV7 scope | Make the cooldown global instead of user × market | `market-lifecycle.test.ts` | Scope assertion fails |
| M-INV7 no-escalation | Escalate on refused attempts | `market-lifecycle.test.ts` | No-escalation assertion fails |
| M-INV7 exit exemption | Make `close_trade` read the cooldown | `market-lifecycle.test.ts` | Exit-during-cooldown assertion fails |

The M-INV2 row is intentionally different. PostgreSQL function invocation is
atomic, and the project cannot break that atomicity without a second connection.
The trigger forces a failure at the last write and the test asserts rollback.
It is strong evidence of atomic behaviour, but it is not an observed-red
injection and is not recorded as one.

## Risks / Trade-offs

- **Mutation drift** → The runner checks that each target text exists before
  applying the mutation. A missing target is a hard error, not a pass.
- **Reset cost** → Record the reset time; start with local execution and a
  dedicated CI job, not every PR.
- **Test coupling** → Each mutation names a targeted test. A mutation that
  breaks an unrelated test is treated as a maintenance signal, not evidence.
- **False confidence** → Each mutation declares whether the test must fail or
  pass. A mutation that produces the wrong result is a failed drill, not a
  successful one.
- **M-INV2 atomicity** → PostgreSQL functions are atomic; the trigger test
  proves rollback but cannot prove the suite would detect a non-atomic
  implementation. The record states that limit.
- **Temporary schema change** → The database is reset after every mutation; no
  mutation is committed and no migration is edited.

## Migration Plan

No product migration. The new script and mutation files are test tooling. Rollback
is deleting the files and reverting the documentation; the database is restored
by `supabase db reset`.

## Open Questions

- Whether the dedicated CI job should run on a schedule or only on demand. This
  can be decided after the first measured runtime; it does not change the
  mutation catalog or the evidence format.
