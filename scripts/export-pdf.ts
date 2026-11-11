/**
 * Export the course submission documents to PDF.
 *
 * Uses marked for Markdown -> HTML and Playwright Chromium for print-to-PDF.
 * Run after `bunx playwright install chromium`:
 *   bun run docs:pdf
 */
import { mkdirSync, readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { marked } from 'marked'
import { chromium } from 'playwright'

const root = process.cwd()

type DocumentSpec = {
  sources: string[]
  output: string
  title: string
  compact?: boolean
}

const documents: DocumentSpec[] = [
  {
    sources: ['docs/architecture/kata.md'],
    output: 'docs/submissions/kata.pdf',
    title: 'MatchPulse — Kata',
    compact: true
  },
  {
    sources: ['docs/architecture/03-architecture-characteristics.md'],
    output: 'docs/submissions/architecture-characteristics.pdf',
    title: 'MatchPulse — Architecture Characteristics',
    compact: true
  },
  {
    sources: ['docs/architecture/reports/2026-11-10.md'],
    output: 'docs/submissions/architecture-report.pdf',
    title: 'MatchPulse — Architecture Description',
    compact: true
  },
  {
    sources: [
      'docs/methodology/checkpoints/A.md',
      'docs/methodology/checkpoints/B.md',
      'docs/methodology/checkpoints/C.md',
      'docs/methodology/checkpoints/D.md',
      'docs/methodology/checkpoints/E.md'
    ],
    output: 'docs/submissions/methodology-checkpoints.pdf',
    title: 'MatchPulse — Methodology Checkpoints A–E',
    compact: true
  }
]

const style = `
  @page { size: A4; margin: 18mm 16mm; }
  body { font-family: system-ui, -apple-system, "Segoe UI", sans-serif; color: #0f172a; line-height: 1.5; font-size: 10.5pt; }
  h1 { font-size: 22pt; border-bottom: 2px solid #2563eb; padding-bottom: 6px; }
  h2 { font-size: 15pt; margin-top: 20px; border-bottom: 1px solid #cbd5e1; padding-bottom: 3px; }
  h3 { font-size: 12pt; margin-top: 14px; }
  table { width: 100%; border-collapse: collapse; margin: 10px 0; font-size: 8.8pt; }
  th, td { border: 1px solid #cbd5e1; padding: 5px; vertical-align: top; }
  th { background: #e2e8f0; text-align: left; }
  code { background: #f1f5f9; padding: 1px 3px; border-radius: 3px; font-size: 9pt; }
  pre { background: #0f172a; color: #e2e8f0; padding: 10px; border-radius: 6px; overflow-wrap: anywhere; white-space: pre-wrap; }
  a { color: #1d4ed8; text-decoration: none; }
  blockquote { border-left: 3px solid #94a3b8; margin-left: 0; padding-left: 12px; color: #334155; }
  body.compact { font-size: 9.4pt; line-height: 1.35; }
  body.compact h1 { font-size: 17pt; margin: 0 0 6px; }
  body.compact h2 { font-size: 11.5pt; margin: 10px 0 4px; }
  body.compact p, body.compact li { margin: 3px 0; }
  body.compact table { font-size: 7.8pt; margin: 5px 0; }
  body.compact th, body.compact td { padding: 2px 3px; }
  body.compact ul { margin: 3px 0 3px 16px; }
  .page-break { break-after: page; page-break-after: always; }
`

async function main() {
  const browser = await chromium.launch()
  const page = await browser.newPage()

  try {
    for (const spec of documents) {
      const markdown = spec.sources
        .map((source) => readFileSync(join(root, source), 'utf8'))
        .join('\n\n<div class="page-break"></div>\n\n')
      const body = marked.parse(markdown, { async: false }) as string
      const html = `<!doctype html><html lang="en"><head><meta charset="utf-8"><title>${spec.title}</title><style>${style}</style></head><body class="${spec.compact ? 'compact' : ''}">${body}</body></html>`

      await page.setContent(html, { waitUntil: 'networkidle' })
      mkdirSync(dirname(join(root, spec.output)), { recursive: true })
      await page.pdf({
        path: join(root, spec.output),
        format: 'A4',
        scale: spec.compact ? 0.9 : 1,
        printBackground: true,
        displayHeaderFooter: true,
        headerTemplate: `<div style="font-size:8px;color:#64748b;width:100%;text-align:right;padding-right:14mm;">${spec.title}</div>`,
        footerTemplate: '<div style="font-size:8px;color:#64748b;width:100%;text-align:center;"><span class="pageNumber"></span> / <span class="totalPages"></span></div>',
        margin: spec.compact
          ? { top: '12mm', bottom: '12mm', left: '12mm', right: '12mm' }
          : { top: '20mm', bottom: '18mm', left: '16mm', right: '16mm' }
      })
      console.log(`wrote ${spec.output}`)
    }
  } finally {
    await browser.close()
  }
}

main().catch((error) => {
  console.error(`PDF export failed: ${error instanceof Error ? error.message : String(error)}`)
  process.exit(1)
})
