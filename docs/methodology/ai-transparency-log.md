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

## Standing rule

AI may investigate, analyse, draft, implement within an approved scope, and run verification. The human retains every decision that affects business rules, architecture, schema, scope, priority, risk acceptance and merging. Contributions that cannot be verified are recorded as unverified rather than asserted.

Merges in this cycle were performed by AI on the human owner's explicit instructions, each gated on a green CI run and individually reported. Branch protection is enabled on `main` and was re-read after the move to the organization (Entry 14): it requires both CI jobs and linear history, and forbids force-push and deletion, with administrator bypass allowed on the owner's decision. No commit in this cycle was self-approved by AI; the human owner authorized the merges.
