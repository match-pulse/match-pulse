# Verification Record — Minor Hardening and Residual Dispositions

- **Issue:** [#182](https://github.com/match-pulse/match-pulse/issues/182)
- **PR:** Pending
- **Date:** 2026-11-10
- **Environment:** Local Fedora 44; Node 22.23.1; Bun 1.4.2; Docker CE 29.9.3; local Supabase PostgreSQL 17.11
- **Status:** Partially verified — implementer evidence; independent verification pending
- **Verifier:** Implementation Agent (evidence only; independent verifier required)

## 1. Claim or Acceptance Criterion

FND-021: CSV exports neutralise spreadsheet formula prefixes in both export routes.
FND-024: the seeded Summer Cup market can be resolved by the organizer fixture.
FND-025: a ticket request key replays only when the attendee payload, channel, buyer, ticket type and quantity match; changing the checkout payload rotates the key.
FND-020/FND-023/FND-026/FND-027: the residual audit findings have an approved, recorded disposition.

## 2. Method

- Added one shared `csvValue` encoder and used it for both aggregate export routes; unit tests cover ordinary quoting and the `=`, `+`, `-` and `@` prefixes.
- Assigned the seeded legacy tournament to the organizer fixture at organizer creation; ran a local `update_match` + `resolve_market` smoke through the organizer account.
- Added a `ticket_orders.payload_hash` column and replaced `purchase_ticket` so the replay comparison includes the attendee payload, channel and buyer; the checkout form rotates its request key when the ticket type or quantity changes.
- Recorded the approved dispositions in `docs/methodology/remediation/2026-11-10-audit-dispositions.md` and opened issue #188 for the deferred legacy CLUB retirement.
- Ran the full database, unit, CLI and E2E suites from a clean database reset.

## 3. Command or Evidence

```text
bun test --env-file=.env.local tests/unit/csv.test.ts
2 pass / 0 fail, 6 expect() calls

bun test --env-file=.env.local tests/integration/v3-club-tenancy.test.ts
10 pass / 0 fail, 95 expect() calls

bun run test
57 pass / 0 fail, 469 expect() calls

bun run test:agent
2 pass / 0 fail, 29 expect() calls

bun run test:e2e
11 passed

bun run build (local .env.local)
passed
```

Seed resolution smoke:

```text
update_match ok
resolve_market [{"holders":0,"total_points":0}]
```

Observed behaviour:

- Excel/LibreOffice formula-leading values are emitted as text with a leading apostrophe and standard CSV quoting.
- The organizer account owns the seeded tournament and can finish the match and resolve its market.
- Replaying the same ticket request key with the same payload returns the same order; changing attendee data is refused with `request id reused with a different payload`; only one order is stored.
- The full E2E suite passed from a clean reset after the CSV header assertion was updated for the quoted output.

## 4. Result

- The minor fixes pass the observed unit/integration/CLI/E2E checks.
- FND-021, FND-024 and FND-025 are implementation-complete and eligible for independent verification after merge.
- FND-020 remains partly fixed; fault-injection mutations and independent verification are tracked in #181.
- FND-023 is deferred to #188; FND-026 and FND-027 are accepted risks, both with the human-approved dispositions recorded.
- No finding is marked Verified by the implementer.

## 5. Limitations

- The E2E run emitted pre-existing Next.js `Date.now()` prerender warnings but all 11 tests passed.
- The seed smoke was run before the final clean reset; the clean E2E reset removes that mutation, so the demo needs `bun run auth:organizer` and a manual resolution to observe it again.
- The payload hash is computed from the attendee JSON text, channel and buyer; whitespace/key-order differences in an otherwise identical payload are treated as different, which is the conservative choice.
- Local Kong/Docker DNS workaround remains an environment limitation.
- The E2E suite does not specifically assert the formula prefix in a downloaded file; the unit test covers the encoder and both routes share it.

## 6. Links

- Issue: [#182](https://github.com/match-pulse/match-pulse/issues/182)
- Deferred legacy CLUB retirement: [#188](https://github.com/match-pulse/match-pulse/issues/188)
- Evidence workstream: [#181](https://github.com/match-pulse/match-pulse/issues/181)
- PR: Pending
- Execution plan / audit: [v3 audit](../audits/2026-11-10-171-v3-audit.md), [execution plan](../exec-plans/173-audit-remediation.md)
- Findings register: FND-020, FND-021, FND-023, FND-024, FND-025, FND-026, FND-027
- AI transparency entry: Entry 58
- Changelog row: pending release section

## 7. Addenda

2026-11-10: PR opened after merging the security, market, ticketing, reward, entitlement and privacy fixes into the branch. The final database suite is 57 pass / 0 fail (469 expect calls), CLI 2 pass, E2E 11 passed from a clean reset. Independent verification remains pending.
