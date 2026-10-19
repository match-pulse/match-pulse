# Checkpoint B — Flow Evidence from the Repository History

Measured 2026-10-19, all timestamps UTC, read from the GitHub API (issues, pull requests, workflow runs).
Scope: the two delivery cycles recorded so far — cycle 1, registration and Checkpoint A (issues #50–#55), and cycle 2, the live prediction market (issues #63–#68). The repository's own history is the source; nothing here is estimated unless labelled as such.

## 1. Method

For each slice: issue `created_at`, pull request `created_at` and `merged_at`, and the first successful `push` workflow run on `main` after the merge (recorded conclusion). Implementation time, queue time and merge authorization are not separable from timestamps alone and are reported together as observed.

## 2. Cycle 1 — registration (morning)

| Slice | Issue → PR | PR → merge | Merge → green on `main` | Issue → merge |
| :--- | ---: | ---: | ---: | ---: |
| #50 → #56 | 3m06s | 39s | 25s | 3m45s |
| #52 → #57 | 7m42s | 42s | 27s | 8m24s |
| #51 → #58 | 9m55s | 44s | 29s | 10m39s |
| #53 → #59 | 21m47s | 44s | 26s | 22m31s |
| #54 → #60 | 30m34s | 2m48s | 2m10s | 33m22s |
| #55 → #61 | 42m39s | 2m51s | 2m35s | 45m30s |
| wrap-up #62 (no issue) | — | 2m49s | 2m13s | — |

The six issues were created in a 32-second burst (08:41:18–08:41:50) and executed strictly one at a time: every PR was opened after the previous merge. Before #60 the pull-request check ran lint and build only (~25–40 s); #60 added the invariant job, after which the check takes ~2m10s–2m35s.

## 3. Cycle 2 — live market (afternoon)

| Slice | Issue → PR | PR → merge | Merge → green on `main` | Issue → merge |
| :--- | ---: | ---: | ---: | ---: |
| #63 → #69 | 5m49s | 32m12s | 6m14s | 38m01s |
| #64 → #70 | 59m16s | 3m32s | 2m22s | 62m48s |
| #65 → #71 | 72m26s | 3m15s | 2m29s | 75m41s |
| #66 → #72 | 81m20s | 3m15s | 2m15s | 84m35s |
| #67 → #73 | 102m28s | 2m54s | 2m39s | 105m22s |
| #68 → #74 | 108m38s | 3m00s | 2m15s | 111m38s |

The six issues were again created in a burst (16:01:06–16:02:24, 78 s) and executed sequentially; every PR was opened only after the previous merge.

#69 is the only large wait: its jobs ran for 2m30s (16:07:00–16:09:31), yet the run's conclusion was recorded at 16:30:24 — 23m26s after the PR opened — and the merge followed 8m43s later. The 21-minute gap between job completion and recorded conclusion cannot be explained from the available data; it is recorded as an observed platform lag, not attributed to the code.

## 4. Where work waits

- **Pull-request feedback:** 2m54s–3m32s in cycle-2 steady state (job execution ~2.5 min for the invariant job; lint and build ~30 s).
- **Merge to re-verification on `main`:** 2m15s–2m39s for the five steady cycle-2 merges (plus one 6m14s outlier), so merged code is re-checked within about three minutes.
- **Merge authorization:** every merge was a human decision. Observed gaps between a recorded green check and the merge, or between one merge and the next PR opening, range from about 3 to 21 minutes. With one person this variable dominates the tail.
- **Platform:** one anomalous 21-minute stall (#69), not explained by job durations.

## 5. Little's Law observation

Work in progress never exceeded one implementation PR (verified: every PR was opened after the previous one merged). With WIP ≈ 1, throughput is bounded by implementation plus authorization time, not by parallelism: five PRs merged in the 50 minutes from 17:04 to 17:54 (≈10 minutes per PR sustained), while the full cycle took 108 minutes (16:06–17:54) for six PRs, dominated by the #69 stall and the largest slice. Because each cycle's issues were created as a batch, the backlog was deliberately larger than WIP; the queue sat in the backlog, not in progress.

## 6. Decisions changed by evidence

| Finding | Decision (dated merge) |
| :--- | :--- |
| CI ran lint and build only; a green check could not detect a broken rule (this checkpoint's own finding) | Invariant execution added to CI — issues #54, PR #60 merged 09:15 |
| Documentation asserted claims without evidence (invariant statuses, AI-naming, stock/flow) | Claims corrected — issue #52, PR #57 merged 08:49 |
| Docker, Compose and README reproducibility gaps | Fixed — issue #55, PR #61 merged 09:27 |
| Consistency-audit contradictions (stale statuses, mislabeled comments, nullable counter) | Remediated — issue #63, PR #69 merged 16:39 |

Each row has a dated issue and merge; this is a record, not a retrospective claim. The market pivot itself was an owner product decision (ADR-002), not evidence-driven, and is not listed.

## 7. Limits

- One repository, one developer, one AI assistant. There is no second reviewer, so review time and authorization time cannot be separated from the timestamps.
- Timestamps are GitHub's; recorded run conclusions can lag actual job completion (observed in §3).
- The measurement covers two cycles of one project — a record of what happened, not a stable process baseline.
