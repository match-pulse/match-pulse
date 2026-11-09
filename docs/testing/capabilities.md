# Capability Manifest

Every customer-visible capability has one row. A capability is complete only when it has all of the following:

- a database RPC or RLS-protected read;
- a web path;
- a CLI command;
- an authorization test;
- an agent scenario;
- documentation;
- an audit event where the action is sensitive.

Status values: `planned`, `implemented`, `verified`.

| Capability | Actor | CLI command | Database contract | Web path | Scenario | Status |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| Fan sign-up | Public | `auth signup` | Supabase Auth + `profiles` trigger | `/signup` | `auth` | implemented |
| Sign in | All | `auth login` | Supabase Auth | `/login` | `auth` | implemented |
| Sign out | All | `auth logout` | Supabase Auth | top bar | `auth` | implemented |
| Current identity | All | `auth whoami` | `profiles`, `club_members`, `platform_admins` | context switcher | `auth` | verified |
| List public events | Public/Fan | `fan events list` | `public_events` view | `/events` | `match-day` | verified |
| Show event | Public/Fan | `fan events show` | `public_events` + `public_ticket_types` + `public_matches` | `/events/[id]` | `match-day` | implemented |
| Buy nominal tickets | Fan | `fan tickets buy` | `purchase_ticket` | `/events/[id]/checkout` | `match-day` | verified |
| List my tickets | Fan | `fan tickets list` | `list_my_tickets` | `/fan/tickets` | `match-day` | verified |
| Show my ticket / QR | Fan | `fan tickets show` | `list_my_tickets` filtered by ticket | `/fan/tickets/[id]` | `match-day` | implemented |
| Transfer ticket | Fan | `fan tickets transfer` | `transfer_ticket` | `/fan/tickets/[id]/transfer` | `transfers` | implemented |
| Enter prediction | Fan | `fan predictions enter` | `open_trade` | `/market/[id]` | `predictions` | verified |
| Exit prediction | Fan | `fan predictions exit` | `close_trade` | `/market/[id]` | `predictions` | implemented |
| Portfolio | Fan | `fan portfolio show` | `market_positions`, `market_trades`, `market_payouts` reads | `/fan/portfolio` | `predictions` | verified |
| List rewards | Fan | `fan rewards list` | `public_club_rewards` view | `/fan/rewards` | `rewards` | implemented |
| Redeem reward | Fan | `fan rewards redeem` | `redeem_reward` | `/fan/rewards` | `rewards` | implemented |
| Create club | Fan/Organizer | `club create` | `create_club` | `/club/new` | `club-onboarding` | verified |
| Update club | Club OWNER/ADMIN | `club update` | `update_club` | `/club/settings` | `club-onboarding` | implemented |
| Switch club | Club member | `club switch` | membership list | context switcher | `club-onboarding` | planned |
| Invite member | Club OWNER/ADMIN | `club members invite` | `invite_club_member` | `/club/members` | `club-onboarding` | implemented |
| List members | Club member | `club members list` | `club_members` read | `/club/members` | `club-onboarding` | implemented |
| Change member role | Club OWNER/ADMIN | `club members role` | `set_club_member_role` | `/club/members` | `authorization` | implemented |
| Remove member | Club OWNER/ADMIN | `club members remove` | `remove_club_member` | `/club/members` | `authorization` | implemented |
| Create event | Club OWNER/ADMIN/STAFF | `club events create` | `create_club_event` | `/club/events/new` | `match-day` | verified |
| Update event | Club OWNER/ADMIN/STAFF | `club events update` | `update_club_event` | `/club/events/[id]` | `match-day` | implemented |
| Publish event | Club OWNER/ADMIN/STAFF | `club events publish` | `publish_club_event` | `/club/events/[id]` | `match-day` | verified |
| Create ticket type | Club OWNER/ADMIN/STAFF | `club ticket-types create` | `create_ticket_type` | `/club/events/[id]` | `match-day` | verified |
| List ticket types | Club OWNER/ADMIN/STAFF/ANALYST | `club ticket-types list` | `list_club_ticket_types` | `/club/events/[id]` | `match-day` | implemented |
| Create match | Club OWNER/ADMIN/STAFF | `club matches create` | `create_club_match` | `/club/events/[id]` | `match-day` | verified |
| List matches | Club OWNER/ADMIN/STAFF/ANALYST | `club matches list` | `list_club_matches` | `/club/events/[id]` | `match-day` | implemented |
| Update match | Club OWNER/ADMIN/STAFF | `club matches update` | `update_club_match` | `/club/events/[id]` | `match-day` | implemented |
| Create club reward | Club OWNER/ADMIN | `club rewards create` | `create_club_reward` | `/club/rewards` | `rewards` | implemented |
| List club rewards | Club member | `club rewards list` | `rewards` read by club | `/club/rewards` | `rewards` | implemented |
| List plans | All | `plans list` | `plans` + `plan_entitlements` read | `/plans` | `entitlements` | implemented |
| List orders | Club OWNER/ADMIN/STAFF | `club orders list` | `list_club_orders` | `/club/orders` | `match-day` | implemented |
| List attendees | Club OWNER/ADMIN/STAFF | `club attendees list` | `list_club_attendees` | `/club/attendees` | `nominal-ticketing` | verified |
| Check in ticket | Club OWNER/ADMIN/STAFF | `club tickets check-in` | `check_in_ticket` | `/club/check-in` | `match-day` | verified |
| Box-office sale | Club OWNER/ADMIN/STAFF | `club box-office sell` | `box_office_sell` | `/club/box-office` | `box-office` | implemented |
| Issue fan card | Club OWNER/ADMIN | `club fan-cards issue` | `issue_club_fan_card` | `/club/fan-cards` | `fan-cards` | implemented |
| List fan cards | Club OWNER/ADMIN | `club fan-cards list` | `list_club_fan_cards` | `/club/fan-cards` | `fan-cards` | implemented |
| Enable predictions | Club OWNER/ADMIN | `club predictions enable` | `set_prediction_enabled` | `/club/events/[id]` | `predictions` | implemented |
| Resolve market | Club OWNER/ADMIN/STAFF | `club predictions resolve` | `resolve_market` | `/club/events/[id]` | `predictions` | verified |
| Sales summary | Club member | `club analytics summary` | `club_sales_summary` | `/club` | `privacy` | verified |
| Prediction insights | Club OWNER/ADMIN/ANALYST | `club analytics predictions` | `club_prediction_insights` | `/club/analytics` | `privacy` | verified |
| Export analytics | Club OWNER/ADMIN/ANALYST (ELITE) | `club analytics export` | `record_club_export` + CSV | `/api/club/export` | `entitlements` | implemented |
| View plan | Club member | `club plan show` | `get_club_context` | `/club/plan` | `entitlements` | verified |
| Request plan change | Club OWNER | `club plan request` | `request_plan_change` | `/club/plan` | `entitlements` | verified |
| List clubs | Platform admin | `admin clubs list` | `admin_list_clubs` | `/admin/clubs` | `admin` | implemented |
| Assign plan | Platform admin | `admin plans assign` | `admin_assign_plan` | `/admin/clubs/[id]` | `admin` | verified |
| Set subscription status | Platform admin | `admin subscription status` | `admin_set_subscription_status` | `/admin/clubs/[id]` | `admin` | implemented |
| View audit | Platform admin | `admin audit list` | `admin_list_audit` | `/admin/audit` | `admin` | verified |
| Health | Ops | `ops health` | `plans` read | n/a | `ops` | implemented |
| Retention cleanup | Ops | `ops cleanup` | `cleanup_completed_trade_requests` | n/a | `ops` | planned |

## Ticket rules

- A ticket is nominative: `ticket_orders` records the buyer; each `tickets` row records the attendee.
- A buyer may purchase at most four tickets per event by default.
- Ticket types may require a fan card, restrict transferability or mark an away sector.
- Digital tickets use a unique code and QR page; check-in is idempotent.
- Attendee identity is event-access data, not financial KYC. It is separate from prediction data.

## Parity gate

The executable test reads this table (or a generated JSON equivalent) and fails when a capability marked `verified` has no CLI command, authorization test or agent scenario. The table is updated in the same pull request as the capability.
