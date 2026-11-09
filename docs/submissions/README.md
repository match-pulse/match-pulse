# Course Submission Package

Dated snapshot generated on **2026-11-09** from commit
[`ff12556`](https://github.com/match-pulse/match-pulse/commit/ff125561ee9346fb14323e7f59c4dc2a5743724c).

This directory holds the PDF exports used for the course submissions. The
Markdown sources remain authoritative; these PDFs are dated renders of them.

## Task map

| Deliverable | Markdown source | PDF | Pages |
| :--- | :--- | :--- | ---: |
| **Task 1 — Kata** (Software Architectures) | [`../architecture/kata.md`](../architecture/kata.md) | [`kata.pdf`](kata.pdf) | 1 |
| **Task 2 — Architecture Characteristics** (Software Architectures) | [`../architecture/03-architecture-characteristics.md`](../architecture/03-architecture-characteristics.md) | [`architecture-characteristics.pdf`](architecture-characteristics.pdf) | 12 |
| **Final architecture description** (PDF or Markdown permitted) | [`../architecture/reports/2026-11-08.md`](../architecture/reports/2026-11-08.md) | [`architecture-report.pdf`](architecture-report.pdf) | 13 |
| **Development Methodologies report** | [`../methodology/reports/2026-11-08.md`](../methodology/reports/2026-11-08.md) | [`methodology-report.pdf`](methodology-report.pdf) | 10 |

The architecture report and methodology report are dated snapshots, not final
reports. Their linked records remain the authoritative statements of each claim.

## Regeneration

The export script converts Markdown to HTML with `marked` and prints it to PDF
with Playwright Chromium:

```bash
bunx playwright install chromium
bun run docs:pdf
```

The command writes the four files into this directory and overwrites existing
renders. CI runs the same command in the **E2E and accessibility** job and
uploads the files as the `pdf-submissions` artifact. The committed PDFs keep the
package available without downloading a CI artifact.

## Contents and limits

- The kata is one page by design; the exporter uses a compact print style.
- The reports are 12, 13 and 10 pages at the current content; page counts are
  checked with `pdfinfo` rather than the `file` utility, which misreports them.
- The architecture and methodology reports keep their 2026-11-08 snapshot and
  include a dated 2026-11-09 v3.0.0 addendum.
- The package contains no hosted deployment, real-user validation or independent
  review evidence; those limits are stated in the reports and the
  [findings register](../methodology/findings-register.md).
