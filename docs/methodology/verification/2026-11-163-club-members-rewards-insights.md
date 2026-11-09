# Verification — v3 Club Members, Rewards, Insights and Market Resolution

- **Date:** 2026-11-09
- **Issue:** #163 (part of #153)
- **Pull request:** #164
- **CI run:** [42622546311](https://github.com/match-pulse/match-pulse/actions/runs/42622546311)
- **Scope:** member invitations and roles, fan-card list, club rewards, aggregate prediction insights, ELITE CSV export, v3 fan rewards, market resolution and the admin fixture
- **Related:** [Execution plan](../exec-plans/153-v3-club-subscriptions.md), [ADR-007](../../architecture/adr/007-club-tenancy-and-entitlements.md), [ADR-010](../../architecture/adr/010-nominal-ticketing-and-attendee-identity.md), [capability manifest](../../testing/capabilities.md)

## 1. What was verified

- A club owner can open `/club/dashboard`, see members, invite a member, change a role and remove a member; the invite page accepts the token.
- The owner can issue and list fan cards.
- A PRO club can create a club reward; the fan rewards page lists club rewards and redeems one.
- The PRO dashboard shows aggregate prediction insights with suppression and no attendee identity.
- An ELITE dashboard exposes the aggregate CSV export route; the export is audited and refuses non-ELITE/STAFF callers.
- A club owner can resolve an open prediction market; the CLI test confirms one holder is paid.
- The platform admin page lists clubs, plans and audit; the admin fixture signs in through email/password.
- The v3 pages pass the serious/critical axe gate.
- The existing fan, organizer and legacy club journeys remain green.

## 2. Observed results

| Check | Result |
| :--- | :--- |
| `E2E and accessibility` | **11 passed** |
| `Domain invariants` | 41 pass / 0 fail |
| `test:agent` | 2 pass / 0 fail |
| `Lint, typecheck and build` | passed |
| `Delivery and recovery` | passed |
| `Fault injection` | passed |

## 3. Defects found and fixed during verification

No new defect was observed in the final run. The market-resolution CLI scenario and the admin fixture were added and passed on the first run.

## 4. Limits

- The invite token is shown on the dashboard because email delivery is disabled locally; production would send an email.
- The QR code is represented by the entry code, not a rendered QR image or wallet pass.
- The ELITE export is CSV of aggregate sales/predictions; it is not a full data warehouse export.
- No real payments, financial KYC, hosted deployment or production recovery is claimed.
- FND-007 and FND-008 remain open human gates.

## 5. Conclusion

The club-facing v3 UI, rewards, aggregate insights, export, admin console and market resolution are verified at the local/CI boundary.
