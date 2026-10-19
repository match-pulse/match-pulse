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

## Standing rule

AI may investigate, analyse, draft, implement within an approved scope, and run verification. The human retains every decision that affects business rules, architecture, schema, scope, priority, risk acceptance and merging. Contributions that cannot be verified are recorded as unverified rather than asserted.