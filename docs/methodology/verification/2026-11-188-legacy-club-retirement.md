# Verification Record — Legacy CLUB Retirement (FND-023 / #188)

- **Issue:** [#188](https://github.com/match-pulse/match-pulse/issues/188)
- **PR:** Pending
- **Date:** 2026-11-10
- **Environment:** Local Fedora 44; Bun 1.4.2; local Supabase PostgreSQL 17.11; Playwright Chromium
- **Status:** Verified — implementation and local evidence; human decision owner confirmed the campaign
- **Verifier:** Implementation Agent / Test Engineer (evidence); Human developer (final verification, 2026-11-10)

## 1. Claim or Acceptance Criterion

FND-023: no self-service legacy `CLUB` role, page, export route or unscoped analytics RPC remains; the v3 club-scoped dashboard and export are the only club analytics path.

## 2. Method

- Removed `src/app/club/page.tsx`, `src/app/api/club/export/route.ts` and `scripts/create-club.ts`.
- Removed the `CLUB` role from the session profile type, login UI, home routing, shell navigation, test auth helper and fixtures.
- Added migration `20261213_retire_legacy_club.sql` to convert existing `CLUB` profiles to `FAN`, tighten the profile role constraint and drop the legacy analytics/export RPCs.
- Removed the legacy club analytics integration and E2E tests; the v3 club dashboard/export tests remain.
- Ran the full database, CLI and E2E suites.

## 3. Command or Evidence

```text
bun run test
55 pass / 0 fail, 457 expect() calls

bun run test:agent
2 pass / 0 fail, 30 expect() calls

PLAYWRIGHT_BASE_URL=http://127.0.0.1:3001 bun run test:e2e
9 passed

bun run build (local .env.local)
passed

bun run typecheck / lint / check:architecture
passed
```

The database reset applied `20261213_retire_legacy_club.sql` before the suite. The v3 club dashboard/event/export E2E and accessibility checks remain green.

## 4. Result

- No `/club` page, `/api/club/export` route, `CLUB` role, `club_analytics_summary`, `club_analytics_timeseries` or legacy `record_club_export(TEXT, JSONB)` remains.
- Existing `CLUB` fixture profiles are converted to `FAN`; the profile constraint now allows only `FAN` and `ORGANIZER`.
- The v3 club dashboard and `/api/club/export-v3` remain the club analytics path.
- FND-023 is Verified.

## 5. Limitations

- The legacy routes were local-fixture compatibility paths; no production data migration was exercised beyond the local reset.
- Local/CI evidence only; production deployment is the final post-MVP step.
- The local E2E run used port 3001 because an unrelated root-owned Next server occupied port 3000; the app itself was the current build.

## 6. Links

- Issue: [#188](https://github.com/match-pulse/match-pulse/issues/188)
- PR: Pending
- Findings register: FND-023
- Audit: AUD-015
- AI transparency entry: Entry 63
- Related: [final campaign verification](2026-11-173-audit-remediation.md)

## 7. Addenda

Pending PR link.
