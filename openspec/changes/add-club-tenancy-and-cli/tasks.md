# Tasks

## 1. Contract and records

- [ ] 1.1 Write ADR-007 (club tenancy and entitlements), ADR-008 (platform admin boundary) and ADR-009 (email/password, cross-club fans, simulated commerce); validate they match the approved scope.
- [ ] 1.2 Update the kata and domain model for clubs, memberships, plans, ticket orders, cross-club fans and the privacy rule; keep the v2 records as history.
- [ ] 1.3 Create the capability manifest and the agent playbook specification; validate every planned capability has a command, DB contract, authorization test and scenario target.
- [ ] 1.4 Add this OpenSpec change and validate it with `openspec validate add-club-tenancy-and-cli --type change --strict`.
- [ ] 1.5 Commit the execution plan and Phase 0 artifacts in one reviewable pull request.

## 2. Schema and migration

- [ ] 2.1 Add `clubs`, `club_members`, `club_invites` and `platform_admins`; verify membership uniqueness and role checks.
- [ ] 2.2 Add `plans`, `plan_entitlements` and `club_subscriptions`; seed STARTER/PRO/ELITE and their limits/features.
- [ ] 2.3 Add `ticket_types`, `ticket_orders`, attendee fields on `tickets` (`order_id`, `buyer_id`, attendee identity, fan card, `ticket_code`, `checked_in_at`), `ticket_transfers`, `club_fan_cards` and `rewards.club_id`; verify constraints and the max-four rule.
- [ ] 2.4 Add `tournaments.club_id`, `tournaments.status` and `matches.prediction_enabled`; backfill a club and `OWNER` membership per existing organizer and link their tournaments.
- [ ] 2.5 Create a `PRO` subscription for migrated clubs; verify existing events remain readable.
- [ ] 2.6 Add indexes and uniqueness for slugs, membership, invites, request ids, ticket codes and attendee lookups; verify query plans for club-scoped reads.
- [ ] 2.7 Add the attendee retention window and a cleanup path; verify it removes identity data without deleting the audit record.
- [ ] 2.8 Write the migration rollback/backup note; verify a clean local reset and a second migration run.

## 3. Authorization and RLS

- [ ] 3.1 Add helper functions: `is_platform_admin`, `is_club_member`, `has_club_role`, `has_entitlement`, `require_entitlement`, `can_manage_event`.
- [ ] 3.2 Replace global-role policies with club-scoped policies for clubs, members, invites, events, matches, tickets, orders, rewards and analytics.
- [ ] 3.3 Add platform-admin read policies for clubs, plans, subscriptions and audit; deny personal fan data by default.
- [ ] 3.4 Add public read policies for published events and active ticket types.
- [ ] 3.5 Revoke direct mutations and grant only the required RPC execution.
- [ ] 3.6 Add database tests for cross-club isolation, role matrix, entitlement denial, public reads and platform-admin boundaries.

## 4. Domain RPCs

- [ ] 4.1 Add club onboarding: `create_club`, `update_club`, `request_plan_change`, `get_club_context`.
- [ ] 4.2 Add membership: `invite_club_member`, `accept_club_invite`, `list_club_members`, `set_club_member_role`, `remove_club_member`; enforce limits and owner protection.
- [ ] 4.3 Add event management: `create_event`, `update_event`, `publish_event`, `set_prediction_enabled`; enforce club scope, role and entitlement.
- [ ] 4.4 Add nominal ticketing: `create_ticket_type`, `purchase_ticket` with 1–4 attendees, `transfer_ticket`, `list_club_orders`, `list_club_attendees`, `check_in_ticket` and `box_office_sell`; enforce capacity, terms, request id, fan-card, max-four, transfer deadline and idempotent check-in.
- [ ] 4.5 Add fan cards: `issue_club_fan_card`, `list_club_fan_cards` and validation in the purchase path.
- [ ] 4.6 Add analytics: `club_sales_summary`, `club_prediction_insights`, `club_analytics_timeseries`, `record_club_export`; enforce club scope, entitlement and threshold 5.
- [ ] 4.7 Add platform admin: `admin_list_clubs`, `admin_assign_plan`, `admin_set_subscription_status`, `admin_list_audit`; audit every action.
- [ ] 4.8 Add audit events for plan, member, event, nominal order, transfer, check-in, box office, export and admin actions without logging secrets or unnecessary attendee data.

## 5. Identity and shared contract

- [ ] 5.1 Replace anonymous fan auth with email/password sign-up, sign-in and sign-out; update the login page and remove `signInAnonymously`.
- [ ] 5.2 Add a profile/context loader that returns fan identity, club memberships and platform-admin flag.
- [ ] 5.3 Extract input validation, typed RPC wrappers and error mapping into a shared domain layer; keep Server Actions as thin adapters.
- [ ] 5.4 Add a stable machine-readable error shape and map RPC errors to it.
- [ ] 5.5 Add auth tests for fan, club organizer and platform admin, including refusal of anonymous access.

## 6. CLI

- [ ] 6.1 Add the `matchpulse` entry point, command registry, `--help`, `commands --json` and `describe`.
- [ ] 6.2 Add auth profiles with email/password login, session storage (`0600`), logout and `whoami`; refuse the service role in user profiles.
- [ ] 6.3 Add fan commands: events, nominal ticket purchase with attendee JSON, ticket list/show, transfer, predictions, portfolio and rewards.
- [ ] 6.4 Add club commands: create, switch, members, events, matches, ticket types, orders, attendees, check-in, box office, fan cards, predictions, analytics and plan.
- [ ] 6.5 Add admin and ops commands with audit and a separate service-role context.
- [ ] 6.6 Add JSON output, exit codes 0/1/2 and `--request-id` for mutations.
- [ ] 6.7 Add CLI contract tests and the capability parity gate.

## 7. Web UI

- [ ] 7.1 Add fan sign-up/sign-in and the context switcher; remove the anonymous fan button.
- [ ] 7.2 Add public event discovery and event detail across clubs.
- [ ] 7.3 Add simulated checkout with attendee forms (1–4), terms acceptance, ticket confirmation, digital QR and name change.
- [ ] 7.4 Add fan tickets, predictions, portfolio and club rewards.
- [ ] 7.5 Add club onboarding: create club, choose simulated plan, invite members.
- [ ] 7.6 Add club dashboard: plan, entitlements, events, ticket types, orders, attendee list, box office, check-in and analytics.
- [ ] 7.7 Add platform-admin console: clubs, plans, subscription status and audit.
- [ ] 7.8 Add accessibility checks for every new page.

## 8. Agent playbook and evidence

- [ ] 8.1 Add `tests/agent/` runner, fixtures, assertions and JSON evidence output.
- [ ] 8.2 Implement the match-day scenario, including nominal tickets for multiple attendees, cross-club tickets and predictions.
- [ ] 8.3 Implement entitlement, authorization, capacity/concurrency and privacy scenarios.
- [ ] 8.4 Implement nominal ticketing scenarios: max four, missing attendee data, fan-card requirement, transfer before/after deadline, box-office sale and digital check-in.
- [ ] 8.5 Add `bun run test:agent` and a CI job with the `agent-evidence` artifact.
- [ ] 8.6 Update the playbook from specification to verified with observed evidence.
- [ ] 8.7 Verify the refusal scenarios leave committed state unchanged.

## 9. Course and release

- [ ] 9.1 Update threat model, failure modes, runbook, SLOs, test strategy, README and code map.
- [ ] 9.2 Add the dated report addendum and checkpoints D/E mapping; keep the v2 records intact.
- [ ] 9.3 Add verification records for tenancy/entitlements, auth, ticketing and CLI/playbook.
- [ ] 9.4 Update the findings register and AI transparency log; keep FND-007/FND-008 accurate.
- [ ] 9.5 Run the full CI, regenerate the PDFs and update the submission index.
- [ ] 9.6 Prepare the `v3.0.0` changelog, tag and GitHub Release after green CI and human approval.
