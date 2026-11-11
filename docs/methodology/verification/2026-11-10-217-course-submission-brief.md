# Verification — Course Submission Brief (Issue #217)

- **Date:** 2026-11-10
- **Issues:** #217 (parent), #218 (Development Methodologies), #219 (verification), #220 (Software Architectures)
- **Branch:** `docs/217-course-submission-brief`
- **Scope:** Documentation and PDF export only. No product, schema, authorization, migration or runtime change.

## 1. What was verified

| Check | Expected | Observed |
| :--- | :--- | :--- |
| Kata PDF | 1 page | 1 page |
| Architecture characteristics PDF | ≤2 pages | 2 pages |
| Architecture description PDF | ≤3 pages | 3 pages |
| Methodology checkpoints PDF | 5 pages (A–E) | 5 pages |
| Total submission | ≤ about 12 pages | 11 pages |
| Relative links in 23 course/reference files | 0 broken | 0 broken |
| `git diff --check` | clean | clean |
| `bun run lint` | pass | pass |
| `bunx next typegen && bun run typecheck` | pass | pass |
| `bun run check:architecture` | pass | pass |
| `bun run docs:pdf` | writes four PDFs | wrote four PDFs |

## 2. Word-count budgets

Estimated at 140–160 words per minute; this is a budget, not a human read-aloud.

| Artifact | Words | Estimated time |
| :--- | ---: | ---: |
| Kata | 357 (108-word pitch) | pitch 0.7–0.8 min; the page is the reference |
| Architecture walkthrough (spoken section) | 316 | 2.0–2.3 min |
| Checkpoint A | 442 | 2.8–3.2 min |
| Checkpoint B | 476 | 3.0–3.4 min |
| Checkpoint C | 544 | 3.4–3.9 min |
| Checkpoint D | 472 | 3.0–3.4 min |
| Checkpoint E | 493 | 3.1–3.5 min |

The kata includes a 108-word one-minute pitch; the rest of the page is the
reference. The checkpoint documents are the scripts; a human read-aloud is still
required to confirm the spoken time.

## 3. What was not run

- No `bun run build`, `bun run test`, `bun run test:agent`, `bun run test:e2e` or
  `bun run fault:inject`. The change is documentation-only and the database
  suites require a running local Supabase environment.
- No hosted deployment, production recovery or real-user validation.
- No independent review of the new document set.

## 4. Historical records

The rewrite added current documents and updated living indexes. It did **not**
overwrite, rename, move or delete the old dated reports, old checkpoint folders,
ADRs, existing verification records, findings register or changelog. AI Entry 70
was appended to the AI transparency log. The generated
`docs/submissions/methodology-report.pdf` was replaced by
`docs/submissions/methodology-checkpoints.pdf`.

## 5. Evidence

- PDFs: [`docs/submissions/`](../../submissions/)
- Course package: [`docs/course/README.md`](../../course/README.md)
- AI entry: [`Entry 70`](../ai-transparency-log.md)
