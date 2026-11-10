# Decision Record — Production Deployment Is the Final Post-MVP Step

- **Finding:** FND-006
- **Issue:** [#202](https://github.com/match-pulse/match-pulse/issues/202)
- **Status:** Approved by the human decision owner
- **Date:** 2026-11-10
- **Decision owner:** Human developer

## Decision

Vercel + hosted Supabase production deployment is the **final step** of the project. It is not part of the current MVP hardening work and must not start until the MVP is complete and accepted.

## Rationale

- The MVP still has product and verification work; deploying now would freeze an incomplete contract.
- Hosted deployment adds secrets, cost, data-protection, backup and monitoring obligations that are only meaningful once the MVP is stable.
- Local/CI delivery already verifies the database, authorization, market, ticketing, reward and privacy contracts. Production is a delivery step, not a substitute for MVP correctness.

## Consequences

- FND-006 remains **Deferred** until the hosted environment, observability and production recovery are executed and verified.
- No production URL, TLS, DNS, availability, load or recovery claim is made now.
- The detailed precondition and deployment checklist is in [`docs/operations/production-deployment.md`](../../operations/production-deployment.md).
- Local/CI delivery evidence remains valid and is not withdrawn.

## Exit criteria

FND-006 can move to Verified only after the hosted deployment, monitoring, hosted smoke/load check and backup/restore drill are completed and recorded.
