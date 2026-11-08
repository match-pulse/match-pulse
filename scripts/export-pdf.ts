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

const documents = [
  ['docs/architecture/kata.md', 'docs/submissions/kata.pdf', 'MatchPulse — Kata'],
  [
    'docs/architecture/03-architecture-characteristics.md',
    'docs/submissions/architecture-characteristics.pdf',
    'MatchPulse — Architecture Characteristics'
  ],
  [
    'docs/architecture/reports/2026-11-08.md',
    'docs/submissions/architecture-report.pdf',
    'MatchPulse — Architecture Report'
  ],
  [
    'docs/methodology/reports/2026-11-08.md',
    'docs/submissions/methodology-report.pdf',
    'MatchPulse — Methodology Report'
  ]
] as const

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
`

async function main() {
  const browser = await chromium.launch()
  const page = await browser.newPage()

  try {
    for (const [source, output, title] of documents) {
      const markdown = readFileSync(join(root, source), 'utf8')
      const body = marked.parse(markdown, { async: false }) as string
      const html = `<!doctype html><html lang="en"><head><meta charset="utf-8"><title>${title}</title><style>${style}</style></head><body>${body}</body></html>`

      await page.setContent(html, { waitUntil: 'networkidle' })
      mkdirSync(dirname(join(root, output)), { recursive: true })
      await page.pdf({
        path: join(root, output),
        format: 'A4',
        printBackground: true,
        displayHeaderFooter: true,
        headerTemplate: `<div style="font-size:8px;color:#64748b;width:100%;text-align:right;padding-right:14mm;">${title}</div>`,
        footerTemplate: '<div style="font-size:8px;color:#64748b;width:100%;text-align:center;"><span class="pageNumber"></span> / <span class="totalPages"></span></div>',
        margin: { top: '20mm', bottom: '18mm', left: '16mm', right: '16mm' }
      })
      console.log(`wrote ${output}`)
    }
  } finally {
    await browser.close()
  }
}

main().catch((error) => {
  console.error(`PDF export failed: ${error instanceof Error ? error.message : String(error)}`)
  process.exit(1)
})
