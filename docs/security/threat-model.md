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
| Anonymous private read/mutation | RLS, revoked grants, authenticated-only RPCs | None observed in CI |
| Fan reads another fan's rows | Own-row RLS policies; authorization suite | None observed |
| Fan calls organizer/club RPCs | Role checks inside RPCs | None observed |
| Organizer manages another organizer's data | `organizer_id` ownership checks in RPCs | Legacy unlinked markets remain organizer-resolvable |
| Club sees identities | Aggregate-only RPCs; cohort threshold 5; no private table reads | Formal privacy review still required |
| Duplicate charge/payout on retry | Request-key idempotency and unique constraints | Legacy null-key path documented |
| Direct table writes bypass rules | Writes revoked; `SECURITY DEFINER` RPCs | Review discipline remains required |
| Service-role key leaks to browser | Architecture guard; runtime uses anon key | Local fixture key must not be deployed |
| Dependency vulnerability | `bun audit` in CI | No scanner covers runtime infrastructure |
| Secret committed | Tracked-file secret scan | Not a replacement for GitHub secret scanning |
| Brute-force login | Supabase Auth local rate limits | Production hardening not claimed |

## 4. Limits

No production deployment, external penetration test, WAF, centralised audit or incident on-call. The club privacy rule is implemented but not independently reviewed.
