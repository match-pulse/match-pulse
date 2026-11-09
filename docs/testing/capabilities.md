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
| Fan sign-up | Public | `auth signup` | Supabase Auth + `profiles` trigger | `/signup` | `auth` | planned |
| Sign in | All | `auth login` | Supabase Auth | `/login` | `auth` | planned |
| Sign out | All | `auth logout` | Supabase Auth | top bar | `auth` | planned |
| Current identity | All | `auth whoami` | `profiles`, `club_members`, `platform_admins` | context switcher | `auth` | planned |
| List public events | Public/Fan | `fan events list` | `public_events` view | `/events` | `match-day` | planned |
| Show event | Public/Fan | `fan events show` | `public_event` view | `/events/[id]` | `match-day` | planned |
| Buy nominal tickets | Fan | `fan tickets buy` | `purchase_ticket` | `/events/[id]/checkout` | `match-day` | planned |
| List my tickets | Fan | `fan tickets list` | `my_tickets` view | `/fan/tickets` | `match-day` | planned |
| Show my ticket / QR | Fan | `fan tickets show` | `my_ticket` view | `/fan/tickets/[id]` | `match-day` | planned |
| Transfer ticket | Fan | `fan tickets transfer` | `transfer_ticket` | `/fan/tickets/[id]/transfer` | `transfers` | planned |
| Enter prediction | Fan | `fan predictions enter` | `open_trade` | `/market/[id]` | `predictions` | planned |
| Exit prediction | Fan | `fan predictions exit` | `close_trade` | `/market/[id]` | `predictions` | planned |
| Portfolio | Fan | `fan portfolio show` | `my_portfolio` view | `/fan/portfolio` | `predictions` | planned |
| List rewards | Fan | `fan rewards list` | `club_rewards` read | `/fan/rewards` | `rewards` | planned |
| Redeem reward | Fan | `fan rewards redeem` | `redeem_reward` | `/fan/rewards` | `rewards` | planned |
| Create club | Fan/Organizer | `club create` | `create_club` | `/club/new` | `club-onboarding` | planned |
| Update club | Club OWNER/ADMIN | `club update` | `update_club` | `/club/settings` | `club-onboarding` | planned |
| Switch club | Club member | `club switch` | membership list | context switcher | `club-onboarding` | planned |
| Invite member | Club OWNER/ADMIN | `club members invite` | `invite_club_member` | `/club/members` | `club-onboarding` | planned |
| List members | Club member | `club members list` | `club_members` read | `/club/members` | `club-onboarding` | planned |
| Change member role | Club OWNER/ADMIN | `club members role` | `set_club_member_role` | `/club/members` | `authorization` | planned |
| Remove member | Club OWNER/ADMIN | `club members remove` | `remove_club_member` | `/club/members` | `authorization` | planned |
| Create event | Club OWNER/ADMIN/STAFF | `club events create` | `create_event` | `/club/events/new` | `match-day` | planned |
| Update event | Club OWNER/ADMIN/STAFF | `club events update` | `update_event` | `/club/events/[id]` | `match-day` | planned |
| Publish event | Club OWNER/ADMIN/STAFF | `club events publish` | `publish_event` | `/club/events/[id]` | `match-day` | planned |
| Create ticket type | Club OWNER/ADMIN/STAFF | `club ticket-types create` | `create_ticket_type` | `/club/events/[id]` | `match-day` | planned |
| List orders | Club OWNER/ADMIN/STAFF | `club orders list` | `club_orders` read | `/club/orders` | `match-day` | planned |
| List attendees | Club OWNER/ADMIN/STAFF | `club attendees list` | `club_attendees` read | `/club/attendees` | `nominal-ticketing` | planned |
| Check in ticket | Club OWNER/ADMIN/STAFF | `club tickets check-in` | `check_in_ticket` | `/club/check-in` | `match-day` | planned |
| Box-office sale | Club OWNER/ADMIN/STAFF | `club box-office sell` | `box_office_sell` | `/club/box-office` | `box-office` | planned |
| Issue fan card | Club OWNER/ADMIN | `club fan-cards issue` | `issue_club_fan_card` | `/club/fan-cards` | `fan-cards` | planned |
| List fan cards | Club OWNER/ADMIN | `club fan-cards list` | `club_fan_cards` read | `/club/fan-cards` | `fan-cards` | planned |
| Enable predictions | Club OWNER/ADMIN | `club predictions enable` | `set_prediction_enabled` | `/club/events/[id]` | `predictions` | planned |
| Sales summary | Club member | `club analytics summary` | `club_analytics_summary` | `/club` | `privacy` | planned |
| Prediction insights | Club OWNER/ADMIN/ANALYST | `club analytics predictions` | `club_prediction_insights` | `/club/analytics` | `privacy` | planned |
| Export analytics | Club OWNER/ADMIN/ANALYST (ELITE) | `club analytics export` | `record_club_export` + CSV | `/api/club/export` | `entitlements` | planned |
| View plan | Club member | `club plan show` | `club_subscription` read | `/club/plan` | `entitlements` | planned |
| Request plan change | Club OWNER | `club plan request` | `request_plan_change` | `/club/plan` | `entitlements` | planned |
| List clubs | Platform admin | `admin clubs list` | `admin_clubs` read | `/admin/clubs` | `admin` | planned |
| Assign plan | Platform admin | `admin plans assign` | `admin_assign_plan` | `/admin/clubs/[id]` | `admin` | planned |
| Set subscription status | Platform admin | `admin subscription status` | `admin_set_subscription_status` | `/admin/clubs/[id]` | `admin` | planned |
| View audit | Platform admin | `admin audit list` | `audit_events` read | `/admin/audit` | `admin` | planned |
| Health | Ops | `ops health` | `/api/health` | n/a | `ops` | planned |
| Retention cleanup | Ops | `ops cleanup` | `cleanup_completed_trade_requests` | n/a | `ops` | planned |

## Ticket rules

- A ticket is nominative: `ticket_orders` records the buyer; each `tickets` row records the attendee.
- A buyer may purchase at most four tickets per event by default.
- Ticket types may require a fan card, restrict transferability or mark an away sector.
- Digital tickets use a unique code and QR page; check-in is idempotent.
- Attendee identity is event-access data, not financial KYC. It is separate from prediction data.

## Parity gate

The executable test reads this table (or a generated JSON equivalent) and fails when a capability marked `verified` has no CLI command, authorization test or agent scenario. The table is updated in the same pull request as the capability.
