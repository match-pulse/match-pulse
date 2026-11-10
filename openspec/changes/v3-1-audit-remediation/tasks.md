# Tasks

## 1. Environment and baseline

- [ ] 1.1 Install Node 22, Bun 1.4.2, Docker CE/Compose and the repository Supabase CLI; verify versions and `docker info` (`node --version`, `bun --version`, `docker info`, `bunx supabase --version`)
- [ ] 1.2 Start local Supabase, create mode-0600 `.env.local` and record `bunx supabase status -o env` (verify no secret is tracked)
- [ ] 1.3 Run baseline lint, typecheck, build, architecture, secrets, audit, database, CLI, E2E, fault-injection and smoke; record exact results and environment limits in a dated verification record
- [ ] 1.4 Confirm the baseline failures, if any, are environmental or pre-existing before starting remediation

## 2. Security boundary

- [ ] 2.1 Set `enable_anonymous_sign_ins = false`, update the auth comment, and replace the anonymous-user test with a refusal test (`bun run test` authorization suite)
- [ ] 2.2 Add a migration dropping `tickets_select_organizer` and `registrations_select_organizer`; recreate invite/fan-card policies without direct platform-admin reads (`bun run test`, architecture guard)
- [ ] 2.3 Add removed-member and platform-admin direct-select tests; verify current staff and scoped admin RPCs still work (`bun run test`)
- [ ] 2.4 Update threat model, authorization verification record and AI transparency entry; verify links and claims

## 3. Market lifecycle

- [ ] 3.1 Write the result-bound market ADR and update the domain model/invariant rules (review links and approval)
- [ ] 3.2 Replace `open_trade`, `resolve_market`, `set_prediction_enabled`, `update_club_match` and the prediction-enabled trigger; verify grants and `bun run check:architecture`
- [ ] 3.3 Update market/event UI and CLI messages; verify `bun run typecheck` and targeted E2E
- [ ] 3.4 Add post-`FINISHED`, exit-after-`FINISHED`, pre-`FINISHED` resolution, score-mismatch, premature-`FINISHED`, post-resolution-score and disable-then-exit tests; verify `bun run test`
- [ ] 3.5 Add targeted fault-injection mutations for the lifecycle guards; verify `bun run fault:inject`

## 4. Ticketing integrity

- [ ] 4.1 Update `purchase_ticket` for cumulative buyer limits, venue-capacity checks and payload fingerprinting; verify targeted database tests
- [ ] 4.2 Bound `ticket_allocation` by `max_capacity` at event create/update and backfill/validate existing local rows; verify migration and capacity tests
- [ ] 4.3 Scope `claim_ticket` and `register_for_tournament` to `club_id IS NULL`; hide legacy forms on v3 events; verify v3 refusal and legacy success
- [ ] 4.4 Rotate ticket request keys on payload changes and document CLI `--request-id`; verify CLI replay/mismatch tests
- [ ] 4.5 Add sequential/concurrent cap, capacity, legacy scope and payload tests; verify `bun run test`, `bun run test:agent` and E2E

## 5. Reward idempotency

- [ ] 5.1 Add the reward request column/index and replace `redeem_reward` with replay/refusal semantics; verify grants and architecture guard
- [ ] 5.2 Update the domain wrapper, Server Action, fan rewards form and CLI; verify typecheck, CLI and E2E
- [ ] 5.3 Add sequential replay, concurrent duplicate, double-submit and payload-mismatch tests; verify `bun run test` and fault injection

## 6. Entitlements and concurrency

- [ ] 6.1 Require active entitlements in invite/accept/event-create and serialise the limit check; verify migration and targeted tests
- [ ] 6.2 Add canceled/past-due/missing-subscription and concurrent limit tests; verify `bun run test` and fault injection
- [ ] 6.3 Update failure-modes and verification records; verify links and observed results

## 7. Privacy and analytics

- [ ] 7.1 Extend retention to transfer history, audit card numbers and invite emails; verify migration and retention tests
- [ ] 7.2 Apply outcome-level cohort suppression to insights and time series; verify boundary tests and CSV/UI labels
- [ ] 7.3 Add/adjust E2E and export tests; verify `bun run test:e2e` and targeted route checks
- [ ] 7.4 Update T-INV8/T-INV10, privacy documentation, verification record and AI transparency entry

## 8. Minor hardening and dispositions

- [ ] 8.1 Add shared CSV formula sanitisation to both export routes and tests; verify route output
- [ ] 8.2 Make the seeded market resolvable through the organizer fixture or remove it; verify a local resolution smoke check
- [ ] 8.3 Record the approved dispositions for legacy CLUB analytics, ticket-point issuance and subscription period end; implement only the approved scope
- [ ] 8.4 Update README known gaps, audit triage/closure tables and findings register; verify links and statuses

## 9. Evidence and final verification

- [ ] 9.1 Correct invariant claims and add the missing failure-mode/fault-injection evidence; verify `openspec validate`, registry links and `bun run fault:inject`
- [ ] 9.2 Run the full final suite and record exact results, limitations and open risks
- [ ] 9.3 Perform a separate verification role pass; the implementer must not mark its own findings Verified
- [ ] 9.4 Update AI transparency, changelog/release records and audit closure; verify no historical record was overwritten

## Workflow follow-up

- Archive this OpenSpec change only after implementation, verification and human review are complete.
- Cut a release only after CI is green, the changelog/version are aligned and the human authorizes the tag/GitHub Release.
