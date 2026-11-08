# E-01 — Delivery and Environment

## 1. Chosen model

The project delivers through **GitHub Flow plus immutable tags**, with
verification on **local Supabase and GitHub Actions**. There is no hosted
production environment.

| Stage | Artifact | Verification |
| :--- | :--- | :--- |
| Change | Branch + pull request | CI `Lint, typecheck and build`, `Domain invariants`, `Delivery smoke` |
| Integration | Merge to `main` | The same CI jobs on `main` |
| Release | Annotated tag `vX.Y.Z` + GitHub Release | Release commit is the tested `main` commit |
| Run | Local/CI start from the tag or `main` | `GET /api/health`, `bun run smoke` |

## 2. Why no cloud deployment

- The course scope does not require a paid service, and no cloud credentials
  are available to the project.
- A real deployment would introduce secrets, cost, domain/TLS and data
  protection decisions that require explicit human approval.
- The delivery path is still exercised: CI starts Supabase, applies migrations,
  builds the app, starts it, waits for health and runs the smoke test on every
  pull request.

This is a **documented choice**, not an accident. Its limit is stated wherever
delivery evidence is claimed: the environment is local/CI, so it does not prove
production availability, TLS, DNS, multi-instance behavior or zero-downtime
rollout.

## 3. Reproducibility

- Toolchain: Bun `1.4.2` in CI; Next.js `16.4.2`; PostgreSQL via local Supabase.
- Migrations are replayed from `supabase/migrations/` by `supabase db reset`.
- CI derives Supabase credentials from `supabase status -o env`; nothing
  sensitive is committed.
- The release tag identifies the exact commit that passed CI.

## 4. What would change for production

A production deployment would require a separate decision covering hosting,
secrets, database provisioning, backups, monitoring, retention and cost. None
of that is implied by this baseline.
