# Verification Record — Ticket-Point Caps (FND-026 / #200)

- **Issue:** [#200](https://github.com/match-pulse/match-pulse/issues/200)
- **PR:** Pending
- **Date:** 2026-11-10
- **Environment:** Local Fedora 44; Bun 1.4.2; local Supabase PostgreSQL 17.11
- **Status:** Verified — implementation and local evidence; human decision owner confirmed the campaign
- **Verifier:** Implementation Agent / Test Engineer (evidence); Human developer (final verification, 2026-11-10)

## 1. Claim or Acceptance Criterion

FND-026: club-issued ticket points are capped at 500 per ticket and 10,000 per event; event create/update above either cap is refused.

## 2. Method

- Added `tournaments` CHECK constraints for the per-ticket and per-event caps, exempting legacy tournaments with `club_id IS NULL`.
- Replaced `create_club_event` and `update_club_event` with explicit cap checks and clear error messages.
- Added a boundary test: 501/ticket refused, 500 × 21 refused, 500 × 20 accepted, update above either cap refused.
- Ran the full database and CLI suites.

## 3. Command or Evidence

```text
bun test --env-file=.env.local tests/integration/v3-club-tenancy.test.ts -t 'ticket point caps'
1 pass / 0 fail, 5 expect() calls

bun run test
58 pass / 0 fail, 478 expect() calls

bun run test:agent
2 pass / 0 fail, 30 expect() calls

bun run typecheck / lint / check:architecture / check:secrets
passed
```

Observed behaviour:

- `ticket_points = 501` is refused with `ticket points cannot exceed 500 per ticket`.
- `500 × 21 = 10,500` is refused with `ticket points cannot exceed 10000 per event`.
- `500 × 20 = 10,000` is accepted.
- Updating an event above either cap is refused.

## 4. Result

- The per-ticket and per-event caps are enforced by both the RPCs and table constraints.
- Legacy `club_id IS NULL` tournaments remain exempt from the club cap.
- FND-026 is Verified.

## 5. Limitations

- The cap values are the human-approved product rule for the MVP.
- Local/CI evidence only; production deployment is the final post-MVP step.
- Existing hosted data would need a pre-migration validation if the cap is applied after production data exists.

## 6. Links

- Issue: [#200](https://github.com/match-pulse/match-pulse/issues/200)
- PR: Pending
- Findings register: FND-026
- Audit: AUD-018
- AI transparency entry: Entry 64

## 7. Addenda

Pending PR link.
