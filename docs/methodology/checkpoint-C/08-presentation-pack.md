# Checkpoint C — Presentation Pack

- **Date:** 2026-11-07
- **Status:** Presentation aid for the Checkpoint C discussion. It is not new test evidence and does not accept residual risk.
- **Read first:** [`07-current-state.md`](./07-current-state.md) for the post-v1.1.0 risk ranking. The original [`README.md`](./README.md) remains the historical package.
- **Purpose:** One place for the 3-minute script, the one-page handout, the Q&A bank, the demo path and the honest fallbacks.

## 1. One-page handout

### Project in one line

MatchPulse is a football tournament platform; the first increment enforces registration capacity, and the second is a live prediction market with points and organizer resolution.

### The four C questions

| Question | Short answer | Evidence | Limit |
| :--- | :--- | :--- | :--- |
| **Which risk matters most, and why?** | Authorization was the top risk; it is now mitigated. The top **remaining** risk is idempotency: a retry after cooldown can create a new entry. | Authorization suite, 6 tests; FND-003 for idempotency. | Local Supabase; no production session/rate-limit hardening. |
| **What behaviour did you test, and what happened?** | M-INV4: two concurrent 50-point entries against 60 points cannot both commit; one is accepted, one refused; balance never negative. | `market-concurrency.test.ts`; fault injection A drove the balance to −40 and turned the test red. | One local DB, no retry, no multi-instance, no load. |
| **What did review change or keep?** | Review corrected the `close_trade` lock order and added the missing exit-during-cooldown evidence while keeping the implementation. | `03-review-decision.md`; AI log Entries 11 and 15. | No independent human review (FND-008). |
| **What remains uncertain, and what next?** | Idempotency, unverified market injections, load/p95, delivery/operations, real-user evidence, independent review. | `07-current-state.md`; findings register. | No residual risk is accepted by AI. |

### Evidence links

- [Risk control map](./01-risk-control-map.md)
- [Quality story](./02-quality-story.md)
- [Review decisions](./03-review-decision.md)
- [Test-case process](./04-test-case-process.md)
- [Residual risk](./05-residual-risk.md)
- [Current state](./07-current-state.md)
- [Authorization verification](../verification/2026-11-95-authorization-rls.md)
- [Release v1.1.0](https://github.com/match-pulse/match-pulse/releases/tag/v1.1.0)
- [CI run 42410413126](https://github.com/match-pulse/match-pulse/actions/runs/42410413126) — 21 tests pass

## 2. Three-minute script

> “This is MatchPulse. The primary user is a tournament organizer; the first increment was registration capacity, and the second was a live prediction market. The latest release, v1.1.0, added authentication and database-enforced authorization.
>
> The risk that mattered most was authorization: anyone with the anon key could act as any participant and resolve markets. That is now mitigated by Supabase Auth, roles, RLS, least-privilege grants and `auth.uid()` checks. The authorization suite passes in CI: anonymous private reads and mutations are denied, fans see only their own rows, only an organizer can resolve, and direct table writes are denied.
>
> The top remaining risk is idempotency. A retry after the cooldown expires is still accepted as a new entry; the cooldown is a churn control, not a request key. The next control is a client request ID and a unique constraint.
>
> The invariant story is double-spend prevention: two concurrent 50-point entries against a 60-point balance cannot both commit. The test asserts committed state. The fault injection that removed the profile lock and both balance guards drove the balance to minus 40 and turned the test red. That injection was on the pre-auth function. The suite passes after auth, but I have not re-run the injection on the new `SECURITY DEFINER` version.
>
> Review changed a lock-order defect and added the missing exit-during-cooldown evidence. It is not an independent human review; that is recorded as an open finding.
>
> The remaining risks are idempotency, the unverified market injections, load and p95, delivery and operations, one real organizer observation, and independent review. No residual risk is accepted without the owner's decision.”

## 3. Thirty-second version

> “MatchPulse is a tournament and live-market platform. Authorization was the top risk; it is now controlled by Supabase Auth, RLS, grants and `auth.uid()` checks, with six tests passing in CI. The top remaining risk is idempotency: a retry after cooldown can create a new entry. The invariant story is double-spend prevention, proven by a test observed failing under fault injection. The limits are local evidence, a pre-auth injection, and no independent human review.”

## 4. Q&A bank

### 4.1 Which risk matters most, and why?

**Answer:** Authorization was the top risk because anyone with the anon key could act as any participant and resolve markets. It is now mitigated by Supabase Auth, `profiles.role`, RLS, least-privilege grants and `auth.uid()` checks. The top **remaining** risk is idempotency: a retry after cooldown is accepted as a new entry; the cooldown is not a request key.

**Limit:** The authorization evidence is local Supabase; production session and rate-limit hardening are not claimed.

### 4.2 What behaviour did you test, and what happened?

**Answer:** M-INV4: given one profile with 60 points and two markets, two concurrent 50-point entries cannot both commit. Exactly one is accepted, the other is refused for insufficient points, the balance never becomes negative, and one trade and one position exist. The test asserts committed state. Under fault injection A, with the profile lock and both balance guards removed, both entries were accepted, the balance reached −40, and the test failed with `Expected: 1 Received: 2`.

**Limit:** One machine, one database, two markets, no retry, no multi-instance, no load. The injection predates the auth version; it was not re-run on the `SECURITY DEFINER` version.

### 4.3 What did review change, or what did it deliberately keep?

**Answer:** Review corrected the `close_trade` lock order to `market → profile → cooldown → position` before commit; the domain rule was kept. It also added the missing exit-during-cooldown evidence while keeping `close_trade` unchanged.

**Limit:** This is structured self-review plus agent role passes, not an independent human review (FND-008).

### 4.4 What remains uncertain, and what next?

**Answer:** Idempotency (FND-003), unverified market injections (FND-002), load/p95 (FND-004), delivery and operations (FND-006), real-user evidence (FND-007), and independent review (FND-008). The next technical control is request IDs for retry safety.

### 4.5 Why is RLS not enough without grants?

**Answer:** RLS decides which rows an identity may see or change, but the role still needs table privileges to reach the table at all. If direct write grants remain, a caller can write the table the function is meant to protect. MatchPulse revokes direct writes, grants only the read surfaces, and puts mutations behind authorized RPCs.

### 4.6 Why `SECURITY DEFINER`, and what new risk does it create?

**Answer:** The mutation RPCs need to write protected tables, while direct table writes are revoked. `SECURITY DEFINER` lets the function run with the owner's privileges. The new risk is that every function becomes a high-trust boundary, so each one must check `auth.uid()`, check the organizer role where required, validate input, fix `search_path` and be granted only to authenticated users.

### 4.7 What does the double-spend test not prove?

**Answer:** It does not prove multi-instance behaviour, network retry, idempotency, sustained load, p95 latency, or production permissions. It proves the committed-state rule for one local database under the constructed race.

### 4.8 What is your non-test control?

**Answer:** Several: database CHECK constraints and transactions, RLS/grants, CI, branch protection, and review. The risk map marks which controls are tests and which are non-test controls.

### 4.9 QA, QC, testing, verification and validation in your project?

**Answer:** Quality assurance is the process: risk map, test-case process, review, CI, evidence records. Quality control is the artifact evaluation: tests, lint, typecheck, review decisions. Testing is the selected behaviour checks. Verification asks whether the software matches the specification (RPC contracts and tests); validation asks whether it meets the user's need (not yet established; the problem/outcome claims are hypotheses).

### 4.10 How do you create test cases, and what does AI do?

**Answer:** Start from a risk, state a behaviour claim and oracle, choose the smallest sufficient boundary, select equivalence classes, boundaries, state and concurrency cases, write an assertion with a failure message, prove it can fail by injection, review the oracle and limits, and record the evidence. AI may draft cases and data; a human selects the oracle, verifies the check and accepts residual risk.

### 4.11 What AI output did you reject or correct?

**Answer:** AI's first `close_trade` lock order was corrected; AI proposals that conflicted with the owner's rules (whole-function exception swallowing, commission/order-book/parimutuel alternatives) were rejected. The AI log records what was corrected, rejected or learned.

### 4.12 Is the system secure or production-ready?

**Answer:** The database is an authorization boundary for the local platform: anonymous private access and mutations are denied, fans see only their own rows, and only organizers resolve. It is not production-ready: no production session hardening, rate-limit tuning, deployment, observability or recovery evidence.

### 4.13 Is the problem real?

**Answer:** The organizer problem is still a hypothesis. No organizer has been interviewed and no incident has been recorded. That is FND-007; the next action is one real observation. The behaviour and quality evidence is real; the problem/outcome claim is not yet validated.

### 4.14 What would you do with one more week?

**Answer:** Add idempotency keys and retry tests; re-run the M-INV4 injection on the auth version; add the missing market injections; get one peer review. Those close the most important quality gaps without adding features.

### 4.15 Why not move to Checkpoint D yet?

**Answer:** C is the quality and residual-risk gate; presenting it first gives feedback on the risk ranking and evidence story. The L13–L16 materials are not yet in the course folder, so D preparation would be based on inference.

## 5. Demo path (if live)

1. Open `/login`; choose **Continue as fan**.
2. Show the 200-point profile, the seeded market and the tournament registration link.
3. Show one entry/exit; explain that the UI is not the boundary.
4. Show the CI run and the six authorization tests.
5. Show the risk map, the current-state record and the `v1.1.0` release.
6. Optional: show `resolve_market` test success for an organizer and refusal for a fan.

If the session is not live, use the evidence links and the recorded CI output.

## 6. Re-injection fallback

**If local Docker/Supabase is available:**

1. `bunx supabase start`
2. `bunx supabase db reset`
3. `bun test --env-file=.env.local tests/invariants/market-concurrency.test.ts` — baseline green.
4. Reapply the recorded injection A (remove the profile row lock and the two balance guards from `open_trade`; also remove the `points_after >= 0` trade check so the negative balance persists).
5. Re-run the test — observe red and the −40 balance.
6. Restore the function from the migration; re-run green.
7. Add a dated addendum to [`02-quality-story.md`](./02-quality-story.md) with the observed output.

**If Docker is not available:** do not claim a re-run. Say: “The suite passes after auth, but the strongest injection evidence is still the pre-auth function; the profile-lock logic was preserved.”

## 7. Peer-review request template

Ask one classmate or developer to review one small PR (for example #96) against:

- scope and linked issue;
- RLS/grants and direct-write denial;
- `SECURITY DEFINER` checks and `search_path`;
- organizer-only resolution;
- test oracle and limits;
- documentation and migration notes.

Record the review decision as **approve**, **revise**, **narrow** or **seek context**, with the scope examined and one remaining limit. That closes FND-008.

## 8. What not to claim

- Not production-ready.
- Not a complete organizer UI.
- No idempotency or retry safety.
- No load/p95 or operational recovery evidence.
- No independent human review.
- No re-run of the M-INV4 injection on the auth version.
- No validated user value or outcome claim.

## 9. Rehearsal checklist

- [ ] 3 minutes without reading every word.
- [ ] State the top risk and its control.
- [ ] State one behaviour, expected, observed and limit.
- [ ] State what review changed or kept.
- [ ] State the top remaining risk and next action.
- [ ] State one thing not proven.
- [ ] Answer “why not 10/10 yet?” honestly.

## 10. After C

Collect the professor's feedback, record any correction or decision, then start Checkpoint D. Do not change the risk ranking or evidence claims without a dated record.
