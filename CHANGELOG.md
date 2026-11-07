# Changelog

All notable changes to MatchPulse, recorded as append-only tables. The linked issue, ADR, and PR remain the authoritative statement of their claims; this file summarizes and never redefines them.

## Rules

- One row per merged pull request going forward. Add the row in the same pull request as the change.
- Date is the merge date, ISO 8601. The Unreleased row uses the PR date. Historical rows before 2026-11-07 use the commit date.
- Type: Added, Changed, Fixed, Removed, Security, Docs, Test, Chore, Architecture.
- Summary is the PR title without its conventional prefix. Historical summaries are the original commit subjects.
- Issue and PR columns link to the authoritative record; use "—" when none exists. Do not invent numbers.
- Evidence links to the commit, verification record, or AI transparency entry.
- Never rewrite or delete a historical row. Corrections are new rows or dated notes.
- Claims remain owned by the linked issue, ADR, or PR. This file does not restate or redefine them.

## Unreleased

| Date | Type | Summary | Issue | PR | Evidence |
|---|---|---|---|---|---|
| 2026-11-07 | Docs | establish workflow documentation, historical recordkeeping and changelog | [#91](https://github.com/match-pulse/match-pulse/issues/91) | [#92](https://github.com/match-pulse/match-pulse/pull/92) | CI + AI log Entry 17 |
| 2026-11-07 | Docs | specify the SDLC, development practices and Checkpoint C evidence | [#93](https://github.com/match-pulse/match-pulse/issues/93) | [#94](https://github.com/match-pulse/match-pulse/pull/94) | AI log Entry 18 |
| 2026-11-07 | Security | enforce authentication, authorization and RLS | [#95](https://github.com/match-pulse/match-pulse/issues/95) | [#96](https://github.com/match-pulse/match-pulse/pull/96) | CI 42397891717 + AI log Entry 19 |

## Historical record

Rows below are reconstructed from the Git and pull-request history. They link to their commit and are not a contemporaneous record.

## 2026-10-19

| Date | Type | Summary | Issue | PR | Evidence |
|---|---|---|---|---|---|
| 2026-10-19 | Docs | correct AI transparency log and complete Entry 4 | — | [#89](https://github.com/match-pulse/match-pulse/pull/89) | [5fadb6c](https://github.com/match-pulse/match-pulse/commit/5fadb6c) |
| 2026-10-19 | Test | cover exits during an active entry cooldown | [#85](https://github.com/match-pulse/match-pulse/issues/85) | [#88](https://github.com/match-pulse/match-pulse/pull/88) | [f302e70](https://github.com/match-pulse/match-pulse/commit/f302e70) |
| 2026-10-19 | Fixed | make the Docker environment reachable and reproducible | [#84](https://github.com/match-pulse/match-pulse/issues/84) | [#87](https://github.com/match-pulse/match-pulse/pull/87) | [de08c79](https://github.com/match-pulse/match-pulse/commit/de08c79) |
| 2026-10-19 | Docs | split overview and domain model and add C4 views | [#83](https://github.com/match-pulse/match-pulse/issues/83) | [#86](https://github.com/match-pulse/match-pulse/pull/86) | [ff3c26e](https://github.com/match-pulse/match-pulse/commit/ff3c26e) |
| 2026-10-19 | Chore | add claim-type issue forms and document the CLI flow | — | [#82](https://github.com/match-pulse/match-pulse/pull/82) | [10a9b9d](https://github.com/match-pulse/match-pulse/commit/10a9b9d) |
| 2026-10-19 | Architecture | resolve the architecture characteristics decisions | — | [#81](https://github.com/match-pulse/match-pulse/pull/81) | [c76de02](https://github.com/match-pulse/match-pulse/commit/c76de02) |
| 2026-10-19 | Docs | record checkpoint B flow evidence and correct stale references | — | [#80](https://github.com/match-pulse/match-pulse/pull/80) | [ffcea29](https://github.com/match-pulse/match-pulse/commit/ffcea29) |
| 2026-10-19 | Docs | add architecture code map and complete kata sections | — | [#79](https://github.com/match-pulse/match-pulse/pull/79) | [9278673](https://github.com/match-pulse/match-pulse/commit/9278673) |
| 2026-10-19 | Docs | record market delivery, evidence and honest gaps | [#68](https://github.com/match-pulse/match-pulse/issues/68) | [#74](https://github.com/match-pulse/match-pulse/pull/74) | [ebec7a8](https://github.com/match-pulse/match-pulse/commit/ebec7a8) |
| 2026-10-19 | Added | add the market UI and retire fixed-score predictions | [#67](https://github.com/match-pulse/match-pulse/issues/67) | [#73](https://github.com/match-pulse/match-pulse/pull/73) | [44279a3](https://github.com/match-pulse/match-pulse/commit/44279a3) |
| 2026-10-19 | Added | resolve markets once and enforce the cooldown window | [#66](https://github.com/match-pulse/match-pulse/issues/66) | [#72](https://github.com/match-pulse/match-pulse/pull/72) | [3344dfd](https://github.com/match-pulse/match-pulse/commit/3344dfd) |
| 2026-10-19 | Added | add the LMSR market engine and pricing suite | [#65](https://github.com/match-pulse/match-pulse/issues/65) | [#71](https://github.com/match-pulse/match-pulse/pull/71) | [1c8336a](https://github.com/match-pulse/match-pulse/commit/1c8336a) |
| 2026-10-19 | Docs | pivot architecture to the live prediction market | [#64](https://github.com/match-pulse/match-pulse/issues/64) | [#70](https://github.com/match-pulse/match-pulse/pull/70) | [f959e44](https://github.com/match-pulse/match-pulse/commit/f959e44) |
| 2026-10-19 | Fixed | close the consistency-audit remediation findings | [#63](https://github.com/match-pulse/match-pulse/issues/63) | [#69](https://github.com/match-pulse/match-pulse/pull/69) | [ca0f33f](https://github.com/match-pulse/match-pulse/commit/ca0f33f) |
| 2026-10-19 | Docs | record execution outcome, deviations and remaining open items | — | [#62](https://github.com/match-pulse/match-pulse/pull/62) | [ac9634a](https://github.com/match-pulse/match-pulse/commit/ac9634a) |
| 2026-10-19 | Chore | fix Docker, Compose and README reproducibility gaps | [#55](https://github.com/match-pulse/match-pulse/issues/55) | [#61](https://github.com/match-pulse/match-pulse/pull/61) | [a5f4fe1](https://github.com/match-pulse/match-pulse/commit/a5f4fe1) |
| 2026-10-19 | Test | make invariant tests enforceable and run them in CI | [#54](https://github.com/match-pulse/match-pulse/issues/54) | [#60](https://github.com/match-pulse/match-pulse/pull/60) | [6526195](https://github.com/match-pulse/match-pulse/commit/6526195) |
| 2026-10-19 | Added | add the end-to-end registration path | [#53](https://github.com/match-pulse/match-pulse/issues/53) | [#59](https://github.com/match-pulse/match-pulse/pull/59) | [62a0145](https://github.com/match-pulse/match-pulse/commit/62a0145) |
| 2026-10-19 | Added | enforce capacity and uniqueness in the schema | [#51](https://github.com/match-pulse/match-pulse/issues/51) | [#58](https://github.com/match-pulse/match-pulse/pull/58) | [dd1c7df](https://github.com/match-pulse/match-pulse/commit/dd1c7df) |
| 2026-10-19 | Docs | correct methodology claims and record real AI disclosure | [#52](https://github.com/match-pulse/match-pulse/issues/52) | [#57](https://github.com/match-pulse/match-pulse/pull/57) | [5e45e40](https://github.com/match-pulse/match-pulse/commit/5e45e40) |
| 2026-10-19 | Docs | align kata with capacity and add measurable architecture targets | [#50](https://github.com/match-pulse/match-pulse/issues/50) | [#56](https://github.com/match-pulse/match-pulse/pull/56) | [67ff6f1](https://github.com/match-pulse/match-pulse/commit/67ff6f1) |
| 2026-10-19 | Docs | assemble final checkpoint B README with evidence | — | — | [e15413b](https://github.com/match-pulse/match-pulse/commit/e15413b) |
| 2026-10-19 | Docs | document AI-DLC operating model and SDLC strategy | — | — | [ee465e3](https://github.com/match-pulse/match-pulse/commit/ee465e3) |
| 2026-10-19 | Docs | write system dynamics focusing on capacity burst | — | — | [cbc1f7a](https://github.com/match-pulse/match-pulse/commit/cbc1f7a) |
| 2026-10-19 | Docs | Update README for Checkpoint A with new claims and tests | — | — | [0fec931](https://github.com/match-pulse/match-pulse/commit/0fec931) |
| 2026-10-19 | Docs | Update governance document for stakeholder interests and risks | — | — | [117ebb0](https://github.com/match-pulse/match-pulse/commit/117ebb0) |
| 2026-10-19 | Docs | Update product claims for tournament registration system | — | — | [4172092](https://github.com/match-pulse/match-pulse/commit/4172092) |
| 2026-10-19 | Docs | Revise invariants for tournament capacity and uniqueness | — | — | [4978e1f](https://github.com/match-pulse/match-pulse/commit/4978e1f) |
| 2026-10-19 | Docs | Revise user and problem context for clarity | — | — | [ee6587c](https://github.com/match-pulse/match-pulse/commit/ee6587c) |
| 2026-10-19 | Docs | assemble final checkpoint A README with evidence | — | — | [3f826d7](https://github.com/match-pulse/match-pulse/commit/3f826d7) |
| 2026-10-19 | Docs | Refine language in governance document | — | — | [2ee1287](https://github.com/match-pulse/match-pulse/commit/2ee1287) |
| 2026-10-19 | Changed | Revise governance document for stakeholder matrix and risks | — | — | [1b84da6](https://github.com/match-pulse/match-pulse/commit/1b84da6) |
| 2026-10-19 | Docs | map stakeholder governance and escalation protocol | — | — | [a9f18a0](https://github.com/match-pulse/match-pulse/commit/a9f18a0) |
| 2026-10-19 | Docs | draft product claims with explicit limits | — | — | [36052b2](https://github.com/match-pulse/match-pulse/commit/36052b2) |
| 2026-10-19 | Docs | define system invariants and enforcement guards | — | — | [8e8989d](https://github.com/match-pulse/match-pulse/commit/8e8989d) |
| 2026-10-19 | Docs | draft bounded proposal and scope | — | — | [61ebfde](https://github.com/match-pulse/match-pulse/commit/61ebfde) |
| 2026-10-19 | Docs | create empty AI transparency log template | — | — | [06ea17a](https://github.com/match-pulse/match-pulse/commit/06ea17a) |
| 2026-10-19 | Changed | fix UI placeholders, lock prediction form on submit, and update agent context | — | — | [acb1eb9](https://github.com/match-pulse/match-pulse/commit/acb1eb9) |
| 2026-10-19 | Docs | add system overview, domain model, and data flow | — | — | [6d7af12](https://github.com/match-pulse/match-pulse/commit/6d7af12) |
| 2026-10-19 | Docs | add professional repository README with quickstart guide | — | — | [e45ff0e](https://github.com/match-pulse/match-pulse/commit/e45ff0e) |
| 2026-10-19 | Docs | map domain concerns to architecture characteristics | — | — | [92a602d](https://github.com/match-pulse/match-pulse/commit/92a602d) |
| 2026-10-19 | Test | add invariant test for tournament capacity burst | — | — | [3069cd1](https://github.com/match-pulse/match-pulse/commit/3069cd1) |
| 2026-10-19 | Chore | provide placeholder env vars for Next.js build | — | — | [81ddd51](https://github.com/match-pulse/match-pulse/commit/81ddd51) |
| 2026-10-19 | Fixed | resolve explicit any type in predictions list | — | — | [d5e4749](https://github.com/match-pulse/match-pulse/commit/d5e4749) |
| 2026-10-19 | Chore | add GitHub Actions workflow for build and linting | — | — | [2126277](https://github.com/match-pulse/match-pulse/commit/2126277) |
| 2026-10-19 | Added | implement split layout, predictions table, and point deduction logic | — | — | [509d780](https://github.com/match-pulse/match-pulse/commit/509d780) |

## 2026-10-18

| Date | Type | Summary | Issue | PR | Evidence |
|---|---|---|---|---|---|
| 2026-10-18 | Chore | fix local docker connection limits and stabilize invariant test | — | — | [91bc0f8](https://github.com/match-pulse/match-pulse/commit/91bc0f8) |
| 2026-10-18 | Chore | promote release identity to v1.0.0 | — | — | [16057ad](https://github.com/match-pulse/match-pulse/commit/16057ad) |
| 2026-10-18 | Chore | add Dockerfile and release.env for local containerization | — | — | [446ad3d](https://github.com/match-pulse/match-pulse/commit/446ad3d) |
| 2026-10-18 | Test | add invariant test for atomic prediction lock | — | — | [a93edcb](https://github.com/match-pulse/match-pulse/commit/a93edcb) |
| 2026-10-18 | Added | add prediction schema and atomic submit_prediction RPC | — | — | [aba48ee](https://github.com/match-pulse/match-pulse/commit/aba48ee) |
| 2026-10-18 | Added | initialize Next.js app and configure Supabase client with bun | — | — | [f7d832b](https://github.com/match-pulse/match-pulse/commit/f7d832b) |
| 2026-10-18 | Docs | add ADR-001 for Next.js and Supabase | — | — | [ca77b56](https://github.com/match-pulse/match-pulse/commit/ca77b56) |
| 2026-10-18 | Docs | Clarify match score update process in kata.md | — | — | [4d3c8d2](https://github.com/match-pulse/match-pulse/commit/4d3c8d2) |
| 2026-10-18 | Docs | Revise MatchPulse platform description and details | — | — | [c0290f2](https://github.com/match-pulse/match-pulse/commit/c0290f2) |
| 2026-10-18 | Docs | Refine requirements for spectators wagering points | — | — | [cf12fb0](https://github.com/match-pulse/match-pulse/commit/cf12fb0) |
| 2026-10-18 | Docs | Revise MatchPulse architecture documentation | — | — | [414a5f0](https://github.com/match-pulse/match-pulse/commit/414a5f0) |
| 2026-10-18 | Docs | Enhance README with detailed project features | — | — | [254eeac](https://github.com/match-pulse/match-pulse/commit/254eeac) |
| 2026-10-18 | Docs | Enhance documentation for MatchPulse architecture | — | — | [b106973](https://github.com/match-pulse/match-pulse/commit/b106973) |
| 2026-10-18 | Docs | add MatchPulse architectural kata | — | — | [530b483](https://github.com/match-pulse/match-pulse/commit/530b483) |

## 2026-10-17

| Date | Type | Summary | Issue | PR | Evidence |
|---|---|---|---|---|---|
| 2026-10-17 | Docs | add project README | — | — | [5be8103](https://github.com/match-pulse/match-pulse/commit/5be8103) |

## Notes

- 2026-11-07: The historical table was reconstructed from `git log --no-merges` and merged PR bodies. Issue links are present only where a PR body contains an explicit closing reference; they were not inferred.
- The first entry after this changelog is established is recorded contemporaneously and links its issue, PR, verification, and AI transparency entry.
