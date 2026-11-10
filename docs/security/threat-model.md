# Threat Model

- **Scope:** MatchPulse MVP, local/CI deployment.
- **Status:** Initial model; not a production security certification.

## 1. Assets

- Points balances, positions and trade history.
- Registration and ticket records.
- Organizer resolution authority.
- Club aggregate analytics and exports.
- Supabase service-role credential (local test/administration only).

## 2. Actors and trust boundaries

| Actor | Trust | May |
| :--- | :--- | :--- |
| Anonymous visitor | Untrusted | Read public tournaments, matches, markets and the identity-free trade feed |
| Fan | Authenticated | Read own private rows; trade/register/claim/redeem own data |
| Organizer | Authenticated + role | Manage own tournaments/matches; resolve own markets |
| Club | Authenticated + role | Read aggregate analytics; export aggregates |
| Service role | Local test/administration | Bypass RLS; never used by the application runtime |
| Database | Trusted boundary | Enforce constraints, RLS, grants and RPC checks |

## 3. Threats and controls

| Threat | Control | Residual |
| :--- | :--- | :--- |
| Anonymous private read/mutation | Anonymous sign-ins disabled; RLS, revoked grants, authenticated-only RPCs | No anonymous identity path; refusal test in the authorization suite |
| Fan reads another fan's rows | Own-row RLS policies; authorization suite | None observed |
| Fan calls organizer/club RPCs | Role checks inside RPCs | None observed |
| Organizer manages another organizer's data | `organizer_id` ownership checks in RPCs | Legacy unlinked markets remain organizer-resolvable |
| Club sees identities | Current club-role RLS; aggregate-only RPCs; cohort threshold 5 | Formal privacy review still required |
| Platform admin reads invitation or fan-card data | No direct table policy; audited scoped RPC required if support access is added | Support access is not implemented |
| Duplicate charge/payout on retry | Request-key idempotency and unique constraints | Legacy null-key path documented |
| Direct table writes bypass rules | Writes revoked; `SECURITY DEFINER` RPCs | Review discipline remains required |
| Service-role key leaks to browser | Architecture guard; runtime uses anon key | Local fixture key must not be deployed |
| Dependency vulnerability | `bun audit` in CI | No scanner covers runtime infrastructure |
| Secret committed | Tracked-file secret scan | Not a replacement for GitHub secret scanning |
| Brute-force login | Supabase Auth local rate limits | Production hardening not claimed |

### 3.1 v3.0.0 threats

| Threat | Control | Residual |
| :--- | :--- | :--- |
| Club A reads or mutates Club B data | Club-scoped RLS, `is_club_member`/`has_club_role`, club-scoped RPCs | None observed in the isolation suite |
| A `STAFF`/`ANALYST` performs an owner-only action | Role checks in every membership/plan RPC | UI may still show a control; the database refuses |
| A `STARTER` club bypasses an entitlement | `has_entitlement`/`require_entitlement` inside RPCs; active subscription required | Plan configuration errors still need review |
| Attendee identity leaks to analysts or another club | Attendee RPC restricted to `OWNER`/`ADMIN`/`STAFF`; aggregate insights exclude identity | Independent privacy review pending |
| Platform admin impersonates or changes fan points | No impersonation RPC; scoped admin RPCs; audit | Support access is not implemented |
| CLI token theft on a shared machine | Profile files `0600`; separate profiles; no service role in user profiles | OS keychain not implemented |
| Ticket oversell or duplicate purchase | Ticket type/event locks, allocation checks, request id, unique order key | High-contention load test not run |
| Fan card or transfer abuse | Fan-card validation, max four, transferable flag and deadline, checked-in tickets cannot transfer | Gate identity check is staff-operated |
| Invite token abuse | Single-use token, expiry, email match, club role check | Local invitation is displayed, not emailed |
| QR code sharing | Unique code + staff check-in; no duplicate attendance | No scanner/identity hardware integration |
| Attendee identity retained forever | Service-role retention cleanup with audit | No scheduled production job or legal review |

## 4. Limits

No production deployment, external penetration test, WAF, centralised audit or incident on-call. The club privacy rule and attendee retention are implemented but not independently reviewed. No real payments or financial KYC are in scope.
