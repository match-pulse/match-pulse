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

## Entry 4 — Initial design: human-authored; AI used for brainstorming and research

**Date:** 2026-10-19
**Tool:** n/a — owner disclosure, recorded by the orchestrator
**Intent:** Disclose AI use during the initial design phase, which an earlier version of this log left unrecorded.
**Boundary:** The owner confirms that the initial design — including the Checkpoint A and B documents, ADR-001, the architecture characteristics document and the system overview — was authored by the human solo developer. During that phase AI was used only for brainstorming and research, not to draft the documents.
**Verification:** The earlier version of this log left this entry open. No contemporaneous record exists, so the completion rests on the owner's recollection and is not independently verified. The previous inference that single-commit changes indicated AI-assisted drafting is withdrawn: commit shape cannot establish authorship.
**Learning:**
- The disclosure gap was real, but the suspected cause was wrong. The initial design was human-authored; the missing entry reflected an unrecorded process, not undisclosed AI drafting.
- AI input during brainstorming and research is still AI use and belongs in the log, even when no text was adopted.
- AI use should be recorded when it happens. Retrospective disclosure relies on memory and cannot be independently checked.

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
- Learned: the fix at the time used placeholders at build time and real values at runtime, on the assumption that server-side access made runtime values authoritative. **Corrected in Entry 15:** Next.js inlines `NEXT_PUBLIC_*` at build time, so the current configuration requires the values as build arguments. The alternative (lazy client construction) was considered and rejected for this scope.
- **Unverified at the time:** the built container was never observed serving a request because Docker interop failed again. **Resolved in Entry 15:** the container served the seeded market.

---

## Entry 9 — Consistency audit of the completed cycle (issue #63)

**Date:** 2026-10-19
**Tool:** opencode CLI (`space-bunny-free`)
**Intent:** Establish whether the seven merged PRs left the repository consistent — documentation matching implementation, no stale claims — before new work.
**Boundary:** Read-only audit plus an approved remediation slice. The human approved remediation on 2026-10-19 and separately initiated a product pivot; remediation stayed strictly within the audit's findings.
**Verification:** Three layers cross-checked rather than trusting any one:
- Documents read against code.
- Code read against the live database (constraint and grant counts via `psql`).
- Issue/PR state read from GitHub (6 closed, 7 merged, `main` green).

Secret hygiene re-verified: `release.env` in history contains only `APP_VERSION`/`NODE_ENV`; `.env.local` was never committed. Confirmed findings: three stale status claims in `02-architecture-characteristics.md` (§3.1, §3.3, §7), one in ADR-001, a false seam claim in `session.ts`, a mislabeled "Kickoff Lock (Invariant 1)" comment in the init migration, an order-of-operations comment contradicting the code in the integrity migration, and a nullable `current_players` that quietly contradicted the "unrepresentable" claim. Non-findings recorded too: the `rg -r` flags initially mis-displayed matches as corruption — re-run without the flag before concluding anything.
**Learning:**
- Learned: green merges do not update stale prose. Every PR in the previous cycle was green and individually correct, and documentation drift still accumulated — nothing in CI checks that narrative documents keep up with code.
- Learned: the strongest audit findings were *representability* claims — a CHECK constraint that passes on NULL. Reading the migration text was not enough; the live schema query is what put a number on it (`rls_enabled_tables=0`, `grant_to_anon=35`).
- **Unverified at the time:** the built container had never been observed serving a request (Docker WSL interop failures in both sessions). **Resolved in Entry 15.**

---

## Entry 10 — Live market pivot and contract documents (issues #64–#68)

**Date:** 2026-10-19
**Tool:** opencode CLI (`deepseek-v4.1-flash-free`)
**Intent:** Record the owner's pivot from fixed-score predictions to a live credit market and make the documents the contract for the next slices.
**Boundary:** The owner made every domain decision: window opens at kickoff, three outcomes, LMSR, zero commission, cooldown ladder/decay, database enforcement. AI rewrote the kata and overview, added ADR-002, updated the invariants and characteristics, the AGENTS domain rules, the execution plan, and the issue/commit/PR text standard. No implementation or test evidence is claimed here.
**Verification:** Documents cross-checked against the decision register (D1–D9); a sweep of the touched files found no remaining pre-kickoff deadline claims; the plan marks V1–V37 as planned checks, not results. M-INV1–M-INV8 are labeled **Specified**, not Verified; enforcement is deferred to #65/#66. Issues #63–#68 were rewritten in the brief format with a claim type after the owner flagged that the GitHub Claim Type picker had been left empty. The repository API exposed only Task/Bug/Feature at the time, so the four custom claim types could not be set programmatically; the type was recorded in each issue body and the picker still needed a manual selection. **Resolved in Entry 14:** the four types were created at organization level and assigned to every issue.
**Learning:**
- AI first mapped "claim type" to the methodology labels. The owner corrected that the four values are the GitHub issue-type picker (Problem/Behaviour/Outcome/ADR); the standard now requires the type in the issue body and in one PR line.
- Rejected: inventing a commission or maker fee to absorb rounding — the owner's no-commission rule is the constraint, and dust is left uncredited.
- Rejected: an order book, constant-product maker and parimutuel pool; each conflicts with guaranteed liquidity at kickoff or with free exits during the match.
- Kept honest: documents-only changes move no invariant to Verified, and the verification table states planned checks rather than observed results.

---

## Entry 11 — LMSR market engine and pricing suite (issue #65, PR #71)

**Date:** 2026-10-19
**Tool:** opencode CLI (`deepseek-v4.1-flash-free`)
**Intent:** Implement the owner-approved market engine — schema, LMSR pricing, entry and exit RPCs — with a suite that pins the pricing and bookkeeping rules.
**Boundary:** The engine rules were already fixed by D4–D8; AI implemented them in `supabase/migrations/20261021_market_core.sql` and `tests/invariants/market-pricing.test.ts`. No new domain rule was introduced, and no invariant was moved to Verified.
**Verification:** Five pricing tests passed locally (budget entry with `ceil` debit, profit and proportional-loss exits, over-sell and overspend refusals, Σ shares = `q`) and in CI, which replays every migration onto an empty schema. The migration was applied locally through the TCP SQL fallback because Docker interop was down, followed by `NOTIFY pgrst, 'reload schema'`. The registry moved M-INV2/3/5/8 to **Enforced, unverified** and M-INV7 to partial.
**Learning:**
- AI's first `close_trade` draft locked the position before the profile, contradicting the approved lock order (market → profile → cooldown → position). Checking the code against D9 caught it before commit; a deadlock would not have shown in a single-user test.
- While writing the cooldown tests, AI found the engine accepts a retried request after the cooldown expires as a new entry, because there are no idempotency keys. This was recorded as a gap rather than silently patched, since a retry key is a new decision.
- Kept honest: passing tests moved nothing to `Verified`; only observed failure under injection would.

---

## Entry 12 — Resolution, lifecycle and concurrency evidence (issue #66, PR #72)

**Date:** 2026-10-19
**Tool:** opencode CLI (`deepseek-v4.1-flash-free`)
**Intent:** Make resolution terminal and payout-once, and obtain evidence that the window, cooldown and double-spend rules hold under races — including observing the suites fail.
**Boundary:** One migration (`20261022_market_resolution.sql`) and two suites, inside the approved plan and lock order. Fault injections were applied only to the local database; no rule was changed to make a test pass.
**Verification:** Four lifecycle and two concurrency tests passed. Three injections were then observed red: (A) with the profile lock and point guards removed, both 50-point spends were accepted and the balance reached **−40**; (B) with the terminal check removed and the payout key dropped, a second resolution was accepted; (C) with the cooldown refusal removed, 10 of 10 burst entries were accepted. Each was reverted by re-applying the original function, constraint or migration, and the suite returned green. M-INV4, M-INV6 and the M-INV7 gate moved to **Verified**.
**Learning:**
- Injection A initially turned the test red for the wrong reason: the `points_after >= 0` trade check rolled the transaction back and still showed a non-negative balance. Only after also removing that check did the double-spend become visible. Layered guards can mask each other; the transcript records what each layer proves.
- The concurrency burst test exercises M-INV7 but sits in a suite named for M-INV4; the registry quotes the observed failure line as printed rather than tidying it.
- Injection evidence is local-database evidence. CI replays migrations and proves the restored code, not each injected run.

---

## Entry 13 — Market UI, prediction retirement and evidence wrap (issues #67–#68, PR #73)

**Date:** 2026-10-19
**Tool:** opencode CLI (`deepseek-v4.1-flash-free`)
**Intent:** Deliver the market UI, retire the fixed-score feature completely, and close the plan with statuses that match the evidence.
**Boundary:** `src/app/market/[id]/page.tsx`, `src/app/actions/market.ts`, `src/components/MarketTrader.tsx`, `supabase/seed.sql`, the deletion of the predict route/actions/components/suite, `20261023_retire_predictions.sql` (drops `predictions` and `submit_prediction`), and documentation. No authentication, no new domain rule, no new dependency.
**Verification:** Lint, typecheck and build clean; 16 tests across 5 files green; CI green on the PR. A production `next start` smoke run: `/` answered 307 → the seeded market; the market page answered 200 with the match, "Live — the market is open", the buy form, the 200-point balance and an invalid-id path. The registry, README, checkpoint A and the system-overview states were updated to match the delivered code.
**Learning:**
- The React purity lint rejected `Date.now()` inside the server component; the time check moved to a helper. Worth remembering that this is display-only — the database window guard remains the enforcement.
- Rejected adding a browser-automation dependency for a click-through; it would need owner approval and is disproportionate here. V35 is therefore recorded as **partial**, not passed.
- Left standing: no idempotency keys (a retry after cooldown expiry is a new entry) and p95 latency unmeasured. The container was later observed serving the seeded market (Entry 15).

---

## Entry 14 — Compliance audit and remediation: code map, flow evidence, decisions, real issue types (issues #75–#78, PRs #79–#82)

**Date:** 2026-10-19
**Tool:** opencode CLI (`deepseek-v4.1-flash-free`)
**Intent:** Close the gaps found when auditing the repository against the course deliverables: a missing code map, checkpoint B claiming flow evidence that did not exist, unresolved architecture-characteristics decisions, and an issue picker that could not hold the project's claim types.
**Boundary:** One issue and one focused PR per slice; documentation, issue and PR text, issue types, repository transfer and settings. No application code, schema, RLS or CI behaviour changed. The owner approved the slices, the description wording, the protection payload and the merge instruction.
**Verification:**
- Slices A–C merged as #79–#81; slice D merged as #82 after CI. Locally lint, typecheck and build were clean and 16 tests passed. CI runs 39304566313, 39304570357, 39304579082 and 39304586382 were green; the first #82 attempt failed at Supabase CLI setup on a release-resolution rate limit and passed on rerun.
- Four issue types were created in the `match-pulse` organization after the owner granted `admin:org`. All 39 issues were re-read through GraphQL with a non-null type (8 ADR, 31 Behaviour); #50–#55 now carry the mirrored line; #75–#78 were closed manually because the PR-body closing keywords did not fire (observed, cause not investigated).
- The repository moved to `match-pulse/match-pulse`; the remote, description, nine topics and protection were re-read at the new owner. Protection requires both CI jobs, linear history, and forbids force-push and deletion; administrator bypass is allowed on the owner's decision.
**Learning:**
- Issue types are organization-only. With the `user` scope the types could be created on the personal account, but every assignment mutation returned null while `GET /repos/.../issue-types` listed them. The owner chose the transfer (community discussion #175785).
- Mutation payloads can be null while the write succeeds; verification must re-read state rather than trust the response.
- Mapping historical methodology issues onto four claim types is a judgment call. Behaviour was chosen where a verifiable repository change was the only honest fit; issues #1–#39 keep their original bodies without the mirrored line.
- The audit and remediation were performed by the same assistant without an independent agent; the evidence is the rerun checks and the GitHub state, not independent review.

---

## Entry 15 — Overview/domain split, C4 views, Docker repair, cooldown-exit test (issues #83–#85, PRs #86–#88)

**Date:** 2026-10-19
**Tool:** opencode CLI (`deepseek-v4.1-flash-free`)
**Intent:** Separate the system overview from the domain model, provide verifiable C4 and ER views, make the repository description readable, verify the Docker path, and close the test gap for exits during an active entry cooldown.
**Boundary:** Documentation, diagrams, Docker configuration, the repository About description and one test; no domain rule, schema, RLS or application behaviour changed. The owner's instruction that the PRs be completed was treated as the merge instruction.
**Verification:**
- #86: a relative-link scan over README, AGENTS and `docs/architecture` found zero broken links. Context, container and component diagrams plus the ER diagram rendered through mermaid.ink (HTTP 200) and were inspected. The local Mermaid CLI could not run (Chromium lacks `libnspr4` and sudo requires a password); Kroki timed out.
- #87: the image built with the local Supabase values; `/` returned 307 to the seeded market, which returned 200 with "Live — the market is open"; container logs were clean; missing build variables produced the intended required-variable error; `docker compose down` removed the stack. The first run exposed that Next.js inlines `NEXT_PUBLIC_*` at build time: it resolved `placeholder.supabase.co` even though runtime environment entries were set.
- #88: `bun test --env-file=.env.local tests/invariants/market-lifecycle.test.ts` passed 5 tests with 61 assertions, including the new assertion that a full exit succeeds during an active cooldown and leaves the cooldown unchanged. The full suite then passed 17 tests with 160 assertions.
- The repository About description was replaced with a plain-language summary and re-read from the API.
**Learning:**
- The Dockerfile previously claimed runtime environment entries were authoritative for the Supabase values. The observed `ENOTFOUND placeholder.supabase.co` disproved that; the configuration now requires the values as build arguments and the README explains that the image is tied to them.
- The existing cooldown suite exercised the gate, ladder, scope and no-escalation but never asserted the exemption for exits. The new test covers the missing rule without changing the implementation.
- No independent agent reviewed these changes; the evidence is CI and the commands recorded here.

---

## Entry 16 — AI log consistency review

**Date:** 2026-10-19
**Tool:** opencode CLI (`deepseek-v4.1-flash-free`)
**Intent:** Complete Entry 4 from the owner's disclosure and check the whole log for contradictions, stale statements and unclear wording.
**Boundary:** Documentation only. The owner supplied the disclosure; AI edited this log and made no application changes.
**Verification:** Re-read all 15 earlier entries. Completed Entry 4 from the owner's disclosure and corrected stale statements in Entries 8, 9, 10, 13 and 14 by cross-reference. Confirmed issue #78 was closed manually from the GitHub timeline and branch protection from the API. Checked entry order and Markdown links.
**Learning:**
- Where the record changes, keep the original conclusion and point to the correction so the history remains visible. Entry 4 is the exception: it explicitly held a place for the owner's missing statement.
- Disclosure written after the fact depends on memory; Entry 4 is the concrete example.

---

## Entry 17 — Workflow documentation, historical recordkeeping and changelog (issue #91, PR #92)

**Date:** 2026-11-07
**Tool:** opencode CLI (`deepseek-v4.1-flash`)
**Intent:** Establish the engineering workflow documentation, permanent recordkeeping, findings register, and structured changelog without changing software behavior or historical claims.
**Boundary:** Documentation and repository metadata only. The human approved the consolidated `AGENTS.md`, the workflow set, the `Task` issue type, the record folders, and the changelog. No application code, schema, tests, CI, ADR, claim form, existing issue, or existing PR was changed.
**Prior records reviewed:** `AGENTS.md`, `README.md`, `docs/methodology/ai-transparency-log.md` Entries 14–16, checkpoint A and B, ADRs 001–002, and the staged `match-pulse-agentic-workflows/` package.
**Verification:** 135 relative links checked over `AGENTS.md`, `README.md`, `CHANGELOG.md`, and `docs/`; all resolve. `git diff --check` passed. `task.yml` parsed as valid YAML. The four claim issue forms and ADRs 001–002 were unchanged by the diff. Exactly one `AGENTS.md` remains. The changelog contains 61 historical rows plus the current row. `bun run lint` and `bun run typecheck` were not run locally because Bun is not installed in this environment; CI must provide that evidence.
**Limitations:** `bun run test` was not run because this is a documentation-only change and the invariant suite requires the local Supabase stack. CI results were not yet observed when this entry was written.
**Learning:**
- The consolidated `AGENTS.md` was preferred over adding a section to the existing 707-line file because it routes procedures to `docs/workflows/` and avoids duplicate instructions. Exact invariant values remain in `docs/architecture/02-domain-model.md`.
- The changelog backfill used merged PR bodies for issue links and did not infer missing issue numbers. PR #62 remains unlinked because its PR body has no closing reference, even though its commit body does; the PR body is the authoritative record.
- The staging package was removed after the copy so only one `AGENTS.md` remains.

**Links:** issue #91 · PR #92 · `docs/workflows/README.md` · `docs/methodology/README.md` · `CHANGELOG.md`

**Addendum 2026-11-07:** CI run [42373836200](https://github.com/match-pulse/match-pulse/actions/runs/42373836200) completed after this entry was written. Observed: "Lint, typecheck and build" passed in 26s; "Domain invariants" passed in 2m3s. This supplements, and does not rewrite, the verification above.

**Addendum 2026-11-07 (CI re-run):** A later CI run failed in "Start local Supabase" because host port 54322 was already in use; the test steps were skipped. The failed job was re-run and passed: "Domain invariants" in 1m43s, "Lint, typecheck and build" in 18s. The failure was an infrastructure port conflict, not a test failure, and is recorded here rather than omitted.

---

## Entry 18 — SDLC, development practices and Checkpoint C evidence

**Date:** 2026-11-07
**Tool:** opencode CLI (`deepseek-v4.1-flash`)
**Intent:** Make the software development lifecycle explicit, state the project's testing and specification practices (including TDD, SDD and the OpenSpec decision), assemble the Checkpoint C quality/residual-risk evidence package, and populate the findings register with the known gaps.
**Boundary:** Documentation only. The human requested the implementation; the repository workflow required issue #93. AI drafted the records. No application code, schema, migration, test, CI configuration, existing historical record, or prior issue/PR was changed. No commit, push, pull request or merge was performed in this entry.
**Prior records reviewed:** Checkpoint A and B, the invariant registry, the full AI transparency log, the README known gaps, the architecture documents, the workflow contracts, and the course L01–L12 summaries, slides and key transcripts.
**Verification:** Relative-link scan over the changed Markdown files; `git diff --check`; inspection of the diff to confirm that no historical record was rewritten. The invariant tests were not rerun: this is a documentation-only change, and Bun/Docker are not available in this environment. CI must provide the code evidence for the branch.
**Learning:**
- The SDLC, SDD and TDD are three different layers. The project uses a hybrid lifecycle, spec-first/spec-anchored SDD, and invariant-first/risk-first testing rather than strict TDD. Stating the difference prevents the project from claiming a practice it does not use.
- OpenSpec is a tool/framework, not a required course artefact. The existing issue + execution plan + ADR + invariant + test chain already implements a lightweight SDD. A bounded trial is allowed, but installing a second documentation system without a decision would add ceremony rather than evidence.
- The findings register was empty while the README listed known gaps. Recording the gaps as FND-001–FND-008 makes the residual risks traceable and gives Checkpoint C a risk map instead of a prose list.
- Residual risks are proposed for the human owner, not accepted by AI. The checkpoint record explicitly marks every residual-risk decision as proposed.
**Limitations:** No independent human review; the risk ranking is qualitative; the evidence is local and test-based; the test suite and CI were not rerun for this documentation change. The next decision — authorization/RLS, idempotency, real-user evidence, delivery/operations, or test hardening — belongs to the human owner.

**Links:** issue #93 · PR #94 · branch `docs/93-sdlc-practices-checkpoint-c` · `docs/methodology/checkpoint-B/04-sdlc-decision.md` · `docs/methodology/development-practices.md` · `docs/methodology/checkpoint-C/` · `docs/methodology/findings-register.md`

**Addendum 2026-11-07:** Pull request #94 was opened after this entry was written. CI results were not yet observed at that point.

**Addendum 2026-11-07 (CI):** CI run [42388062915](https://github.com/match-pulse/match-pulse/actions/runs/42388062915) passed both jobs: **Lint, typecheck and build** in 25s and **Domain invariants** in 2m2s. This supplements, and does not rewrite, the verification above.

---

## Entry 19 — Release-based changelog and tag policy

**Date:** 2026-11-07
**Tool:** opencode CLI (`deepseek-v4.1-flash`)
**Intent:** Adopt the human-approved release policy: replace the per-PR changelog ledger with a curated, release-grouped history; freeze the existing PR table; and define SemVer tags, GitHub Releases and the release checklist.
**Boundary:** Documentation and process only. AI rewrote the changelog structure, updated the agent rules and added the release workflow. No application code, schema, test, CI or dependency changed. No historical row was deleted; all 63 chronological rows were preserved in the frozen ledger. No tag was moved or created in this entry.
**Prior records reviewed:** current `CHANGELOG.md` and rules, `AGENTS.md` §8/§12, the `v1.0.0` annotated tag on `5fadb6c`, the current release state (no GitHub Release; `package.json` 0.1.0), and PR #96.
**Verification:** Relative-link scan over 56 Markdown files; `git diff --check`; historical row count 63 before and 63 after. No application or test commands were run because this is a documentation/process-only change.
**Learning:**
- The project board and the changelog serve different purposes: execution tracking versus permanent release history. A per-PR changelog duplicating GitHub adds volume without adding release meaning.
- Tags must be defined by a policy, not created ad hoc. A tag is an immutable release snapshot on `main`, not a bookmark for every merge.
- `v1.0.0` is a historical annotated tag with no GitHub Release and a stale `package.json` version (`0.1.0`). It remains the baseline and will not be moved; the next release (`v1.1.0`) will align the package version and publish a GitHub Release.
- PR #96 needs reconciliation before merge: its per-PR changelog row is removed and the authentication/RLS change becomes a `v1.1.0` release note at release preparation.
**Limitations:** Tag protection for `v*` is not yet configured. The release workflow is documented but has not yet been exercised for `v1.1.0`. No independent human review; the human owner must review PR #98.

**Links:** issue #97 · PR #98 · [`CHANGELOG.md`](../../CHANGELOG.md) · [`release-workflow.md`](../workflows/release-workflow.md)

---

## Entry 20 — Authentication, authorization, RLS and grants

**Date:** 2026-11-07
**Tool:** opencode CLI (`deepseek-v4.1-flash`)
**Intent:** Implement the approved security increment: make MatchPulse a real authorization boundary, replace the demo identity with Supabase Auth, restrict private reads with RLS, revoke direct writes, authorize the mutation RPCs, add the organizer-only resolution check, rewrite the invariant tests through authenticated clients, and produce the verification/evidence record.
**Boundary:** High-risk security and schema change, implemented only after the human approved the formal execution plan. AI designed and implemented the migrations, auth flow, tests and documentation. The human owner approved the plan, the `SECURITY DEFINER` model, the destructive local reset and the `@supabase/ssr` dependency. No merge was performed in this entry.
**Prior records reviewed:** AGENTS.md security gates, README known gaps, INV-05, Checkpoint C risk map/residual risk (FND-001), ADR-001/ADR-002, system overview, domain model, migrations, RPCs, Server Actions, tests, and the approved execution plan.
**Verification:**
- Local: `bun install --frozen-lockfile`, `bun run lint`, `bun run build` and `bun run typecheck` passed. The build generated the Next route types required by typecheck.
- CI: run [42397891717](https://github.com/match-pulse/match-pulse/actions/runs/42397891717) passed both jobs — **Lint, typecheck and build** in 24s and **Domain invariants** in 2m13s.
- Test summary: **21 pass, 0 fail, 205 expect() calls, 6 files.** Six authorization tests cover anonymous access, fan own-row isolation, organizer-only resolution, denied direct writes, identity-free public trades and anonymous fan trading.
- The pre-existing capacity, uniqueness, pricing, lifecycle and concurrency suites still pass through authenticated clients.
**Learning:**
- With `auto_expose_new_tables = false`, the service role bypasses RLS but still needs explicit table/function grants. The first CI run failed with `permission denied for table matches`; the fix was to grant the service role explicit local administration/test privileges while keeping anon/authenticated least-privilege.
- Next.js 16 renamed the `middleware` convention to `proxy`; the session refresh is in `src/proxy.ts`. `cacheComponents` rejects `export const dynamic`; the login gate uses `export const instant = false`.
- The test suite must use authenticated clients for the real RPC path and the service role only for setup/reads. Using the anon key for setup was the previous weakness; using the service key for the application would be the opposite failure.
- `SECURITY DEFINER` is necessary because direct table writes are revoked, but it makes every function a high-trust boundary. The explicit `auth.uid()` check, organizer check, fixed `search_path` and authenticated-only execute grants are mandatory.
- A local `db reset` is required because `profiles` gains an auth identity and the old demo profile is removed.
**Limitations:** Local Supabase/PostgreSQL only; no production session hardening, rate-limit tuning or deployment. No organizer management UI, idempotency keys, load/p95 or club-analytics privacy rule. There is no independent human review; the human owner must review the PR before merge. The verification record and findings register state these limits.

**Links:** issue #95 · PR #96 · [verification record](verification/2026-11-95-authorization-rls.md) · [ADR-003](../architecture/adr/003-authorization-rls.md) · [execution plan](exec-plans/95-authorization-rls.md)

---

## Entry 21 — Release v1.1.0

**Date:** 2026-11-07
**Tool:** opencode CLI (`deepseek-v4.1-flash`)
**Intent:** Cut the first release under the new release policy: promote the curated changelog section to `1.1.0`, align `package.json`, and prepare the annotated tag and GitHub Release.
**Boundary:** Release preparation only. AI edited `CHANGELOG.md`, `package.json` and this log. No application code, schema, test or CI change. The human owner approved the release policy and the release; the tag and GitHub Release are created after the release PR is merged and `main` is verified.
**Prior records reviewed:** release workflow, `CHANGELOG.md`, PR #96 (authentication/RLS), PR #98 (release policy), AI log Entries 19–20, and the #95 authorization verification record.
**Work performed:** promoted `[Unreleased]` to `[1.1.0] - 2026-11-07` with Added/Changed/Fixed/Security/Migration/Known gaps/Evidence; started a fresh `[Unreleased]`; updated compare links; set `package.json` to `1.1.0`.
**Verification:** `bun install --frozen-lockfile` passed with no lockfile changes. Main CI [42410413126](https://github.com/match-pulse/match-pulse/actions/runs/42410413126) passed with 21 tests and 0 failures. The release PR CI is the final merge gate.
**Learning:**
- The release section is curated from the notable changes, not from the PR list. The authentication/RLS change is one release narrative with a migration note.
- The package version and tag must match; `v1.0.0` remains the historical baseline, and `v1.1.0` is the first release under the new policy.
- A tag is created only after the release PR is merged and `main` is green; the release notes are then published from the same changelog section.
**Limitations:** The annotated tag, GitHub Release, tag protection and milestone closure are created after this entry. No independent human review; the human owner approves the release. The known gaps in the changelog remain open.

**Links:** issue #99 · PR #100 · [`CHANGELOG.md`](../../CHANGELOG.md) · [`release-workflow.md`](../workflows/release-workflow.md)

---

## Entry 22 — Checkpoint C current-state refresh

**Date:** 2026-11-07
**Tool:** opencode CLI (`deepseek-v4.1-flash`)
**Intent:** Refresh the Checkpoint C narrative after authentication/RLS and `v1.1.0`: re-rank the remaining risks, update the three-minute script, add a readiness checklist, and state the M-INV4 re-injection limit.
**Boundary:** Documentation only. AI added the current-state record and a README pointer. No application code, schema, test or CI change. No historical checkpoint content was rewritten; the new record supplements it.
**Prior records reviewed:** original Checkpoint C package, authorization verification, v1.1.0 release, findings register, release policy, risk-control map and residual-risk addenda.
**Verification:** Relative-link scan over 60 Markdown files; `git diff --check`. No application or test commands were run because this is a documentation refresh.
**Learning:**
- The original C main answers correctly described the pre-auth state but became misleading after R-01 was mitigated. A current-state addendum prevents a reader from presenting a stale risk ranking.
- The top remaining risk is now idempotency (FND-003), not authorization. The unverified market injections (FND-002) and delivery/operations (FND-006) follow.
- The M-INV4 fault injection predates the `SECURITY DEFINER` auth version. The suite passes after auth, but the strongest evidence is still the pre-auth injection; this is stated as a limit rather than implied as re-run.
- C should be presented before D. The L13–L16 materials are not yet in the course folder, so D preparation would otherwise be based on inference.
**Limitations:** No independent human review (FND-008); no auth-version M-INV4 re-injection; no real-user evidence (FND-007); no portfolio index yet. The current-state record is a presentation aid, not new test evidence.

**Links:** issue #101 · PR #102 · [`07-current-state.md`](checkpoint-C/07-current-state.md) · [`README.md`](checkpoint-C/README.md)

---

## Entry 23 — Checkpoint C presentation pack

**Date:** 2026-11-07
**Tool:** opencode CLI (`deepseek-v4.1-flash`)
**Intent:** Prepare a usable Checkpoint C presentation pack: one-page handout, 3-minute and 30-second scripts, Q&A bank, demo path and honest fallbacks.
**Boundary:** Documentation only. AI drafted the presentation aid from the existing evidence records. No application code, schema, test or CI change. No claim was upgraded; the pack repeats the recorded limits.
**Prior records reviewed:** Checkpoint C current-state record, risk map, quality story, review decisions, residual risk, authorization verification, v1.1.0 release and AI log Entries 20–22.
**Verification:** Relative-link scan over 61 Markdown files; `git diff --check`. No application or test commands were run because this is a presentation aid, not new evidence.
**Learning:**
- The professor's C questions can be answered from the existing records; the hard part is keeping the 3-minute version honest about the pre-auth injection and the missing independent review.
- The Q&A bank is more useful than a longer written report because the checkpoint is a discussion, not a document review.
- The strongest short narrative is: authorization was the top risk and is now controlled; idempotency is the top remaining risk; M-INV4 is the executable invariant story.
- A peer review and an auth-version injection are still the two highest-value C improvements; the pack provides fallbacks if they are not possible before the session.
**Limitations:** Presentation aid only; no independent human review; no auth-version M-INV4 re-injection; no real-user evidence. The pack must not be read as proof of production readiness.

**Links:** issue #103 · PR #104 · [`08-presentation-pack.md`](checkpoint-C/08-presentation-pack.md)

---

## Entry 24 — Checkpoint D pre-read and architecture guards

**Date:** 2026-11-07
**Tool:** opencode CLI (`deepseek-v4.1-flash`)
**Intent:** Prepare a bounded Checkpoint D pre-read: ownership/change rights, dependency rules, executable architecture guards, an idempotency change scenario, compatibility policy and technical-debt view.
**Boundary:** Documentation plus a read-only architecture guard and CI step. No application runtime behavior, schema, migration, RPC, domain rule or release change. L13–L16 were not available, so the pre-read explicitly marks inferred requirements.
**Prior records reviewed:** architecture docs, ADR-001–003, code map, architecture characteristics, Checkpoint C current state, findings register, release workflow and the course L01 structure.
**Verification:** `bun run check:architecture` passed; `bun run typecheck` passed; `bun run lint` passed; relative-link scan over 67 Markdown files; `git diff --check`. No database tests were rerun because no runtime/schema changed.
**Learning:**
- D needs more than architecture diagrams: it needs ownership, dependency rules, a change scenario and evidence that a change can be made without breaking contracts.
- A text-level guard is useful as a tripwire but is not proof; RLS coverage, grant-matrix and migration-compatibility checks remain future fitness functions.
- The idempotency scenario is the right first D change because it closes FND-003 and exercises schema, RPC contract, actions, tests, docs and release compatibility.
- The L13–L16 materials are still missing; the pre-read is a baseline, not a claim that D is complete.
**Limitations:** No independent human review; no idempotency implementation; guard is text-level; L13–L16 requirements unconfirmed; no database/load evidence added.

**Links:** issue #105 · PR #106 · [`checkpoint-D/README.md`](checkpoint-D/README.md) · [`check-architecture.ts`](../../scripts/check-architecture.ts)

---

## Entry 25 — Idempotent entry and exit

**Date:** 2026-11-08
**Tool:** opencode CLI (`deepseek-v4.1-flash`)
**Intent:** Implement request-key idempotency for `open_trade` and `close_trade`: same key + payload replays the recorded trade; same key + different payload is refused; no duplicate debit, credit, position or trade.
**Boundary:** Approved high-risk schema/RPC change. AI implemented the `trade_requests` table, RPC claim/replay logic, client request IDs, tests and the architecture-guard update. The human approved the plan. No pricing, outcome, settlement, registration or UI redesign was changed.
**Prior records reviewed:** FND-003, Checkpoint D change scenario, ADR-002/003, invariant registry, authorization verification, market RPCs/actions/tests, release workflow.
**Verification:** Local `bun run check:architecture`, `bun run typecheck`, `bun run lint` and `bun run build` passed. Database-backed idempotency/authorization tests are pending CI; no local Docker/Postgres is available in this environment.
**Learning:**
- The request key must be claimed before the trade work. A server-generated key cannot distinguish a retry; the client must keep one key across retries and rotate it only for a new payload.
- The architecture guard initially flagged `Map.delete` as a direct table mutation. The rule was narrowed to Supabase-style `.from(...).insert/update/delete(...)`, which is the actual boundary.
- Existing tests now pass `p_request_id: null` explicitly to exercise the legacy path; the app always sends a UUID.
- The `trade_requests` status check (`IN_PROGRESS` vs `COMPLETED`) makes the request/trade commit relationship visible to the database, not just to the function.
**Limitations:** Fault injection (remove the unique constraint/request check) has not been observed locally; CI only proves the restored code. The legacy null-key path remains non-idempotent. No request-key cleanup policy. No independent human review.

**Addendum 2026-11-08 (CI):** CI run [42425131584](https://github.com/match-pulse/match-pulse/actions/runs/42425131584) passed both jobs: **28 tests, 0 failures, 256 expect() calls, 7 files**. The six M-INV9 idempotency tests and the updated authorization suite passed. This supplements, and does not rewrite, the verification above.

**Links:** issue #107 · PR #108 · [execution plan](exec-plans/107-idempotent-trades.md) · `supabase/migrations/20261111_trade_requests.sql` · `supabase/migrations/20261112_idempotent_rpcs.sql` · `tests/invariants/idempotency.test.ts`

---

## Entry 26 — Release v1.2.0

**Date:** 2026-11-08
**Tool:** opencode CLI (`deepseek-v4.1-flash`)
**Intent:** Cut v1.2.0 for request-key idempotency under the release policy: curate the release notes, align `package.json`, and prepare the annotated tag and GitHub Release.
**Boundary:** Release preparation only. AI edited `CHANGELOG.md`, `package.json` and this log. No application code, schema, test or CI change. The human approved the idempotency increment and the release policy.
**Prior records reviewed:** release workflow, `CHANGELOG.md`, PR #108, idempotency verification record, AI log Entry 25, FND-003.
**Verification:** Main CI [42425940843](https://github.com/match-pulse/match-pulse/actions/runs/42425940843) passed with 28 tests and 0 failures. The release PR CI is the final merge gate.
**Learning:**
- Idempotency is a release-level behavior change; it belongs in the release notes with a migration note, not a per-PR changelog row.
- The 3-arg to 4-arg RPC change is additive through the default parameter; the app always sends a key, while the legacy null-key path is documented as non-idempotent.
- The release notes must distinguish the fixed FND-003 from the remaining verification/operational gaps.
**Limitations:** The tag and GitHub Release are created after this entry. No independent human review; the human owner approves the release. The idempotency fault injection was not observed locally.

**Links:** issue #109 · PR #110 · [`CHANGELOG.md`](../../CHANGELOG.md) · [`release-workflow.md`](../workflows/release-workflow.md)

---

## Entry 27 — Delivery, observability and recovery baseline

**Date:** 2026-11-08
**Tool:** opencode CLI (`deepseek-v4.1-flash`)
**Intent:** Implement the approved Checkpoint E baseline: a public health endpoint, structured JSON logs, a deterministic smoke test, a CI delivery job, an operations runbook, proposed SLOs and a recorded capacity-burst p95.
**Boundary:** Approved medium-risk increment (#111). AI added the health route and a cookie-less health client, the logger, smoke script, CI delivery job, operations documents and the p95 instrumentation. The human approved local/CI delivery evidence instead of a cloud deployment. No pricing, settlement, schema, authorization model or UI behavior was changed.
**Prior records reviewed:** Checkpoint D pre-read, architecture characteristics, release workflow, v1.2.0 release, README known gaps, FND-004 and FND-006.
**Work performed:**
- `GET /api/health` checks a public `markets` read through a cookie-less anon client, returns `200`/`503`, and uses `connection()` so it is dynamic rather than baked into the build.
- `src/lib/logger.ts` emits JSON lines; health and key market/registration error paths log structured events.
- `scripts/smoke-test.ts` waits for health and checks health, login and the unauthenticated home redirect.
- `.github/workflows/ci.yml` gains a `Delivery smoke` job that starts Supabase, builds, starts the app, waits for health and runs smoke.
- `docs/operations/runbook.md`, `docs/operations/slo.md` and the Checkpoint E pre-read record environments, health, logs, release, rollback, backup/restore, incident steps, SLOs and limits.
- `tests/invariants/tournament-capacity.test.ts` records p50/p95/max for the 100-request burst.
**Verification:** Local `bun run check:architecture`, `bun run typecheck`, `bun run lint` and `bun run build` passed. The first build exposed a real defect: the health route used the cookie client during prerender and logged `health.db_check_failed`. It was corrected with a cookie-less health client plus `connection()`, and the rebuild completed with `/api/health` marked dynamic and no prerender error. Database-backed and delivery-smoke verification is pending CI.
**Learning:**
- A health probe must not depend on request cookies; using the session client made build-time prerender attempt a database check and log a false failure.
- With `cacheComponents`, route segment `dynamic` config is rejected; `connection()` is the supported way to keep the probe dynamic.
- The p95 value must be recorded with its environment; a hard assertion on a shared runner would be flaky before the distribution is known.
**Limitations:** No hosted deployment, external monitoring, alerting, tracing or production recovery. The backup/restore exercise and the actual p95 value are recorded only after they are observed. No independent human review.

**Addendum 2026-11-08 (CI):** CI run [42435007354](https://github.com/match-pulse/match-pulse/actions/runs/42435007354) passed all three jobs: build/typecheck/lint/architecture, 28 invariant tests (0 failures), and the new `Delivery smoke` job (health, login UI, home HTML). The 100-request capacity burst observed **p50 245.46 ms, p95 463.11 ms, max 479.64 ms** in the first green run and **p95 571.68 ms** in the final run, against the proposed 1,000 ms target. The first delivery run failed because the smoke test expected `GET /` to return an HTTP redirect to `/login`; under Partial Prerender the market route returns a 200 shell and the auth gate resolves inside the streamed component. The smoke check was corrected to assert health, the login UI marker and a 200 HTML home shell. This is a test-assumption correction, not a product or authorization change. A later CI attempt hit a Supabase CLI `latest` resolution rate limit; both jobs now pin `3.0.0`. The backup/restore exercise remains documented but unexercised because Docker/Postgres is unavailable locally.

**Links:** issue #111 · [execution plan](exec-plans/111-delivery-operations-baseline.md) · [runbook](../operations/runbook.md) · [SLO proposal](../operations/slo.md) · [Checkpoint E pre-read](checkpoint-E/README.md) · [verification record](verification/2026-11-111-delivery-operations-baseline.md)

---

## Entry 28 — Release v1.3.0

**Date:** 2026-11-08
**Tool:** opencode CLI (`deepseek-v4.1-flash`)
**Intent:** Cut v1.3.0 for the delivery, observability and recovery baseline under the release policy: curate the release notes, align `package.json` and prepare the annotated tag and GitHub Release.
**Boundary:** Release preparation only. AI edited `CHANGELOG.md`, `package.json` and this log. No application code, schema, test or CI change in the release PR. The human approved the delivery baseline and the release policy.
**Prior records reviewed:** release workflow, `CHANGELOG.md`, PR #112, delivery verification record, AI log Entry 27, FND-004 and FND-006.
**Verification:** Final PR CI run [42435627680](https://github.com/match-pulse/match-pulse/actions/runs/42435627680) passed all three jobs: build/typecheck/lint/architecture, 28 invariant tests with 0 failures, and delivery smoke. The p95 observations are 463.11 ms and 571.68 ms. The release PR CI is the final merge gate.
**Learning:**
- Delivery evidence belongs in the release notes with its environment and limits, not as a production claim.
- Pinning the Supabase CLI removed a real external failure mode (`latest` resolution rate limit) from the delivery job.
- A partially prerendered route can return a 200 shell before its auth gate resolves; smoke assertions must target observed behavior, not an assumed redirect.
- The changelog must distinguish a fixed defect from a partly fixed finding: FND-004 and FND-006 remain partly open.
**Limitations:** The tag and GitHub Release are created after this entry. Backup/restore is documented but unexercised. No hosted deployment, external monitoring or production recovery. No independent human review.

**Links:** issue #113 · [`CHANGELOG.md`](../../CHANGELOG.md) · [`release-workflow.md`](../workflows/release-workflow.md) · [delivery verification](verification/2026-11-111-delivery-operations-baseline.md)

---

## Entry 29 — Correct the v1.3.0 evidence label

**Date:** 2026-11-08
**Tool:** opencode CLI (`deepseek-v4.1-flash`)
**Intent:** Correct a traceability label in the v1.3.0 changelog: run 42435627680 was the pull-request CI for #112, not the main-branch CI.
**Boundary:** One dated correction line under the v1.3.0 Evidence section. The original line is preserved; no tagged content, application, schema, test or CI change.
**Prior records reviewed:** v1.3.0 release notes, delivery verification record, CI run 42435627680, main CI run 42436376049.
**Verification:** Main CI after the release merge was [42436376049](https://github.com/match-pulse/match-pulse/actions/runs/42436376049) and passed. The correction is documentation-only.
**Learning:** A release-evidence line must name the event that produced the run (`pull_request` versus `push` on `main`); a green run is not automatically main-branch evidence.
**Limitations:** The published GitHub Release notes retain the original label; this correction lives on `main` as a dated addendum and does not rewrite the tagged release.

**Links:** issue #115 · [`CHANGELOG.md`](../../CHANGELOG.md) · [delivery verification](verification/2026-11-111-delivery-operations-baseline.md)

---

## Entry 30 — Backup and restore recovery drill

**Date:** 2026-11-08
**Tool:** opencode CLI (`deepseek-v4.1-flash`)
**Intent:** Turn the documented backup/restore procedure into observed CI evidence: back up the application-owned public schema, restore it into a scratch database, and verify tables, RLS policies, row counts and a marker row.
**Boundary:** Approved E-baseline completion (#117). AI changed the delivery CI job, the operations runbook, the Checkpoint E recovery record, the findings register and this log. No application behavior, schema, migration, pricing or authorization change. No production data or hosted environment.
**Prior records reviewed:** v1.3.0 release, delivery verification, operations runbook, Checkpoint E recovery pre-read, FND-006.
**Work performed:**
- The `Delivery and recovery` job now inserts a marker tournament, dumps the public schema with `pg_dump`, creates a scratch database, restores with `pg_restore`, and asserts table/policy/row counts and the marker.
- The CI jobs now use the locked Supabase CLI dev dependency instead of the `supabase/setup-cli` download, and clean up leftover containers before startup.
- The runbook and Checkpoint E recovery record document the observed counts and the public-schema scope.
**Verification:** CI run [42467767299](https://github.com/match-pulse/match-pulse/actions/runs/42467767299) passed all jobs: build, 28 invariant tests, and the recovery drill. The drill observed a 67,009-byte backup, tables 10→10, RLS policies 10→10, tournaments 2→2, the marker row restored, and smoke passing after the drill.
**Learning:**
- The Supabase `postgres` role cannot disable system triggers, so a data-only restore with `--disable-triggers` fails; a schema+data dump into a scratch database is the usable path.
- A full Supabase dump includes platform-managed schemas (`auth`, `storage`, `realtime`, `vault`) that are not application backup scope; restoring the public schema with a minimal `auth` shim is cleaner and matches ownership.
- `pg_restore --clean` exits 1 on expected `DROP POLICY IF EXISTS` warnings in a fresh database; explicit restored-state assertions are the honest gate, and the exit status is recorded.
- A locked CLI dev dependency removes an external download failure mode from CI.
**Limitations:** The backup covers only the application-owned public schema. It does not restore Supabase-managed auth/storage data, and the app is not cut over to the restored database. No production backup, retention, PITR, RTO/RPO, external monitoring or independent human review.

**Links:** issue #117 · PR #118 · [recovery verification](verification/2026-11-117-recovery-drill.md) · [runbook](../operations/runbook.md) · [Checkpoint E recovery](checkpoint-E/03-recovery.md)

---

## Entry 31 — Release v1.3.1

**Date:** 2026-11-08
**Tool:** opencode CLI (`deepseek-v4.1-flash`)
**Intent:** Cut v1.3.1 for the recovery drill and CI reliability changes: curate the release notes, align `package.json` and prepare the annotated tag and GitHub Release.
**Boundary:** Release preparation only. AI edited `CHANGELOG.md`, `package.json` and this log. No application code, schema, test or CI change in the release PR. The human approved the recovery increment and the release policy.
**Prior records reviewed:** release workflow, `CHANGELOG.md`, PR #118, recovery verification record, AI log Entry 30, FND-006.
**Verification:** CI run [42467767299](https://github.com/match-pulse/match-pulse/actions/runs/42467767299) passed all jobs, including the recovery drill: 67,009-byte backup, tables 10→10, RLS policies 10→10, tournaments 2→2, marker restored, smoke passed. The release PR CI is the final merge gate.
**Learning:**
- The recovery drill belongs in the release notes with its scope: application-owned public schema, not Supabase-managed auth/storage data.
- `pg_restore --clean` can exit 1 on expected clean-phase warnings; the release note must state that the explicit restored-state assertions are the gate.
- Removing the external CLI download and cleaning leftover containers made delivery CI depend on fewer external services.
**Limitations:** The tag and GitHub Release are created after this entry. No production backup, retention, RTO/RPO or recovery drill. No hosted deployment and no independent human review.

**Links:** issue #119 · [`CHANGELOG.md`](../../CHANGELOG.md) · [`release-workflow.md`](../workflows/release-workflow.md) · [recovery verification](verification/2026-11-117-recovery-drill.md)

---

## Entry 32 — Course alignment and dated reports

**Date:** 2026-11-08
**Tool:** opencode CLI (`deepseek-v4.1-flash`)
**Intent:** Align the kata and architecture characteristics with the Software Architectures task 1/2 requirements, and add dated reports under `docs/architecture/reports/` and `docs/methodology/reports/` without calling them final.
**Boundary:** Documentation only. AI edited the kata, characteristics, report files, indexes and this log. No application code, schema, test or CI change. The human owner approved the course-alignment implementation.
**Prior records reviewed:** SA Lecture 1/2/3 slides and summaries, SA Lecture 4/5 summaries, DM L01/L12 summaries, cross-course Project Handbook, current kata and characteristics, Checkpoints A–E, findings register, AI log Entries 30–31.
**Work performed:**
- Added K1–K15 to the kata, a users/scale table, and an implementation-scope note.
- Rebuilt the characteristics document around the course's vocabulary: Reliability for concurrency integrity, Elasticity/Reliability split, Security as an implicit cross-cutting characteristic, SMART owner/time/review, traceability and a deployability proxy.
- Added `docs/architecture/reports/2026-11-08.md` and `docs/methodology/reports/2026-11-08.md`.
- Linked the reports from the README, methodology index and code map.
**Verification:** Local `bun run check:architecture`, `bun run typecheck` and `bun run lint` passed. The Markdown link check over 81 files and `git diff --check` passed. The PR CI runs the full build, invariant and delivery jobs; the report files are documentation-only. No PDF export was produced because no local PDF toolchain is installed; the reports are Markdown, which the final architecture deliverable permits. Task 1/2 submission PDFs still require an export step.
**Learning:**
- The course's consolidated 12-item characteristic table does not contain Reliability or Security even though the course discusses both; the document now explains the naming instead of silently substituting.
- Task 1/2 submissions require PDF, while the final architecture description may be PDF **or Markdown**. The earlier assessment overgeneralised the PDF requirement.
- The "modular monolith" label needs a precise boundary statement: the domain modules live in PostgreSQL/RPCs, while the Next.js layer is a layered delivery shell.
- The elasticity target must not carry capacity-integrity assertions; those belong to Reliability.
**Limitations:** No PDF export; no real organizer evidence (FND-007); no independent review (FND-008); Checkpoints D/E remain pre-reads until L13–L20 arrive; the remaining market fault injections (FND-002) are still open.

**Links:** issue #121 · PR #122 · [architecture report](../architecture/reports/2026-11-08.md) · [methodology report](reports/2026-11-08.md) · [kata](../architecture/kata.md) · [characteristics](../architecture/03-architecture-characteristics.md)

---

## Entry 33 — OpenSpec adoption and first change

**Date:** 2026-11-08
**Tool:** opencode CLI (`deepseek-v4.1-flash`)
**Intent:** Install OpenSpec, initialize it in the repository, create a real change proposal for the next evidence increment (FND-002), validate it, and record the adoption in the methodology docs.
**Boundary:** Tooling and documentation only. AI installed the standalone CLI, ran `openspec init --tools opencode`, created one change folder, and edited the methodology docs, README, AGENTS.md and this log. No application code, schema, test or CI change.
**Prior records reviewed:** `development-practices.md` §4 (the earlier OpenSpec decision), Checkpoint B SDLC decision, FND-002, AI log Entry 32, the invariant registry and the existing fault-injection history.
**Work performed:**
- Installed OpenSpec 1.16.1 as a standalone CLI.
- Initialized the project with the OpenCode tool integration; generated six commands and six skills under `.opencode/`.
- Created `openspec/changes/archive/2026-11-08-add-market-fault-injections/` with `proposal.md`, `design.md`, `tasks.md` and `skip_specs: true`.
- The change specifies a mutation catalog and runner for M-INV1, M-INV2, M-INV3, M-INV5, M-INV8 and the M-INV7 detail set.
- Added `openspec/README.md`, updated `development-practices.md` §4.6, the methodology index, the methodology report, the root README and AGENTS.md.
**Verification:** `openspec --version` reports 1.16.1. `openspec doctor` reports the root is OK. `openspec validate add-market-fault-injections --type change --strict` reports the change is valid with `skip_specs` accepted. Local architecture/typecheck/lint and link checks are run before the PR; the change itself is proposed, not implemented.
**Learning:**
- OpenSpec supports `skip_specs: true` for test-only or tooling changes; inventing a behavioral requirement would make the spec less honest.
- The tool's proposal/design/tasks structure fits the FND-002 evidence change better than a second issue-only plan because the mutation catalog and the verification tasks need to stay together.
- OpenSpec is a change-planning layer, not a replacement for the kata, invariant registry or verification records.
**Limitations:** The change is proposed, not implemented; no mutation has been run yet. The trial outcome is pending. There is no capability spec tree because no behavior changes. No independent human review (FND-008).

**Links:** issue #123 · PR #124 · [OpenSpec project](../../openspec/README.md) · [first change](../../openspec/changes/archive/2026-11-08-add-market-fault-injections/proposal.md) · [development-practices §4.6](development-practices.md) · [methodology report](reports/2026-11-08.md)

---

## Entry 34 — Applied the first OpenSpec change

**Date:** 2026-11-08
**Tool:** opencode CLI (`deepseek-v4.1-flash`)
**Intent:** Apply the OpenSpec change `add-market-fault-injections`: build the mutation runner, add the M-INV2 forced-failure rollback test, run the matrix in CI and record the observed-red evidence.
**Boundary:** Test tooling, CI and documentation. AI added `scripts/fault-injection/`, `tests/fault-injection/atomic-rollback.fault.ts`, the `Fault injection` CI job and the `fault:inject` script. No product behavior, schema, pricing, authorization or UI change. The mutations are temporary and the database is reset after each one.
**Prior records reviewed:** OpenSpec change proposal/design/tasks, FND-002, invariant registry, market RPCs and tests, prior fault-injection evidence.
**Work performed:**
- Added a typed mutation catalog that transforms the current migration SQL and fails loudly when a target disappears.
- Added a runner that resets the database, applies each mutation, runs the targeted test, compares the declared result and restores the schema.
- Added the M-INV2 forced-failure rollback test.
- Added the `Fault injection` CI job and `bun run fault:inject`.
- Updated the invariant registry, FND-002, the verification record, the methodology report and the checkpoint risk records.
**Verification:** CI run [42474762811](https://github.com/match-pulse/match-pulse/actions/runs/42474762811) passed all jobs. The matrix observed 10 expected-red mutations and the M-INV2 forced-failure test passing; the full suite returned 28 pass / 0 fail. The first attempt found two harness issues — Bun required an explicit `./` path for the non-standard test file, and the no-escalation mutation was rolled back by the exception. Both were corrected and rerun.
**Learning:**
- A mutation that updates the cooldown and then raises is rolled back by the transaction; it cannot demonstrate escalation. Returning no rows lets the update commit and the test fail for the intended reason.
- Bun test treats a non-standard filename as a name filter unless the argument starts with `./`.
- PostgreSQL function atomicity cannot be broken from inside the same function; M-INV2 needs a forced-failure test rather than an observed-red mutation.
**Limitations:** M-INV2 is **Verified by forced-failure rollback**, not observed-red. The matrix is local/CI, one database instance. No independent human review (FND-008). The OpenSpec change was archived as `2026-11-08-add-market-fault-injections` after all tasks were complete.

**Links:** issue #125 · PR #126 · [fault-injection verification](verification/2026-11-125-market-fault-injections.md) · [OpenSpec change](../../openspec/changes/archive/2026-11-08-add-market-fault-injections/proposal.md) · [invariant registry](checkpoint-A/02-invariants.md)

---

## Entry 35 — Three-role MVP backend foundation

**Date:** 2026-11-08
**Tool:** opencode CLI (`deepseek-v4.1-flash`)
**Intent:** Implement the backend foundation for the approved MVP: `CLUB` role, organizer ownership, match/tournament linkage, scores, tickets, rewards, redemptions, audit events, RLS/grants and the new RPCs.
**Boundary:** Approved MVP backend change (#128). AI added migrations, RPCs, RLS, fixtures, scripts and integration tests. No frontend pages, real payments, coupons or production deployment. The human approved the MVP scope and decisions.
**Prior records reviewed:** Epic #127, approved MVP plan and decisions, ADR-002/003, invariant registry, RLS/grant pattern, existing market/registration RPCs, test support.
**Work performed:**
- Added `20261120_mvp_schema.sql`, `20261121_mvp_rls.sql` and `20261122_mvp_rpcs.sql`.
- Added organizer tournament/match CRUD, ticket claim, reward redemption, club aggregate/time-series, export audit and ownership-aware resolution.
- Added `CLUB` role support, `scripts/create-club.ts` and `bun run auth:club`.
- Added `tests/integration/mvp-backend.test.ts`.
- Updated the architecture guard for the new mutation RPCs.
**Verification:** CI run [42480124658](https://github.com/match-pulse/match-pulse/actions/runs/42480124658) passed all four jobs: build, 36 tests across 8 files, delivery/recovery and fault injection. The first run found a ticket ordering defect: a duplicate claim returned "tickets sold out" before checking the existing ticket. The duplicate check was moved before the allocation check and the suite passed.
**Learning:**
- The ticket claim must distinguish "already claimed" from "sold out" before checking allocation.
- Ownership must be enforced in `resolve_market`, not only in the organizer RPCs.
- Club analytics must suppress small cohorts and return no identities; the SQL returns null metrics when the cohort is below 5.
**Limitations:** No UI yet. Club privacy still needs a formal privacy review. No real-user or independent review. The organizer/club/fan front ends are separate issues.

**Links:** issue #128 · PR #136 · [verification record](verification/2026-11-128-mvp-backend.md) · [code map](../architecture/04-code-map.md)

---

## Entry 36 — Security, performance and MVP documentation

**Date:** 2026-11-08
**Tool:** opencode CLI (`deepseek-v4.1-flash`)
**Intent:** Add the MVP security/performance baseline and the missing product/test/security/operations documentation: tracked-file secret scan, dependency audit, performance script/workflow, threat model, failure modes, test strategy, MVP scope and ADRs 004–006.
**Boundary:** Tooling and documentation. AI added `scripts/check-secrets.ts`, `scripts/performance.ts`, `.github/workflows/performance.yml`, README/CI updates and the named documents. No product behavior or schema change.
**Prior records reviewed:** Epic #127, backend #128, frontends #137, E2E #138, approved MVP scope/decisions, ADR-003, test strategy and security plan.
**Work performed:**
- Added `bun run check:secrets` and `bun audit --audit-level=high` to the build job.
- Added a scheduled/manual `Performance baseline` workflow for 20/50/100 concurrent registration bursts.
- Added `docs/product/mvp-scope.md`, `docs/methodology/test-strategy.md`, `docs/security/threat-model.md`, `docs/operations/failure-modes.md` and ADRs 004–006.
- Updated README status, CI jobs, known gaps and documentation links.
**Verification:** Local `bun run check:secrets` passes (placeholder lines ignored); `bun audit --audit-level=high` reports no vulnerabilities; typecheck/lint/build are run before the PR; CI will run the full suite. The performance workflow is scheduled/manual and not part of the PR gate.
**Learning:**
- The secret scan must ignore documentation placeholders such as `your-local-...`; a raw assignment regex otherwise flags the setup guide.
- Performance evidence should be a separate scheduled/manual workflow to avoid slowing every PR.
- The MVP docs must distinguish implemented role journeys from production/security limits.
**Limitations:** No production load, external monitoring, independent security review or real-user validation. The accessibility gate blocks critical violations only. FND-007 and FND-008 remain human gates.

**Links:** issue #133 · issue #134 · [MVP scope](../product/mvp-scope.md) · [test strategy](test-strategy.md) · [threat model](../security/threat-model.md) · [failure modes](../operations/failure-modes.md)

---

## Entry 37 — Release v2.0.0 First MVP

**Date:** 2026-11-08
**Tool:** opencode CLI (`deepseek-v4.1-flash`)
**Intent:** Cut the first MVP release: curate the v2.0.0 changelog, align `package.json`, add the MVP report addenda, prepare the release PR, then tag and publish after CI.
**Boundary:** Release preparation and documentation. AI edited `CHANGELOG.md`, `package.json`, the dated reports and this log. No application behavior, schema or test change in the release PR.
**Prior records reviewed:** Epic #127, backend #128, frontends #137, E2E #138, security/performance/docs #139, MVP scope/test strategy/threat model, AI log Entry 36.
**Verification:** Main CI [42488335436](https://github.com/match-pulse/match-pulse/actions/runs/42488335436) passed all five jobs. E2E/accessibility passed 7 Playwright tests. The release PR CI is the final merge gate. The performance baseline is scheduled/manual; its first run is recorded separately when complete.
**Learning:** The MVP tag is a product milestone, not a claim of production readiness. The release notes must keep FND-007/FND-008, deployment, privacy review and the M-INV2 limit visible.
**Limitations:** The tag and GitHub Release are created after this entry. No real-user validation, independent review, production deployment or production recovery. The accessibility gate blocks critical violations only.

**Links:** issue #135 · [`CHANGELOG.md`](../../CHANGELOG.md) · [architecture report](../architecture/reports/2026-11-08.md) · [methodology report](reports/2026-11-08.md) · [release workflow](../workflows/release-workflow.md)

---

## Entry 38 — Request-key retention and cleanup

**Date:** 2026-11-08
**Tool:** opencode CLI (`deepseek-v4.1-flash`)
**Intent:** Add a service-role-only retention function and maintenance command for completed `trade_requests`, closing the documented retention gap.
**Boundary:** Backend maintenance and docs. AI added one migration, one maintenance script, one integration test and runbook/README updates. No change to request-key replay semantics or application runtime credentials.
**Prior records reviewed:** v2.0.0 release notes, idempotency verification, runbook, FND-003, trade_requests schema.
**Work performed:**
- Added a partial index on `trade_requests.completed_at`.
- Added `cleanup_completed_trade_requests(INTERVAL)` restricted to `service_role`.
- Added `bun run maintenance:cleanup` with `TRADE_REQUEST_RETENTION_DAYS` default 30.
- Added an integration test for old/recent deletion and authenticated denial.
- Updated runbook and README known gaps.
**Verification:** Local typecheck/lint pass; database-backed test and CI pending. The cleanup is not a scheduled production job and the application runtime does not hold the service role.
**Learning:** Retention belongs in a maintenance command, not in the trade RPC; mixing it into the request path would add latency and widen the runtime privilege surface.
**Limitations:** No scheduled production retention, no archival, no independent review. FND-007/FND-008 remain human gates.

**Links:** issue #141 · [runbook](../operations/runbook.md) · [retention test](../../tests/integration/trade-request-retention.test.ts) · [idempotency verification](verification/2026-11-107-idempotent-trades.md)

---

## Entry 39 — Release v2.0.1

**Date:** 2026-11-08
**Tool:** opencode CLI (`deepseek-v4.1-flash`)
**Intent:** Cut v2.0.1 for request-key retention and the serious accessibility gate.
**Boundary:** Release preparation only. AI edited `CHANGELOG.md`, `package.json` and this log. No code, schema or test change in the release PR.
**Prior records reviewed:** PR #142 retention, PR #144 accessibility, v2.0.0 release, main CI 42501987291.
**Verification:** Main CI [42501987291](https://github.com/match-pulse/match-pulse/actions/runs/42501987291) passed all five jobs; E2E/accessibility [42501196896](https://github.com/match-pulse/match-pulse/actions/runs/42501196896) passed the serious/critical axe gate. The release PR CI is the final gate.
**Learning:** A patch release can carry a maintenance feature and a test-hardening fix when both close documented release limits. The limits must stay visible.
**Limitations:** Tag and GitHub Release are created after this entry. No real-user validation, independent review, production deployment, production recovery or scheduled retention.

**Links:** issue #145 · [`CHANGELOG.md`](../../CHANGELOG.md) · [release workflow](../workflows/release-workflow.md)

---

## Entry 40 — Course submission package

**Date:** 2026-11-08
**Tool:** opencode CLI (`deepseek-v4.1-flash`)
**Intent:** Commit the four generated course submission PDFs and a submission index so the package is available in the repository, not only as a CI artifact.
**Boundary:** Submission packaging and documentation only. AI copied CI-generated PDFs, removed the `docs/submissions/*.pdf` ignore rule, added `docs/submissions/README.md`, updated the README link and accessibility gap, amended the architecture report's PDF appendix with a dated update, corrected the methodology report's axe wording, and edited this log. No application, schema, test or exporter change.
**Prior records reviewed:** issue #147 / PR #148 PDF pipeline, CI run 42508702870, architecture report Appendix A/C, methodology report, v2.0.1 release, issue #143 / PR #144 accessibility gate.
**Work performed:** Task 1 kata, Task 2 characteristics, architecture report and methodology report exported by `bun run docs:pdf` and committed under `docs/submissions/`; index maps each deliverable to its Markdown source and regeneration command.
**Verification:** CI run [42510991205](https://github.com/match-pulse/match-pulse/actions/runs/42510991205) passed all five jobs and generated the artifact. Page counts verified with `pdfinfo`: kata 1, characteristics 11, architecture report 11, methodology report 8. First and last pages were rendered with `pdftoppm` and inspected; the kata is one readable page, and text extraction confirms the updated appendix and axe wording. The `file` utility misreported two reports as 8 pages; `pdfinfo` and the rendered footers agree on 11, so `pdfinfo` is recorded as the check.
**Learning:** Generated-artifact page counts must be read from a reliable tool. Committing the PDFs makes the submission self-contained, but the Markdown sources remain authoritative and regeneration overwrites the binaries.
**Limitations:** Interior pages were not individually reviewed. The package makes no real-user, independent-review, production-deployment or production-recovery claim. Regeneration can change PDF bytes without changing content.

**Links:** issue #149 · PR #150 · [`docs/submissions/README.md`](../submissions/README.md)

---

## Entry 41 — Submission package generation commit

**Date:** 2026-11-08
**Tool:** opencode CLI (`deepseek-v4.1-flash`)
**Intent:** Correct the generation-commit reference in the submission index: the committed PDFs came from `f4d2dfe`, not `04406a1`.
**Boundary:** One documentation line in `docs/submissions/README.md` plus this entry. No PDF, application, schema or test change.
**Prior records reviewed:** issue #149, PR #150, submission index, CI runs 42510991205 and 42511782242.
**Verification:** `git rev-parse` confirmed the full hashes; `pdftotext` comparison showed the PDFs from runs 42510991205 and 42511782242 have identical text, so the committed artifacts match the corrected source commit.
**Learning:** Provenance references must name the commit that actually produced the committed artifact, not an earlier generation.
**Limitations:** Docs-only; the PR CI is the final gate.

**Links:** issue #151 · PR #152 · [`docs/submissions/README.md`](../submissions/README.md)

---

## Entry 42 — v3.0.0 contract and Phase 0

**Date:** 2026-11-09
**Tool:** opencode CLI (`deepseek-v4.1-flash`)
**Intent:** Establish the approved v3.0.0 contract: club tenancy, subscription entitlements, platform admin, email/password identity, cross-club fans, simulated commerce, CLI parity and an executable agent playbook.
**Boundary:** Phase 0 planning and documentation only. AI wrote the execution plan, ADR-007/008/009, capability manifest, agent playbook specification, OpenSpec change and documentation links. No application, schema, migration, auth or test behavior changed.
**Prior records reviewed:** epic #153, v2.0.0/v2.0.1 releases, ADR-001–006, MVP scope, invariant registry, findings register (FND-007/FND-008 open), submission package, OpenSpec README and archived fault-injection change.
**Work performed:** approved `docs/methodology/exec-plans/153-v3-club-subscriptions.md`; ADR-007 club tenancy and entitlements; ADR-008 platform-admin boundary; ADR-009 email/password, cross-club fans and simulated commerce; `docs/testing/capabilities.md`; `docs/testing/README.md`; `docs/testing/agent-playbook.md`; OpenSpec change `add-club-tenancy-and-cli` with six capability specs, design and tasks.
**Verification:** `openspec validate add-club-tenancy-and-cli --type change --strict` returned “Change is valid”; a relative-link check over the new documents found no missing targets; `git diff --check` passed. Implementation evidence is not yet claimed.
**Learning:** Writing the capability manifest and playbook before the schema forces every planned feature to name its CLI command, database contract, authorization test and scenario target.
**Limitations:** The playbook is a specification until the CLI and scenarios exist. No tenancy, entitlement, auth or ticketing behavior is implemented in this entry. FND-007 and FND-008 remain human gates.

**Links:** issue #153 · [`execution plan`](exec-plans/153-v3-club-subscriptions.md) · [`OpenSpec change`](../../openspec/changes/add-club-tenancy-and-cli/proposal.md) · [`agent playbook`](../testing/agent-playbook.md)

---

## Entry 43 — Nominal ticketing contract

**Date:** 2026-11-09
**Tool:** opencode CLI (`deepseek-v4.1-flash`)
**Intent:** Fold Italian nominal ticketing into the approved v3.0.0 contract: buyer vs attendee, identity fields, max four, digital QR, name change, fan cards, box office and away-sector rules.
**Boundary:** Contract and documentation only. AI updated the execution plan, ADR-010, the competitive landscape, OpenSpec specs/design/tasks, the capability manifest, the agent playbook and documentation links. No code, schema, auth or test behavior changed.
**Prior records reviewed:** epic #153, Phase 0 #154, PR #155, ADR-007/008/009, Inter ticket conditions, Juventus ticketing, Torino FAQ, Roma ticketing, and the earlier v3.0.0 plan.
**Work performed:** ADR-010 nominal ticketing and attendee identity; competitive landscape for TicketOne, Vivaticket, Ticketmaster Italy, club in-house systems and secondary marketplaces; nominal ticketing requirements in the OpenSpec ticketing spec; attendee/privacy separation in the prediction spec; CLI/playbook updates; revised execution plan.
**Verification:** `openspec validate add-club-tenancy-and-cli --type change --strict` passed after the edits; relative links in the new and changed documents were checked; `git diff --check` passed. Implementation evidence is not claimed.
**Learning:** Italian ticketing is nominative; the buyer and the attendee are different people. Treating attendee identity as event-access data keeps it separate from financial KYC and from aggregate prediction insights.
**Limitations:** The plan and playbook are specifications until the schema/CLI/UI exist. Deep FIGC/Questura/fan-card integration, wallet passes and seat maps are out of scope. FND-007 and FND-008 remain human gates.

**Links:** issue #156 · [`execution plan`](exec-plans/153-v3-club-subscriptions.md) · [`ADR-010`](../architecture/adr/010-nominal-ticketing-and-attendee-identity.md) · [`competitive landscape`](../product/competitive-landscape.md)

---

## Entry 44 — v3.0.0 club tenancy and nominal ticketing schema

**Date:** 2026-11-09
**Tool:** opencode CLI (`deepseek-v4.1-flash`)
**Intent:** Implement the v3 database foundation for club tenancy, subscription entitlements, platform administration and nominal ticketing.
**Boundary:** Database migrations, RLS/grants, helper functions, club/plan/ticketing RPCs, architecture-guard updates, integration tests, a CI port-cleanup step, OpenSpec task checkboxes and the verification record. No UI, Server Action, auth or CLI migration in this entry.
**Prior records reviewed:** epic #153, contract #156, execution plan, ADR-007/008/009/010, migrations 20261018–20261130, invariant registry, findings register.
**Work performed:** `20261201_v3_club_tenancy.sql` (clubs, members, invites, platform admins, plans, entitlements, subscriptions, ticket types/orders/attendees/transfers/fan cards, event ownership, backfill); `20261202_v3_club_rls.sql` (helpers, public views, RLS, grants); `20261203_v3_club_rpcs.sql` (club, membership, plan, event, match, admin); `20261204_v3_ticketing_rpcs.sql` (nominal purchase, transfer, check-in, box office, analytics, rewards, club-aware resolution); `tests/integration/v3-club-tenancy.test.ts`; architecture guard updates.
**Verification:** CI run [42609325110](https://github.com/match-pulse/match-pulse/actions/runs/42609325110) passed all five jobs. Domain invariants: **41 pass / 0 fail across 10 files**. Delivery/recovery restored 26 tables and 35 policies with the marker intact. Fault injection produced its expected results. E2E/accessibility and build passed. Details: [verification record](verification/2026-11-157-v3-club-tenancy.md).
**Corrections during verification:** removed an `extensions.gen_random_bytes` dependency that broke scratch-database restore; restored legacy organizer resolution for markets without a tournament link; qualified an ambiguous `checked_in_at` in check-in; added a CI port cleanup after two port-54322 collisions.
**Learning:** A tenancy migration must preserve the old authorization path until the application is migrated, and generated defaults can break a restore even when the live database is healthy.
**Limitations:** The UI/auth/CLI still use the v2 paths. Attendee retention cleanup, real payments, financial KYC, hosted deployment and production recovery are not implemented. FND-007 and FND-008 remain human gates.

**Links:** issue #157 · PR #158 · [`execution plan`](exec-plans/153-v3-club-subscriptions.md) · [`verification`](verification/2026-11-157-v3-club-tenancy.md)

---

## Entry 45 — v3 shared contract and CLI

**Date:** 2026-11-09
**Tool:** opencode CLI (`deepseek-v4.1-flash`)
**Intent:** Add a shared domain contract and a `matchpulse` CLI exposing the v3 club, nominal ticketing, prediction, analytics and admin capabilities.
**Boundary:** `src/lib/domain/`, `src/cli/`, a CLI end-to-end test, the `test:agent` CI step, package metadata and the capability manifest. No web auth or UI migration in this entry.
**Prior records reviewed:** #153, #157, execution plan, capability manifest, agent playbook, ADR-007/008/009/010, schema verification.
**Work performed:** typed domain wrappers for auth, clubs, events, tickets, predictions, analytics and admin; CLI parser, profile/session storage with `0600` permissions, JSON output, help, `commands`/`describe`, fan/club/admin/ops commands; `tests/agent/cli.test.ts`; `bun run test:agent`; CI step in the domain-invariants job.
**Verification:** CI run [42612258666](https://github.com/match-pulse/match-pulse/actions/runs/42612258666) passed all five jobs. The database suite remained **41 pass / 0 fail**; the CLI suite was **2 pass / 0 fail**, covering the match-day journey, cross-club denial and max-four refusal. Details: [verification record](verification/2026-11-159-cli-and-agent-playbook.md).
**Learning:** A CLI is a useful second client because it exposes authorization and state-transition gaps that the UI masks. The database contract, not the CLI, remains the source of truth.
**Limitations:** The web app still uses anonymous fan auth and v2 roles. OS keychain storage, `ops cleanup` as a CLI command and the full UI migration remain. FND-007 and FND-008 are open human gates.

**Links:** issue #159 · PR #160 · [`execution plan`](exec-plans/153-v3-club-subscriptions.md) · [`capability manifest`](../testing/capabilities.md) · [`verification`](verification/2026-11-159-cli-and-agent-playbook.md)

---

## Entry 46 — v3 email/password auth and member UI

**Date:** 2026-11-09
**Tool:** opencode CLI (`deepseek-v4.1-flash`)
**Intent:** Replace anonymous fan auth with email/password and add the core v3 fan, club and platform-admin web surfaces.
**Boundary:** Auth actions/forms, home routing, public events, nominal checkout, my tickets, club dashboard/event management, admin console, the v3 demo fixture and E2E/axe updates. No new billing, payments or KYC.
**Prior records reviewed:** #153, #157, #159, ADR-009/010, capability manifest, agent playbook, schema and CLI verification records.
**Work performed:** email/password sign-up/sign-in; routing by admin/club/legacy/fan; `/events`, `/events/[id]`, `/fan/tickets`, `/club/dashboard`, `/club/events/[id]`, `/admin`; v3 server actions and shared domain calls; demo club/event fixture; updated smoke, Playwright and axe tests.
**Verification:** CI run [42619208713](https://github.com/match-pulse/match-pulse/actions/runs/42619208713) passed all five jobs. The E2E/accessibility job passed 8 tests, including fan sign-up and nominal purchase; the database suite remained 41 pass; the CLI suite remained 2 pass. Details: [verification record](verification/2026-11-161-v3-auth-ui.md).
**Corrections during verification:** server-action redirects were caught by `try/catch`; organizer routing conflicted with the demo club membership; native selects failed contrast; the smoke test and a strict locator were stale.
**Learning:** Server-action redirects must sit outside the error-catching block, and tenant membership changes the home routing of existing fixture accounts.
**Limitations:** Club member management, fan-card list, club rewards and prediction insights are only partly in the UI. The ticket is a code, not a QR image/wallet pass. Legacy pages remain. FND-007/FND-008 are open human gates.

**Links:** issue #161 · PR #162 · [`execution plan`](exec-plans/153-v3-club-subscriptions.md) · [`verification`](verification/2026-11-161-v3-auth-ui.md)

---

## Entry 47 — v3 club members, rewards, insights and market resolution

**Date:** 2026-11-09
**Tool:** opencode CLI (`deepseek-v4.1-flash`)
**Intent:** Complete the club-facing v3 UI and close the match-day loop with market resolution.
**Boundary:** Club dashboard sections, invitation page, fan rewards page, export route, server actions, market-resolution UI/CLI, admin fixture and E2E/axe tests. No real payments, KYC or new schema.
**Prior records reviewed:** #161, #163, ADR-007/010, capability manifest, auth/UI verification.
**Work performed:** member invite/role/remove actions and UI; fan-card list; club reward create/list; fan reward redemption; aggregate prediction insights table; ELITE CSV export route; invitation accept page; admin console fixture; market resolution action/CLI/UI; expanded Playwright and axe coverage.
**Verification:** CI run [42622546311](https://github.com/match-pulse/match-pulse/actions/runs/42622546311) passed all five jobs. E2E/accessibility: **11 passed**, including the club dashboard/event page and admin console axe checks. Database: 41 pass; CLI: 2 pass, including market resolution. Details: [verification record](verification/2026-11-163-club-members-rewards-insights.md).
**Learning:** The full match-day loop needs an explicit resolution step; without it the prediction data remains open and the fan’s payout cannot be demonstrated.
**Limitations:** Invitations are displayed rather than emailed locally. QR images/wallet passes, retention cleanup and real payments remain. FND-007/FND-008 are open human gates.

**Links:** issue #163 · PR #164 · [`execution plan`](exec-plans/153-v3-club-subscriptions.md) · [`verification`](verification/2026-11-163-club-members-rewards-insights.md)

---

## Entry 48 — v3 attendee-data retention

**Date:** 2026-11-09
**Tool:** opencode CLI (`deepseek-v4.1-flash`)
**Intent:** Add a service-role-only cleanup that removes attendee identity from past-event tickets while preserving ticket, order, points and audit.
**Boundary:** Migration, maintenance script, package script, integration test, runbook and README known-gap update. No application runtime service-role use.
**Prior records reviewed:** #156, ADR-010, execution plan task 2.7, privacy rule, CLI/schema verification records.
**Work performed:** `cleanup_expired_attendee_data(INTERVAL)`; `scripts/cleanup-attendee-data.ts`; `bun run maintenance:cleanup-attendees`; an old/recent ticket test and authenticated denial; runbook section.
**Verification:** CI run [42626348710](https://github.com/match-pulse/match-pulse/actions/runs/42626348710) passed all five jobs. The database suite was **42 pass / 0 fail**, including the retention test; the CLI suite remained 2 pass; E2E/accessibility passed. Details: [verification record](verification/2026-11-165-attendee-retention.md).
**Learning:** A privacy promise needs an executable cleanup path; keeping the ticket code and order while clearing identity preserves operations and evidence.
**Limitations:** No scheduled production job, no independent legal/privacy review, and the audit actor is null because the maintenance context is the service role. FND-007/FND-008 remain human gates.

**Links:** issue #165 · PR #166 · [`runbook`](../operations/runbook.md) · [`verification`](verification/2026-11-165-attendee-retention.md)

---

## Entry 49 — v3.0.0 current-state documentation refresh

**Date:** 2026-11-09
**Tool:** opencode CLI (`deepseek-v4.1-flash`)
**Intent:** Bring the current-state documentation and reports in line with the implemented v3.0.0 system before the release.
**Boundary:** README, kata, domain model, system overview, C4 views, code map, characteristics, test strategy, threat model, failure modes, runbook, SLOs, product scope, checkpoints D/E, ADR updates, report addenda, changelog and package version. No application behavior change in this entry.
**Prior records reviewed:** all v3 execution/verification records, ADR-007–010, capability manifest, agent playbook, competitive landscape.
**Work performed:** v3 README and product scope; K16–K20 and the club-first kata; v3 domain model and flows; C4 containers/components for the CLI, club/ticketing and admin; v3 code map; K16–K20 characteristic traceability; tenancy/ticketing/privacy invariants; test strategy, threat model, failure modes, runbook and SLOs; dated report addenda; ADR updates; v3.0.0 changelog and package version.
**Verification:** `bun run typecheck`, `bun run lint`, `bun run build` and `bun run check:architecture` passed locally; a relative-link check over the changed documents found no missing local targets. CI is the final gate.
**Learning:** The current-state docs now describe the implemented model rather than the v2 prototype; the dated reports keep the v2 snapshot and add a v3 addendum.
**Limitations:** The submission PDFs are regenerated after this documentation merge; no release tag is created in this entry. FND-007/FND-008 remain human gates.

**Links:** issue #169 · [`execution plan`](exec-plans/153-v3-club-subscriptions.md) · [`architecture report`](../architecture/reports/2026-11-08.md) · [`methodology report`](reports/2026-11-08.md)

---

## Entry 50 — v3.0.0 release package

**Date:** 2026-11-09
**Tool:** opencode CLI (`deepseek-v4.1-flash`)
**Intent:** Prepare the v3.0.0 release package: current-state docs, dated report addenda, submission PDFs, version/changelog and verification record.
**Boundary:** Documentation, PDFs and release metadata only. No application behavior change in this entry.
**Prior records reviewed:** all v3 schema/CLI/auth/UI/club/retention/QR verification records, ADR-007–010, execution plan, capability manifest, findings register.
**Work performed:** updated README/product scope/kata/domain/system/C4/code map/characteristics/test strategy/threat model/failure modes/runbook/SLOs/checkpoints/ADRs; added v3 report addenda; regenerated and committed the four submission PDFs (kata 1 page, characteristics 12, architecture report 13, methodology report 10); updated the submission index; set `package.json` to `3.0.0`; added the v3.0.0 changelog section.
**Verification:** CI run [42633841431](https://github.com/match-pulse/match-pulse/actions/runs/42633841431) passed all five jobs: 42 database tests, 2 CLI tests, 11 E2E/axe tests, delivery/recovery and fault injection. `pdfinfo` confirmed the page counts; the kata was rendered and inspected. Details: [verification record](verification/2026-11-169-v3-release.md).
**Learning:** A release package is more than a tag: the current-state docs, dated addenda, PDFs, version and evidence must name the same system and the same limits.
**Limitations:** The tag and GitHub Release follow after merge and are not claimed in this entry. No real payments, financial KYC, hosted deployment or independent review. FND-007/FND-008 remain human gates.

**Links:** issue #169 · PR #170 · [`execution plan`](exec-plans/153-v3-club-subscriptions.md) · [`submission index`](../submissions/README.md) · [`verification`](verification/2026-11-169-v3-release.md)

---

## Entry 51 — Software audit of MatchPulse v3.0.0

**Date:** 2026-11-10
**Tool:** opencode CLI (`deepseek-v4.1-flash`)
**Intent:** Run the first formal, read-only software audit of the v3.0.0 baseline and record evidence-backed findings for human triage.
**Boundary:** Read-only for application code, tests, migrations, CI and historical records. Issue [#171](https://github.com/match-pulse/match-pulse/issues/171) was created with human authorization before inspection. The audit report, findings-register rows FND-009–FND-028 and this entry are new records; the methodology record index gained one link. No existing historical record was overwritten.
**Prior records reviewed:** findings register FND-001–008; README status and known gaps; invariant registry; authorization, idempotency, delivery, recovery, v3 tenancy, CLI, auth UI, club features, retention and release verification records; ADR-003/007/008/009/010; threat model; failure-modes; CI configuration; agent playbook; capability manifest. No prior audit report exists.
**Work performed:** inspected the full v3.0.0 application and database surface at `bbc4a43`; traced club tenancy, plans/entitlements, nominal ticketing, transfers, check-in, retention, rewards, insights/export, platform admin, CLI and the legacy compatibility paths; compared implementation and tests against the invariant registry and security/privacy claims; wrote [`audits/2026-11-10-171-v3-audit.md`](audits/2026-11-10-171-v3-audit.md), appended the register and added the record-index link.
**Verification:** static evidence only. This environment has no Bun, Node, Docker, Playwright or local Supabase; no lint, typecheck, build, database test, CLI test, browser test or fault-injection run was executed. Findings cite source, migration, test, configuration or recorded CI evidence. The audit report records 3 Critical, 9 Major, 6 Minor and 2 Informational findings, all Open.
**Learning:** The v3 authorization boundary is materially stronger than v2, but three controls are not closed: anonymous auth remains enabled; the legacy organizer ticket policy survives; and the market lifecycle is not coupled to the match result. The "Verified" labels for T-INV4, T-INV8 and T-INV10 are broader than their tests. A green CI run is not a substitute for a failure-mode-specific test.
**Relevant rejected/corrected suggestions:** The audit considered reporting club plan self-selection as a defect, but ADR-007 and the domain model explicitly describe a simulated plan choice, so it was not raised. It also considered reporting post-`FINISHED` trading as a direct spec violation; M-INV1 defines the window as opening at kickoff and ending at resolution, so the finding is recorded as a design/invariant risk requiring a human decision. The any-organizer rule for unlinked legacy markets is already a documented residual in the threat model, so it was noted as a limitation rather than duplicated as a new finding.
**Limitations:** No hosted deployment, production configuration, live environment, legal/privacy review, external penetration test or load test. FND-007 and FND-008 remain open. The triage table is intentionally pending; no remediation is approved or implemented.

**Links:** issue #171 · [`audit report`](audits/2026-11-10-171-v3-audit.md) · [`findings register`](findings-register.md) · `baseline bbc4a43 / v3.0.0`

---

## Entry 52 — Security boundary remediation

**Date:** 2026-11-10
**Tool:** opencode CLI (`deepseek-v4.1-flash`)
**Intent:** Close FND-009, FND-010 and FND-022 from the v3.0.0 audit.
**Boundary:** Local auth configuration, one corrective RLS/policy migration, authorization and v3 tenancy tests, threat model and verification record. No application runtime feature changes.
**Prior records reviewed:** audit report AUD-001/AUD-002/AUD-014; FND-001/FND-009/FND-010/FND-022; ADR-003/008/010; threat model; authorization verification; execution plan #173.
**Work performed:** set `enable_anonymous_sign_ins = false`; added `20261206_security_boundary.sql` to drop `tickets_select_organizer`/`registrations_select_organizer` and remove direct platform-admin reads from invitation/fan-card policies; replaced the anonymous-auth test with a refusal test; added removed-member and platform-admin direct-read tests; updated the threat model and verification record.
**Verification:** `bun test --env-file=.env.local tests/invariants/authorization.test.ts tests/integration/v3-club-tenancy.test.ts` — 14 pass / 0 fail. `bun run test` — 44 pass / 0 fail. `bun run lint`, `bun run typecheck`, `bun run build`, `bun run check:architecture`, `bun run check:secrets` and `bun audit --audit-level=high` passed. Details: [`verification/2026-11-174-security-boundary.md`](verification/2026-11-174-security-boundary.md).
**Learning:** The legacy organizer policies survived the v3 RLS migration because the new policies were additive; policy review must include `DROP POLICY`, not only new `CREATE POLICY` statements. Local Docker 29 exposed a Kong 2.8.1 DNS-resolution issue; the running Kong config was patched to container IPs for this session and the local stack limitation is recorded.
**Limitations:** The verification is implementer-authored; independent verification and the PR link are pending. The local Kong workaround is an environment issue, not an application fix. E2E, fault injection and smoke remain for the campaign final gate. FND-007/FND-008 remain open.

**Links:** issue #174 · PR [#184](https://github.com/match-pulse/match-pulse/pull/184) · [`verification`](verification/2026-11-174-security-boundary.md) · [`findings register`](findings-register.md) · [`execution plan`](exec-plans/173-audit-remediation.md)

---

## Entry 53 — Result-bound market lifecycle

**Date:** 2026-11-10
**Tool:** opencode CLI (`deepseek-v4.1-flash`)
**Intent:** Close FND-011 and FND-014 from the v3.0.0 audit.
**Boundary:** New trigger migration, market/event UI, CLI test, fixtures, ADR-011, domain model, invariant registry, agent playbook and verification record. No payment, ticket or entitlement changes.
**Prior records reviewed:** audit AUD-003/AUD-006; FND-011/FND-014; M-INV1/M-INV6; ADR-002; execution plan #173.
**Work performed:** added `20261207_market_result_binding.sql` with triggers for the entry window, score-bound resolution, match-result integrity and BUY-only prediction gating; updated the market page and trader to close entries while preserving exits; showed the resolve form only after `FINISHED`; added `finishMatch` fixture and lifecycle tests; added ADR-011 and updated the domain model/invariant registry/playbook.
**Verification:** `bun test --env-file=.env.local tests/invariants/market-lifecycle.test.ts` — 9 pass / 0 fail. `bun test --env-file=.env.local tests/integration/mvp-backend.test.ts` — 8 pass / 0 fail. `bun run typecheck`, `lint`, `build` and `check:architecture` passed. Full suite/E2E and independent verification remain pending. Details: [`verification/2026-11-175-market-lifecycle.md`](verification/2026-11-175-market-lifecycle.md).
**Learning:** The result is public at full time, so "until resolution" is not a safe entry window. Exits and entries need different gates: a finished match closes buying but must not trap holders. Triggers enforce the rule on every mutation path and keep the check close to the data.
**Limitations:** Fault injection for the new triggers is not added yet; full suite/E2E and independent verification are pending. Local Docker/Kong workaround remains.

**Links:** issue #175 · PR [#185](https://github.com/match-pulse/match-pulse/pull/185) · [`ADR-011`](../architecture/adr/011-result-bound-market-lifecycle.md) · [`verification`](verification/2026-11-175-market-lifecycle.md) · [`findings register`](findings-register.md) · [`execution plan`](exec-plans/173-audit-remediation.md)

---

## Entry 54 — Ticketing integrity

**Date:** 2026-11-10
**Tool:** opencode CLI (`deepseek-v4.1-flash`)
**Intent:** Close FND-012, FND-017 and FND-018 from the v3.0.0 audit.
**Boundary:** New trigger migration, legacy claim/registration scoping, legacy fan-page filters, database tests, domain model, invariant registry, agent playbook, code map and verification record.
**Prior records reviewed:** audit AUD-004/AUD-009/AUD-010; FND-012/FND-017/FND-018; T-INV4/T-INV5; ADR-010; ticket integration tests; execution plan #173.
**Work performed:** added `20261208_ticketing_integrity.sql` with cumulative buyer-limit, event-capacity-config and ticket-capacity triggers; scoped `claim_ticket`/`register_for_tournament` to `club_id IS NULL`; filtered the legacy tournament pages; added sequential and concurrent cap/legacy tests.
**Verification:** targeted `v3-club-tenancy` tests pass; after rebasing onto merged market lifecycle and resetting the local database, `bun run test` is 50 pass, `test:agent` 2 pass, `test:e2e` 11 passed, and build/typecheck/lint/architecture pass. Details: [`verification/2026-11-178-ticketing-integrity.md`](verification/2026-11-178-ticketing-integrity.md).
**Learning:** A per-order cap check is not a per-buyer cap; the cumulative rule needs a transaction-boundary check on the order insert. Capacity configuration and sales need both a configuration guard and a sales-path guard.
**Limitations:** Fault-injection and independent verification pending. The legacy compatibility pages remain for club-less tournaments. Local Kong/Docker DNS workaround remains.

**Links:** issue #178 · PR [#186](https://github.com/match-pulse/match-pulse/pull/186) · [`verification`](verification/2026-11-178-ticketing-integrity.md) · [`findings register`](findings-register.md) · [`execution plan`](exec-plans/173-audit-remediation.md)

---

## Entry 55 — Reward idempotency

**Date:** 2026-11-10
**Tool:** opencode CLI (`deepseek-v4.1-flash`)
**Intent:** Close FND-013 by making reward redemption retry-safe.
**Boundary:** Reward schema/RPC, domain wrapper, Server Action, fan rewards client form, CLI, architecture guard, tests and verification record.
**Prior records reviewed:** audit AUD-005; FND-013; FND-003 idempotency pattern; trade request tables; agent playbook; execution plan #173.
**Work performed:** added `request_id`/`points_after` to `reward_redemptions` with a unique index; replaced `redeem_reward` with a required key and reward → profile → replay → eligibility → debit order; updated the web form and CLI; removed the obsolete one-argument legacy action.
**Verification:** targeted reward tests 3 pass; full database 49 pass, CLI 2 pass, E2E 11 passed, build/typecheck/lint/architecture pass. Details: [`verification/2026-11-180-reward-idempotency.md`](verification/2026-11-180-reward-idempotency.md).
**Learning:** A retry must be replayable even after the balance or club-ticket eligibility has changed; the replay lookup therefore precedes the current eligibility/balance checks.
**Limitations:** Fault injection and independent verification pending. The client key survives while the form is mounted but not across a full page reload. Local Kong/Docker DNS workaround remains.

**Links:** issue #180 · PR [#187](https://github.com/match-pulse/match-pulse/pull/187) · [`verification`](verification/2026-11-180-reward-idempotency.md) · [`findings register`](findings-register.md) · [`execution plan`](exec-plans/173-audit-remediation.md)

---

## Entry 56 — Subscription limits and concurrency

**Date:** 2026-11-10
**Tool:** opencode CLI (`deepseek-v4.1-flash`)
**Intent:** Close FND-019 and FND-028 by refusing inactive subscriptions and serialising plan-limit checks.
**Boundary:** One migration replacing invite, accept and event-create RPCs; v3 integration tests; invariant registry, findings register and verification record.
**Prior records reviewed:** audit AUD-011/AUD-020; FND-019/FND-028; T-INV3; failure modes; execution plan #173.
**Work performed:** required an active subscription entitlement before reading the plan limit; locked the subscription row before member/event count-and-insert with a documented lock order; added a canceled-subscription test and a four-request concurrent STARTER event test.
**Verification:** targeted v3 tests 9 pass; full database 50 pass, CLI 2 pass, E2E 11 passed, build passed after rebasing and resetting the local database. Details: [`verification/2026-11-177-subscription-limits.md`](verification/2026-11-177-subscription-limits.md).
**Learning:** `NULL` limits mean unlimited only for an active, entitled plan. Without an active-subscription check, a canceled club is treated as unlimited, which is the opposite of the intended control.
**Limitations:** Fault injection and independent verification pending. The concurrency test is a four-request boundary check, not a load benchmark. Local Kong/Docker DNS workaround remains.

**Links:** issue #177 · [`verification`](verification/2026-11-177-subscription-limits.md) · [`findings register`](findings-register.md) · [`execution plan`](exec-plans/173-audit-remediation.md)

---

## Entry 57 — Privacy retention and outcome-level cohort suppression

**Date:** 2026-11-10
**Tool:** opencode CLI (`deepseek-v4.1-flash`)
**Intent:** Close FND-015 and FND-016.
**Boundary:** Retention migration and fan-card audit write, insights/time-series RPCs, v3 integration tests, domain model, invariant registry and verification record.
**Prior records reviewed:** audit AUD-007/AUD-008; FND-015/FND-016; ADR-010; T-INV8/T-INV10; retention tests; domain model; execution plan #173.
**Work performed:** extended `cleanup_expired_attendee_data` to redact transfer previous/new identity, remove old fan-card `card_number` metadata and delete accepted/expired invitation emails; stopped storing card numbers in new fan-card audit events; changed insights/time-series to count distinct predictors per outcome and per bucket and suppress each cohort below five.
**Verification:** targeted v3 tests 8 pass; full database 49 pass, CLI 2 pass, E2E 11 passed, build passed after rebasing and resetting the local database. The skewed 5-total cohort test shows every outcome suppressed, then HOME shown at exactly five predictors while DRAW/AWAY remain suppressed. Details: [`verification/2026-11-179-privacy-retention.md`](verification/2026-11-179-privacy-retention.md).
**Learning:** Threshold suppression at market level does not protect a one-person outcome inside a larger market; the cohort must be counted and suppressed per outcome and time bucket. Retention must follow derived identity, not only the current ticket row.
**Limitations:** Fault injection and independent verification pending. The 365-day window remains the existing product default. Time-series suppression is not separately E2E-tested. Local Kong/Docker DNS workaround remains.

**Links:** issue #179 · PR [#190](https://github.com/match-pulse/match-pulse/pull/190) · [`verification`](verification/2026-11-179-privacy-retention.md) · [`findings register`](findings-register.md) · [`execution plan`](exec-plans/173-audit-remediation.md)

---

## Entry 58 — Minor hardening and residual dispositions

**Date:** 2026-11-10
**Tool:** opencode CLI (`deepseek-v4.1-flash`)
**Intent:** Close FND-021 and FND-024, close FND-025, and record the approved dispositions for FND-020, FND-023, FND-026 and FND-027.
**Boundary:** CSV encoder and two export routes, organizer seed assignment, ticket payload hash migration and checkout key rotation, unit/integration/E2E coverage, disposition and verification records, README known gaps.
**Prior records reviewed:** audit AUD-012/AUD-013/AUD-015/AUD-016/AUD-017/AUD-018/AUD-019; FND-020/FND-021/FND-023/FND-024/FND-025/FND-026/FND-027; execution plan #173; agent playbook; seed data; export routes.
**Work performed:** added `src/lib/csv.ts` and used it in both export routes; added unit tests; assigned the seeded tournament to the organizer fixture; added `20261212_ticket_payload_hash.sql` with payload-aware replay; rotated the checkout request key on ticket-type/quantity changes; documented the CLI `--request-id`; recorded the four residual dispositions and opened issue #188 for the deferred legacy CLUB retirement.
**Verification:** unit 2 pass; v3 integration 10 pass; full database 57 pass; CLI 2 pass; E2E 11 passed from a clean reset; build passed; seed `update_match` + `resolve_market` smoke returned a payout row. Details: [`verification/2026-11-182-minor-hardening.md`](verification/2026-11-182-minor-hardening.md).
**Learning:** Quoting a CSV cell does not stop a spreadsheet formula; the encoder must neutralise the leading character before quoting. Payload-aware idempotency needs the payload fingerprint stored on the first request, not only compared at request time.
**Limitations:** FND-020 was later closed by the Entry 59 fault-injection matrix. FND-023 is deferred to #188. FND-026/FND-027 are accepted risks. No finding is marked Verified by the implementer. Local Kong/Docker DNS workaround remains.

**Links:** issue #182 · [`dispositions`](remediation/2026-11-10-audit-dispositions.md) · [`verification`](verification/2026-11-182-minor-hardening.md) · [`findings register`](findings-register.md) · [`execution plan`](exec-plans/173-audit-remediation.md)

---

## Entry 59 — Fault-injection evidence and invariant corrections

**Date:** 2026-11-10
**Tool:** opencode CLI (`deepseek-v4.1-flash`)
**Intent:** Close FND-020 by making the invariant evidence match the claims and covering the v3.1.0 guards with observed-red fault injection.
**Boundary:** Fault-injection runner sources/mutations, invariant registry, findings register, audit closure, verification record and this entry. No application behaviour changes.
**Prior records reviewed:** audit AUD-012; FND-020; FND-002/FND-005 evidence limits; invariant registry; execution plan #173; prior fault-injection verification.
**Work performed:** added the security, market, ticketing, reward, subscription, privacy and ticket-payload migrations to the fault-injection sources; added 16 observed-red mutations covering the result-bound window, score-bound resolution, premature finish, post-resolution score, prediction-disable exits, cumulative buyer cap, capacity configuration, legacy claim/registration, reward replay, active entitlement, transfer/audit/invite retention, cohort suppression and payload-aware replay; corrected the registry statuses to distinguish enforced, fault-injected and independently verified claims.
**Verification:** `bun run fault:inject` — all 27 entries `status: ok`; restored suite 57 pass / 0 fail (469 expect calls); CLI 2 pass; E2E 11 passed; lint/typecheck/architecture/build passed. Details: [`verification/2026-11-181-fault-injection.md`](verification/2026-11-181-fault-injection.md).
**Learning:** A test that passes with a guard removed proves nothing. The matrix must load the migration that owns the current function, not only the original definition, or a later replacement silently escapes mutation. CI also caught a weak assertion: the cohort test checked the `suppressed` flag but not that the metrics were withheld, so the mutation initially passed; the test now asserts null metrics for suppressed cohorts. The registry must say “fault-injected” rather than “verified” until a separate verifier checks it.
**Limitations:** The automatic post-matrix suite failed locally after the final reset because Kong recreated the Docker 29 upstream-DNS issue; the documented workaround restored REST/auth and the suite passed 57/57. M-INV2 remains forced-failure, the sales-path capacity trigger is defence in depth, and the subscription-lock concurrency path is timing-dependent. Independent verification pending.

**Links:** issue #181 · PR [#192](https://github.com/match-pulse/match-pulse/pull/192) · [`verification`](verification/2026-11-181-fault-injection.md) · [`findings register`](findings-register.md) · [`execution plan`](exec-plans/173-audit-remediation.md)

---

## Entry 60 — v3.1.0 audit-remediation campaign closure

**Date:** 2026-11-10
**Tool:** opencode CLI (`deepseek-v4.1-flash`)
**Intent:** Close the remediation campaign for FND-009 to FND-028 and record the final dispositions, evidence and remaining gates.
**Boundary:** Campaign verification record, audit triage/closure, findings register, README known gaps, changelog and OpenSpec tasks. No new application behaviour.
**Prior records reviewed:** audit report; findings register; execution plan #173; all workstream verification records; invariant registry; ADR-011; AI Entries 51–59.
**Work performed:** consolidated the eight remediation PRs, updated the audit triage table to the human-approved scope, corrected the closure-log PR links, added the final campaign verification record, recorded the Unreleased changelog section and closed the completed OpenSpec tasks.
**Verification:** final local/CI results are recorded in [`verification/2026-11-173-audit-remediation.md`](verification/2026-11-173-audit-remediation.md). All implemented findings are **Fixed**, not **Verified**.
**Learning:** The campaign needed separate workstreams for security, market integrity, ticketing, rewards, entitlements, privacy and evidence; combining them would have made review and rollback unsafe. The fault-injection matrix caught a weak cohort assertion that ordinary tests missed.
**Limitations:** FND-007 (real-user evidence) and FND-008 (independent human review) remain open. FND-023 is deferred to #188. FND-026/FND-027 are accepted risks. The local Kong/Docker workaround remains. No independent verifier has confirmed the findings.

**Links:** issue #173 · [`verification`](verification/2026-11-173-audit-remediation.md) · [`findings register`](findings-register.md) · [`execution plan`](exec-plans/173-audit-remediation.md) · [`changelog`](../../CHANGELOG.md)

---

## Entry 61 — Human verification and epic closure

**Date:** 2026-11-10
**Tool:** opencode CLI (`deepseek-v4.1-flash`)
**Intent:** Record the human decision owner's verification and close issue #173.
**Boundary:** Findings register, audit closure log, final campaign verification record, invariant registry and this entry. No application code changes.
**Prior records reviewed:** final campaign verification; findings register FND-007–FND-028; audit closure log; invariant registry; AI Entries 51–60.
**Work performed:** on the human's explicit instruction (“verified close this”), marked the 17 implemented findings and FND-007/FND-008 Verified, recorded the human verifier and date, updated the closure log and invariant statuses, closed issue #173 and moved it to Release & Learn (Done). FND-023 remains Deferred to #188; FND-026/FND-027 remain Accepted Risk.
**Verification:** final `main` CI run [42877928840](https://github.com/match-pulse/match-pulse/actions/runs/42877928840) passed all five jobs, including the 27-entry fault-injection matrix. The human decision owner confirmed the campaign as verified on 2026-11-10.
**Learning:** Human verification is a decision, not an automated result; the records must name the verifier and date, and must not imply a third-party audit where none occurred.
**Limitations:** The verification is the human decision owner's confirmation, not a third-party audit. FND-023, FND-026 and FND-027 retain their explicit dispositions. No release tag or version bump was made.

**Links:** issue #173 · [`verification`](verification/2026-11-173-audit-remediation.md) · [`findings register`](findings-register.md) · [`audit closure`](audits/2026-11-10-171-v3-audit.md) · [`invariant registry`](checkpoint-A/02-invariants.md)

---

## Entry 63 — Legacy CLUB retirement (FND-023 / #188)

**Date:** 2026-11-10
**Tool:** opencode CLI (`deepseek-v4.1-flash`)
**Intent:** Retire the legacy v2 CLUB analytics surface and close FND-023.
**Boundary:** Removed legacy page/export/role/fixture, added a corrective migration, updated tests and docs.
**Prior records reviewed:** FND-023; AUD-015; issue #188; v3 club dashboard/export; auth/routing tests.
**Work performed:** deleted `/club`, `/api/club/export` and `auth:club`; removed `CLUB` from the profile role union, login UI, home routing, shell, test auth and fixtures; added `20261213_retire_legacy_club.sql` to convert legacy profiles to `FAN`, tighten the role constraint and drop the legacy analytics/export RPCs; removed legacy integration/E2E tests.
**Verification:** database 55 pass / 0 fail, CLI 2 pass, E2E 9 passed, build/typecheck/lint/architecture passed. Details: [`verification/2026-11-188-legacy-club-retirement.md`](verification/2026-11-188-legacy-club-retirement.md).
**Learning:** Retiring a role is not only deleting a page; the profile constraint, login UI, routing, fixtures, RPC grants and tests must move together.
**Limitations:** Local/CI evidence only; production deployment is the final post-MVP step.

**Links:** issue #188 · [`verification`](verification/2026-11-188-legacy-club-retirement.md) · [`findings register`](findings-register.md) · [`audit`](audits/2026-11-10-171-v3-audit.md)

---
## Entry 64 — Post-merge cleanup completion rule

**Date:** 2026-11-10
**Tool:** opencode CLI (`deepseek-v4.1-flash`)
**Intent:** Make cleanup explicit before a `**No action**` response and define cleanup as removing a temporary worktree only after the branch is merged into remote `main` and required checks are green.
**Boundary:** `AGENTS.md` §11 and §13, issue #212, branch `docs/212-post-merge-cleanup`, commit, push and PR #213. No application code, schema, configuration, historical record, deployment or runtime changes.
**Prior records reviewed:** `AGENTS.md` §11/§13; issue #207 and PR #208 (merged at `d65ad27`, all five checks green); `git worktree list` (no temporary worktree remains); AI Entries 62–63.
**Work performed:** added cleanup as completion step 7 and renumbered the next-action step to 8; updated the `**No action**` rule to require confirmed remote merge, green checks and temporary-worktree removal; verified the existing PR #208 cleanup state before making the change.
**Verification:** `git diff --check` passed; `git show --stat` confirmed the first commit changes only `AGENTS.md`; PR #208 was confirmed merged with all five checks successful; `git worktree list` confirmed no temporary worktree remains. No runtime checks were run because no application code changed. PR #213 checks are pending at the time of this entry.
**Learning:** Cleanup must be a verified post-merge action, not an assumption. Removing temporary worktrees keeps the checkout tidy without touching the primary worktree, unmerged work, or unrelated changes. A `**No action**` response is a claim that this cleanup has already been completed or is not applicable.
**Limitations:** Documentation-only change; no independent review yet. The new rule is not exercised by an application test; its first use is the cleanup of PR #213 itself.

**Links:** issue #212 · PR [#213](https://github.com/match-pulse/match-pulse/pull/213) · [`AGENTS.md`](../../AGENTS.md)

---

## Entry 66 — M-INV2 observed-red mutation (FND-002 / #198)

**Date:** 2026-11-10
**Tool:** opencode CLI (`deepseek-v4.1-flash`)
**Intent:** Make M-INV2 an observed-red fault-injection result.
**Boundary:** Fault-injection runner and mutation only; no application migration.
**Prior records reviewed:** FND-002; M-INV2; `atomic-rollback.fault.ts`; fault-injection verification record.
**Work performed:** added a test-only dblink mutation that commits a trade row on a second connection before raising, plus a per-mutation `supabase_admin` apply path. The existing rollback test fails under the mutation and still passes under the forced-failure mutation.
**Verification:** targeted fault test fails with one surviving trade under the mutation; baseline forced-failure test passes. Details: [`verification/2026-11-198-m-inv2-observed-red.md`](verification/2026-11-198-m-inv2-observed-red.md).
**Learning:** A positive rollback test can be strengthened by making a side effect escape the transaction; dblink is sufficient, but it must run as a superuser-owned test-only function and never ship in production.
**Limitations:** The full 28-entry matrix is revalidated in CI; the dblink helper is test-only.

**Links:** issue #198 · [`verification`](verification/2026-11-198-m-inv2-observed-red.md) · [`findings register`](findings-register.md) · [`invariant registry`](checkpoint-A/02-invariants.md)

---

## Entry 67 — p95 CI gate and ticket burst (FND-004 / #199)

**Date:** 2026-11-10
**Tool:** opencode CLI (`deepseek-v4.1-flash`)
**Intent:** Turn the observed p95 into a CI gate and add a v3 ticket-purchase burst.
**Boundary:** Two test files, performance documentation and verification record; no application behaviour changes.
**Prior records reviewed:** FND-004; architecture characteristics §3.2; capacity and v3 ticketing tests.
**Work performed:** asserted p95 < 1,000 ms in the 100-request registration burst; added a 20-buyer concurrent ticket burst with the same assertion, no-oversell and ticket-count checks; updated the architecture/README status.
**Verification:** capacity p95 878.04 ms; ticket burst p95 240.90 ms; database 58 pass; CLI 2 pass. Details: [`verification/2026-11-199-p95-gate.md`](verification/2026-11-199-p95-gate.md).
**Learning:** A recorded latency is not a quality gate until a test fails above the target; the ticket burst also proves the purchase path under concurrency.
**Limitations:** Environment-specific; production and multi-instance load remain part of the final deployment step.

**Links:** issue #199 · [`verification`](verification/2026-11-199-p95-gate.md) · [`findings register`](findings-register.md) · [`architecture characteristics`](../architecture/03-architecture-characteristics.md)

---

---

## Entry 68 — Production deployment deferred to the final post-MVP step

**Date:** 2026-11-10
**Tool:** opencode CLI (`deepseek-v4.1-flash`)
**Intent:** Record the human decision that Vercel + hosted Supabase deployment is the final step, after the MVP is complete.
**Boundary:** Operations runbook, production deployment policy, README known gaps, findings register and decision record. No deployment, credentials or production work.
**Prior records reviewed:** FND-006; delivery and recovery verification records; runbook; issue #202.
**Work performed:** added `docs/operations/production-deployment.md` with preconditions and a deployment checklist; marked production as not provisioned in the runbook; changed FND-006 to Deferred and added the decision record.
**Verification:** Documentation-only; `git diff --check` and link checks. No production environment was created.
**Learning:** Deferring deployment is a recorded decision, not an implicit omission; the record must state what is not claimed and what must happen before FND-006 can close.
**Limitations:** FND-006 remains Deferred. No hosted URL, monitoring, production recovery or load evidence exists.

**Links:** issue #202 · [`production deployment policy`](../operations/production-deployment.md) · [`decision record`](remediation/2026-11-202-production-deployment-deferral.md) · [`findings register`](findings-register.md)

---

## Entry 69 — Legacy finding verification (FND-001/003/005)

**Date:** 2026-11-10
**Tool:** opencode CLI (`deepseek-v4.1-flash`)
**Intent:** Verify the remaining Fixed findings without code changes.
**Boundary:** Targeted test runs, verification record, findings register and this entry.
**Prior records reviewed:** FND-001/003/005; authorization, idempotency, capacity and uniqueness records.
**Work performed:** re-ran the authorization + v3 tenancy suites (20 pass), the idempotency suite (6 pass) and the capacity + uniqueness suites (3 pass); recorded the observed results and marked the findings Verified.
**Verification:** `bun test --env-file=.env.local` on the named files; capacity burst p95 755.77 ms. Details: [`verification/2026-11-197-legacy-findings-verification.md`](verification/2026-11-197-legacy-findings-verification.md).
**Learning:** The existing fixes were already covered by tests; the gap was the final verification record, not missing code.
**Limitations:** Local/CI evidence only; no hosted production evidence.

**Links:** issue #197 · [`verification`](verification/2026-11-197-legacy-findings-verification.md) · [`findings register`](findings-register.md)

---

## Entry 70 — Course submission brief rewrite (issue #217)

**Date:** 2026-11-10
**Tool:** opencode CLI (`deepseek-v4.1-flash`)
**Intent:** Make the CM0639 submission documents match the course deliverables and timeboxes, with detail moved to linked records.
**Boundary:** Course-facing documentation, checklist pages, submission index and PDF export script. No product, schema, authorization or runtime change. Issues #217 (parent), #218 (Development Methodologies), #219 (verification), #220 (Software Architectures). Branch `docs/217-course-submission-brief`.
**Prior records reviewed:** findings register (no open documentation-length finding); SA L04/L07 and DM L04/L08/L12 transcripts/slides; `Project_Handbook.md`; old architecture reports and checkpoint folders; invariant, delivery and fault-injection verification records; full AI log.
**Work performed:** replaced the kata with a one-page broad R1–R8 brief and a 108-word one-minute pitch, plus a separate detailed requirement register; cut the characteristics document to selection, traceability and quantified targets; cut the architecture description to a three-minute walkthrough with code references; cut checkpoints A–E to one page each; replaced the long methodology report with a one-page Markdown index; kept a one-page AI-use summary; updated the PDF exporter to produce 1+2+3+5 pages.
**Verification:** link check 0 broken across the rewritten files; `bun run docs:pdf` produced kata 1 page, characteristics 2, architecture 3, methodology checkpoints 5; `bun run lint`, `bunx next typegen && bun run typecheck`, `bun run check:architecture` and `git diff --check` passed. No build, database, E2E or fault-injection run was performed because only documentation and the export script changed.
**Learning:** The course artifacts are summaries with a timebox, not evidence dumps. The kata is a one-page problem brief; broad R requirements keep it explainable, while the detailed register preserves traceability. The checkpoints become usable when each is one page and three minutes.
**Limitations:** No independent review; the course D/E materials are not available, so those pages answer the stated focus rather than a known rubric. At the time of this entry, the branch had no commit, push or pull request.

**Links:** issue #217 · sub-issues [#218](https://github.com/match-pulse/match-pulse/issues/218), [#219](https://github.com/match-pulse/match-pulse/issues/219), [#220](https://github.com/match-pulse/match-pulse/issues/220) · [`course package`](../course/README.md) · [`submissions`](../submissions/README.md) · [`verification`](verification/2026-11-10-217-course-submission-brief.md)

---

## Entry 71 — Subscription expiry (FND-027 / #201)

**Date:** 2026-11-10
**Tool:** opencode CLI (`deepseek-v4.1-flash`)
**Intent:** Enforce `current_period_end` with a 7-day grace and a daily expiry job.
**Boundary:** One migration replacing entitlement helpers and event/invite locks, adding `expire_subscriptions()` and `pg_cron`; admin period-end display; tests and verification record.
**Prior records reviewed:** FND-027; AUD-019; subscription RPCs; plan-entitlement tests.
**Work performed:** at period end the subscription moves to `PAST_DUE`; `has_entitlement`/`entitlement_limit` allow a 7-day grace; `expire_subscriptions()` writes an audit event; `pg_cron` schedules the daily job; the admin club list shows the period end.
**Verification:** targeted test 1 pass; database 58 pass; CLI 2 pass; `pg_cron` and job row verified directly. Details: [`verification/2026-11-201-subscription-expiry.md`](verification/2026-11-201-subscription-expiry.md).
**Learning:** The lock must cover a `PAST_DUE` row during grace; filtering the lock to `ACTIVE` would lose the serialisation that protects member/event limits.
**Limitations:** Hosted Supabase must enable `pg_cron` at production deployment; local/CI evidence only.

**Links:** issue #201 · [`verification`](verification/2026-11-201-subscription-expiry.md) · [`findings register`](findings-register.md) · [`audit`](audits/2026-11-10-171-v3-audit.md)

---

## Entry 72 — Ticket-point caps (FND-026 / #200)

**Date:** 2026-11-10
**Tool:** opencode CLI (`deepseek-v4.1-flash`)
**Intent:** Bound club-issued ticket points at 500 per ticket and 10,000 per event.
**Boundary:** One migration with CHECK constraints and replaced create/update event RPCs, boundary tests, docs and verification record.
**Prior records reviewed:** FND-026; AUD-018; event create/update RPCs; ticket-point issuance.
**Work performed:** added per-ticket and per-event CHECK constraints (legacy club-less tournaments exempt), added explicit RPC checks with clear errors, and added boundary tests for 501/ticket and 10,500/event.
**Verification:** targeted test 1 pass; database 58 pass; CLI 2 pass; typecheck/lint/architecture/secrets pass. Details: [`verification/2026-11-200-ticket-points-cap.md`](verification/2026-11-200-ticket-points-cap.md).
**Learning:** The cap belongs in both the RPC and a table constraint; the RPC gives a usable error, the constraint protects every write path. Legacy tournaments need an explicit exemption.
**Limitations:** Local/CI evidence only; production deployment is the final post-MVP step.

**Links:** issue #200 · [`verification`](verification/2026-11-200-ticket-points-cap.md) · [`findings register`](findings-register.md) · [`audit`](audits/2026-11-10-171-v3-audit.md)

---

## Entry 73 — v3 Server Action refactor assessment (issue #222)

**Date:** 2026-11-11
**Tool:** opencode CLI (`deepseek-v4.1-flash`)
**Intent:** Run the refactoring workflow for a bounded structural assessment of `src/app/actions/v3.ts`.
**Boundary:** Read-only assessment, issue #222 creation, refactor assessment, execution plan, findings register and this log. No application code, branch, commit, push, PR, migration, dependency or deployment change.
**Prior records reviewed:** findings register FND-001–FND-028; refactor, audit and incident indexes; v3.0.0 audit; ADRs 001/003/007/010; system overview, code map, architecture characteristics and ownership; OpenSpec and development practices; no open issues or pull requests.
**Work performed:** created issue #222; inspected the action module and its seven import sites; mapped 21 actions to five domain modules; identified the zero-caller `recordExportAction` and the `requiredNumber` missing-value coercion; recorded REF-001–REF-004 as FND-029–FND-032; wrote the assessment and proposed execution plan.
**Verification:** `bun run lint`, `bun run typecheck`, `bun run build` and `bun run check:architecture` all passed at baseline `5b053ba`. DB-backed tests and E2E were not run: `bunx supabase status` failed with a Docker API permission error.
**Learning:** The file is a thin, low-risk adapter; the structural issue is file-level domain cohesion, not per-action size. `recordExportAction` is dead, and `requiredNumber` has a real validation gap that must not be fixed silently inside a behavior-neutral refactor. Splitting Server Actions changes generated action IDs, so the deployment note matters even though there is no production deployment.
**Limitations:** No database-backed or browser evidence; no independent verifier yet; implementation has not started. The plan is Proposed and awaits decisions D1–D5.

**Links:** issue [#222](https://github.com/match-pulse/match-pulse/issues/222) · [assessment](refactors/2026-11-11-222-v3-server-actions.md) · [plan](exec-plans/222-v3-server-action-modularity.md) · [findings register](findings-register.md)

---

## Entry 74 — v3 Server Action refactor implementation (issue #222)

**Date:** 2026-11-11
**Tool:** opencode CLI (`deepseek-v4.1-flash`)
**Intent:** Implement the approved domain-aligned split of `src/app/actions/v3.ts` without changing observable behavior.
**Boundary:** `src/app/actions/` modules, seven import sites, code map, assessment/plan, findings register and this log. No schema, RLS, RPC, UI, dependency, commit, push, PR or deployment change.
**Prior records reviewed:** assessment RA-2026-11-11-222; plan D1–D5; FND-029–FND-032; baseline checks on `5b053ba`; `bunx supabase status` failure evidence.
**Work performed:** extracted shared helpers to `form.ts`; created `clubs.ts`, `events.ts`, `analytics.ts` and `admin.ts`; extended `tickets.ts`; moved 20 actions verbatim; deleted `v3.ts` and the unused `recordExportAction`; updated seven import sites and the code map.
**Verification:** `bun run lint`, `bun run typecheck`, `bun run build`, `bun run check:architecture` and `git diff --check` pass. An independent read-only verifier compared old/new function bodies: 29 retained bodies are byte-identical; `recordExportAction` is the only deletion; no code defect or scope creep. Its documentation notes were corrected and a follow-up pass returned `PASS`. Details: [`verification/2026-11-11-222-v3-server-actions.md`](verification/2026-11-11-222-v3-server-actions.md).
**Learning:** A move-only script plus exact body comparison is stronger evidence than a visual diff for this kind of refactor. The verifier found documentation drift that the implementer missed: a table broken by an inserted paragraph, a stale action count, and missing implementation evidence. Those were corrected before the record was finalized.
**Limitations:** DB-backed tests and E2E were not run because Docker/Supabase is unavailable; runtime form submission, Server Action ID resolution and revalidation remain unverified. No commit, push or PR exists, so there is no CI evidence. FND-032 remains open and is routed to separate issue #223.

**Links:** issue [#222](https://github.com/match-pulse/match-pulse/issues/222) · [plan](exec-plans/222-v3-server-action-modularity.md) · [assessment](refactors/2026-11-11-222-v3-server-actions.md) · [verification](verification/2026-11-11-222-v3-server-actions.md) · [findings register](findings-register.md)

---

## Entry 75 — v3 Server Action refactor PR and CI evidence (issue #222)

**Date:** 2026-11-11
**Tool:** opencode CLI (`deepseek-v4.1-flash`)
**Intent:** Commit, push and open the approved refactor PR, then record the CI evidence.
**Boundary:** Three commits on `refactor/222-v3-server-actions`, push, PR #224 and documentation updates. No merge, deployment, schema, RLS, RPC or dependency change.
**Prior records reviewed:** plan D1–D5; assessment; verification record; FND-029–FND-032; CI workflow definition; open PR list.
**Work performed:** created three reviewable commits (helper extraction, domain split, records), pushed the branch, opened PR #224 with the required issue/scope/checks/risk/AI/changelog sections, moved issue #222 and PR #224 to Review Queue, and recorded the CI run.
**Verification:** GitHub Actions run [42985722829](https://github.com/match-pulse/match-pulse/actions/runs/42985722829) passed all five jobs: Lint/typecheck/build (25s), Delivery and recovery (2m41s), Domain invariants (3m3s), E2E and accessibility (3m15s), Fault injection (19m21s). This closes the local DB/E2E gap. Details: [`verification/2026-11-11-222-v3-server-actions.md`](verification/2026-11-11-222-v3-server-actions.md).
**Learning:** The PR body and verification record must distinguish local checks from CI checks; local Docker was unavailable, but CI supplied the database and browser environment. The board should show the issue and PR in Review Queue, not Build.
**Limitations:** No human review or merge yet. CI is evidence, not approval. The independent verifier is an AI subagent, not a human (FND-008 still applies).

**Links:** issue [#222](https://github.com/match-pulse/match-pulse/issues/222) · PR [#224](https://github.com/match-pulse/match-pulse/pull/224) · [CI run](https://github.com/match-pulse/match-pulse/actions/runs/42985722829) · [verification](verification/2026-11-11-222-v3-server-actions.md) · [findings register](findings-register.md)

---

## Entry 76 — Product-first README (issue #225)

**Date:** 2026-11-11
**Tool:** opencode CLI (`deepseek-v4.1-flash`)
**Intent:** Make the README a short, ordered product front page and make the business model unambiguous.
**Boundary:** `README.md`, new `docs/development.md` and this entry. No product, schema, authorization, runtime or dependency change. No OpenSpec change: this is a documentation-only task with no behavior delta.
**Prior records reviewed:** current README; course package README; `docs/operations/runbook.md`; `docs/testing/README.md`; `openspec/README.md`; findings register (no README-structure finding); human clarification of the points/credit model.
**Work performed:** reduced the README from 126 to 53 lines; removed the feature matrix, claim block, test catalogue, gaps list and developer detail; stated that clubs pay the subscription, fans need an account, registration is per named person, points are a per-person non-transferable credit system, points redeem for club rewards and never cash, and MatchPulse is not a ticket shop or rewards shop; moved setup, demo accounts, CLI, Docker and tests to `docs/development.md`.
**Verification:** relative links in `README.md` and `docs/development.md` resolve; `git diff --check` passes. No code or database checks were run because only documentation changed.
**Learning:** The README should explain the product and the money boundary, not enumerate capabilities or operational detail. The business model is clearer when “what it is not” is explicit.
**Limitations:** No commit, push or PR existed at the time of this entry. The OpenSpec policy remains unchanged: OpenSpec is used for bounded behavior/spec/evidence changes, not docs-only tasks.

**Links:** issue [#225](https://github.com/match-pulse/match-pulse/issues/225) · [README](../../README.md) · [development](../development.md)

---

## Standing rule

AI may investigate, analyse, draft, implement within an approved scope, and run verification. The human retains every decision that affects business rules, architecture, schema, scope, priority, risk acceptance and merging. Contributions that cannot be verified are recorded as unverified rather than asserted.

Merges in this cycle were performed by AI on the human owner's explicit instructions, each gated on a green CI run and individually reported. Branch protection is enabled on `main` and was re-read after the move to the organization (Entry 14): it requires both CI jobs and linear history, and forbids force-push and deletion, with administrator bypass allowed on the owner's decision. No commit in this cycle was self-approved by AI; the human owner authorized the merges.
