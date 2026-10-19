# AI Transparency Log

Records material AI contributions to MatchPulse: what was intended, what AI was permitted to touch, how the output was verified, and what was corrected, rejected or learned.

Entries are added when work is performed, not in bulk at the end of a period.

---

## Entry 1 — Repository audit against course requirements

**Date:** 2026-10-19
**Tool:** opencode CLI (`space-bunny-free`)
**Intent:** Establish which course deliverables were genuinely supported by the repository, and which were asserted without evidence, before planning further work.
**Boundary:** Read-only. AI inspected files, ran `git`, and probed the local Supabase API. AI did **not** modify code or documentation, and did **not** decide which increment to pursue.
**Verification:** Direct inspection, plus a live probe of the local API at `127.0.0.1:54321` using an arbitrary `apikey`, which returned profile rows and executed `register_for_tournament`. This established the absence of RLS empirically rather than by reading the migration alone.
**Learning:**
- Rejected suggestion: propose switching the first increment to prediction submission, because that path already has a UI. Overruled — Checkpoints A and B are already written around capacity, and switching would invalidate submitted evidence. The human kept capacity.
- Rejected: assume the audit's claim that `AGENTS.md` referenced a non-existent path was correct. On inspection `AGENTS.md` contains no such reference, so nothing was changed. Confirming before acting avoided a false "fix".
- Learned: a test that cannot fail a build is not weak evidence, it is *no* evidence. Both scripts log `FAIL` and exit 0.
- Learned: the human's own environment contradicted the audit's premise — Docker's CLI is not integrated into WSL, but the engine is reachable via `docker.exe`. Assumptions about the environment had to be tested rather than reasoned about.

---

## Entry 2 — Architecture documentation corrections (issue #50)

**Date:** 2026-10-19
**Tool:** opencode CLI (`space-bunny-free`)
**Intent:** Bring the kata and the architectural-characteristics document into line with what the code actually does, and add the measurable targets the course requires.
**Boundary:** AI drafted the changes. The human made every substantive decision: that registration capacity stays the anchor increment; that the kata gains a capacity requirement; that unsupported claims would be **withdrawn rather than softened**; and that the selected set of architectural characteristics would **not** be changed by AI.
**Verification:** Each retained claim was cross-checked against the schema, the migration history and the CI configuration. Every removed claim is listed in the pull request with the reason. The pull request body records the withdrawn claims explicitly so a reviewer can challenge any of them.
**Learning:**
- AI proposed replacing the selected characteristics with a set it considered better. **Rejected** — characteristic selection is a human decision, so the omission of data integrity was instead raised as an open question rather than silently resolved.
- AI proposed softening unsupported claims with hedging language. **Rejected** in favour of explicit withdrawal, because hedged claims remain readable as claims.
- Learned: writing a status vocabulary (`Specified` / `Measured` / `Unverified` / `Not implemented`) made it possible to record honest gaps without the document becoming unreadable or the reader having to guess which statements were load-bearing.

---

## Entry 3 — Methodology document corrections (issue #52)

**Date:** 2026-10-19
**Tool:** opencode CLI (`space-bunny-free`)
**Intent:** Correct reasoning errors and overclaims in the Checkpoint A and B documents, and make the invariant registry match the schema.
**Boundary:** AI corrected the documents. The human decided that existing test transcripts would be labelled **unverified** rather than deleted or replaced, and that the AI-assisted / AI-driven distinction would be resolved in favour of "assisted" rather than keeping the AI-DLC label.
**Verification:** Every invariant status was checked against `supabase/migrations/`. The stock/flow correction was derived from the direction of the actual database operations, not from the prose.
**Learning:**
- AI drafted a replacement stock/flow model in which incoming registration requests were the inflow into *available slots*. **Rejected** — a request does not create capacity. The correct model has no inflow at all, which surfaced a genuinely useful finding: the system has no mechanism to return a cancelled seat, and that is a domain question for the product owner.
- Learned: correcting the flow model changed the diagnosis. Distinguishing a *capacity refusal* from a *resource failure* is only possible if both are correctly placed relative to the stock; the earlier model had collapsed them into one number.
- Learned: renaming `prediction-lock.test.ts` is not cosmetic. The filename asserted a guarantee the code does not provide, so the name itself was evidence of a claim error.

---

## Entry 4 — Gap in earlier AI disclosure (human action required)

**Date:** 2026-10-19
**Tool:** n/a — recorded by the orchestrator
**Intent:** Record honestly that earlier AI use is **not** fully disclosed.
**Boundary:** No disclosure was invented on the human's behalf.
**Verification:** `docs/methodology/ai-transparency-log.md` existed with an empty table. The commit history shows the Checkpoint A and B documents, the ADR, the characteristics document and the system overview were all created in single-commit changes consistent with AI-assisted drafting, but **the commits themselves do not record whether AI was involved**, and nothing in the repository establishes it either way.
**Learning:**
- The human owner must complete this entry from their own recollection: which documents were AI-assisted, what was reviewed, and what was corrected. It has been deliberately left as a visible gap rather than filled with a plausible reconstruction.
- This gap is itself portfolio-relevant evidence about a real weakness in the AI-use process, and is better recorded than concealed.

---

## Entry 5 — Schema enforcement (issue #51, PR #58)

**Date:** 2026-10-19
**Tool:** opencode CLI (`space-bunny-free`)
**Intent:** Make INV-01 and INV-02 real in the database rather than asserted in prose.
**Boundary:** AI designed the migration and rewrote the registration function. The human decided the depth (audit Priorities 1–3 plus database integrity), and explicitly kept authentication, RLS, points accounting and the kickoff guard out of scope.
**Verification:** All migrations replayed onto an empty schema against PostgreSQL 17.11, then seed. Observed: duplicate registration refused without raising; capacity enforced; stored rows and counter agree; both CHECK constraints rejected impossible values (counter of 99 and of −1). Confirmed present via `\d tournaments` and `\d registrations`. The verification fixture was deleted afterwards.
**Learning:**
- **Rejected an AI-favoured alternative.** The obvious design is to catch `unique_violation` around the whole function. That would swallow genuine errors as "already registered". The chosen design — pessimistic lock, capacity check, insert in a subtransaction, increment — separates the two failure modes. AI flagged the trade-off; the orchestrator chose, and the reasoning is in the PR for challenge.
- Learned: reasoning about throughput from the code was wasted work. Both the old `UPDATE ... WHERE` and the new `SELECT … FOR UPDATE` take the same row lock, so there was never a throughput difference to debate. Checking first would have saved the argument.
- Learned: fault injection later showed the old capacity guard was **already correct**. The bug was uniqueness alone — a misdiagnosis that had been carried in the documentation through two checkpoints.

---

## Entry 6 — End-to-end registration path (issue #53, PR #59)

**Date:** 2026-10-19
**Tool:** opencode CLI (`space-bunny-free`)
**Intent:** Make the increment genuinely end-to-end instead of a database function plus a script.
**Boundary:** AI implemented the action, route and component. The human had already approved the identity-seam design in the plan. No authentication was introduced, and the existing `retractPrediction` flaw was deliberately left in place rather than fixed inside this PR.
**Verification:** `bunx tsc --noEmit` exit 0, `bun run lint` clean, `bun run build` succeeds. End-to-end against the running app: an empty tournament rendered "32 of 32 places left"; registering moved it to "31 of 32" and showed "Your place is confirmed"; a duplicate was refused; a burst of 35 concurrent requests filled the remaining 31 places with 4 refusals and 0 errors, leaving 32 stored rows against a counter of 32; the page then rendered "Full — all 32 places taken".
**Learning:**
- **A build failure was caught only by running the build.** With `cacheComponents: true`, awaiting route `params` in the page component blocks prerendering. Reading the code did not reveal it; `bun run build` did.
- **Rejected an AI suggestion to fix `retractPrediction` in the same PR.** It is a real authorisation flaw, but fixing it would have widened a PR whose approved scope was the registration path. Recorded as INV-05 instead, so the fix is deliberate later rather than accidental now.
- Learned: WSL interop (`UtilAcceptVsock`) failed during this session. Docker became unreachable while the Supabase API stayed available over TCP. Cleanup was completed through the REST API and verified, rather than assumed done.

---

## Entry 7 — Enforceable tests and CI (issue #54, PR #60)

**Date:** 2026-10-19
**Tool:** opencode CLI (`space-bunny-free`)
**Intent:** Make the evidence capable of failing, then prove it, so the portfolio rests on something enforceable.
**Boundary:** AI wrote the tests and the CI job. The decision to **reopen** the behaviour claim and rebuild the evidence from scratch — rather than patch around the existing transcript — was made earlier by the human and is what this entry implements. The decision to add `@types/bun` was surfaced in the PR rather than made silently.
**Verification:** 7 pass / 0 fail / exit 0 locally and in CI. Fault injection, both reverted: reintroducing the uniqueness defect gave `Expected: 1, Received: 10` with exit 1; removing the capacity guard gave `Expected: 32, Received: 100` on responses and `Expected: <= 32, Received: 100` on committed state, exit 1. The CI job log confirms all seven named tests executed against a live Supabase instance with credentials read from `supabase status -o env`.
**Learning:**
- **The most valuable single result was a negative one.** Under the uniqueness injection, the capacity tests still passed. The original capacity guard was correct; the documentation had blamed capacity for a defect that lived in uniqueness. AI surfaced this as a finding rather than quietly fixing the tests to match the old claim.
- Learned: an earlier AI-favoured framing — "green tests prove the invariant" — was rejected. Green proves the harness ran. Only observed failure proves it can detect.
- Learned: injecting a defect was harder than writing the test, because it needed SQL access while Docker interop was down. Using a temporary Postgres client outside the repository avoided adding a project dependency for a one-off verification. That workaround is recorded in the PR rather than left implicit.
- Learned: a rename can be a correctness fix. `prediction-lock.test.ts` asserted kickoff enforcement that does not exist; the file only ever tested duplicate prevention.

---

## Entry 8 — Reproducibility (issue #55, PR #61)

**Date:** 2026-10-19
**Tool:** opencode CLI (`space-bunny-free`)
**Intent:** Make the project followable by another person from the README alone.
**Boundary:** AI fixed Dockerfile, Compose, `.dockerignore` and README. The decision to delete `release.env` rather than populate it was made by the orchestrator and flagged as breaking in the PR.
**Verification:** `docker build .` succeeds; the built image contains no `.env` file or PEM; lint, typecheck, tests and production build all pass; every document link in the README resolves; README environment variable names match `src/lib/supabase.ts` exactly.
**Learning:**
- **A build failure was caught only by running the build.** A bare `docker build .` failed during page-data collection because `src/lib/supabase.ts` throws at module load. Reading the Dockerfile did not reveal it.
- Learned: the honest fix was placeholders at build time and real values at runtime — justified by the fact that all Supabase access is server-side. Writing that down matters more than the fix, because the alternative (lazy client construction) was considered and would have changed imports across five files for no benefit here.
- **Unverified, and left so:** the built container was never observed serving a request, because Docker interop failed again. It is reported as unverified in the PR rather than assumed to work.

---

## Entry 9 — Consistency audit of the completed cycle (issue #63)

**Date:** 2026-10-19
**Tool:** opencode CLI (`space-bunny-free`)
**Intent:** Establish whether the seven merged PRs left the repository consistent — documentation matching implementation, no stale claims — before new work.
**Boundary:** Read-only audit plus an approved remediation slice. The human approved remediation on 2026-10-19 ("okay good") and separately initiated a product pivot; remediation stayed strictly within the audit's findings.
**Verification:** Three layers cross-checked rather than trusting any one: documents read against code; code read against the live database (constraint and grant counts queried via `psql`); issue/PR state read from GitHub (6 closed, 7 merged, `main` green). Secret hygiene re-verified: `release.env` in history contains only `APP_VERSION`/`NODE_ENV`; `.env.local` was never committed. Confirmed findings: three stale status claims in `02-architecture-characteristics.md` (§3.1, §3.3, §7), one in ADR-001, a false seam claim in `session.ts`, a mislabeled "Kickoff Lock (Invariant 1)" comment in the init migration, an order-of-operations comment contradicting the code in the integrity migration, and a nullable `current_players` that quietly contradicted the "unrepresentable" claim. Non-findings recorded too: the `rg -r` flags initially mis-displayed matches as corruption — re-run without the flag before concluding anything.
**Learning:**
- Learned: green merges do not update stale prose. Every PR in the previous cycle was green and individually correct, and documentation drift still accumulated — nothing in CI checks that narrative documents keep up with code.
- Learned: the strongest audit findings were *representability* claims — a CHECK constraint that passes on NULL. Reading the migration text was not enough; the live schema query is what put a number on it (`rls_enabled_tables=0`, `grant_to_anon=35`).
- Unverified, and left so: the built container has never been observed serving a request (Docker WSL interop failures in both sessions). Remains honestly unfinished.

---

## Standing rule

AI may investigate, analyse, draft, implement within an approved scope, and run verification. The human retains every decision that affects business rules, architecture, schema, scope, priority, risk acceptance and merging. Contributions that cannot be verified are recorded as unverified rather than asserted.

Merges in this cycle were performed by AI on the human owner's explicit instruction ("proceed with the full implementation", following a plan that listed merging as authorised). Each merge was gated on a green CI run and is individually reported. No commit in this cycle was self-approved by the reviewing party, and no branch protection was enabled.