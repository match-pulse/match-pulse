# Production Deployment — Final Post-MVP Step

- **Status:** Deferred — not started
- **Decision date:** 2026-11-10
- **Decision owner:** Human developer
- **Related:** [Runbook](./runbook.md), [FND-006](../methodology/findings-register.md), issue [#202](https://github.com/match-pulse/match-pulse/issues/202)

## Decision

Production deployment to Vercel and hosted Supabase is the **final step** of the project. It is deliberately **not** part of the current MVP hardening work and must not be started until the MVP is complete and accepted.

The current scope is local/CI delivery. The application is not deployed, has no production credentials, no hosted database, no TLS/DNS, no external monitoring and no production recovery evidence. No availability, latency or recovery claim applies to production.

## Why this order

- The MVP still needs product and verification work; deploying now would freeze an incomplete contract.
- A hosted environment adds secrets, cost, data protection, backup/restore and monitoring obligations that are only meaningful once the MVP is stable.
- The local/CI stack already proves the database, authorization, market, ticketing, reward and privacy contracts. Production is a delivery step, not a substitute for MVP correctness.

## Preconditions before starting

1. The MVP scope is complete and accepted by the human decision owner.
2. Every finding except this production-deployment deferral is Verified, or has an explicit human-approved disposition.
3. Security and privacy review of the hosted configuration is complete.
4. A release candidate is tagged and CI is green on `main`.
5. Hosting accounts, domain, secrets and a cost budget are approved.
6. A backup/restore and rollback plan exists for the hosted database.

## Deployment outline

1. Provision hosted Supabase (project, region, database password, network restrictions).
2. Apply `supabase/migrations/` in order; enable `pg_cron` for subscription expiry.
3. Configure Vercel with the production environment variables; never expose the service-role key to the browser.
4. Configure TLS, DNS and the production URL.
5. Run smoke, health, authorization and a small read-only production check.
6. Enable log retention, uptime monitoring, an alert channel and a dashboard.
7. Run a hosted backup/restore drill; record RTO/RPO and update the runbook.
8. Run the p95 burst against the hosted environment; record the result.
9. Publish the release notes and update the changelog/version.

## What is explicitly not claimed now

- No hosted URL, TLS, DNS or production availability.
- No production data, backup, PITR, retention or off-site storage.
- No external log collector, metrics, tracing, dashboard or alerting.
- No production recovery drill or RTO/RPO.
- No production load or multi-instance capacity claim.

## Exit criteria for FND-006

FND-006 remains **Deferred** until the steps above are executed and verified. Local/CI delivery evidence is recorded in the [delivery verification](../methodology/verification/2026-11-111-delivery-operations-baseline.md) and [recovery drill](../methodology/verification/2026-11-117-recovery-drill.md); those records do not claim production.
