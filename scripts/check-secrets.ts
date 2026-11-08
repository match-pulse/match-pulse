/**
 * Lightweight tracked-file secret scan.
 *
 * This is a tripwire, not a substitute for GitHub secret scanning or a
 * dedicated scanner. It looks for common credential shapes in tracked text
 * files and fails the build when one is found.
 */
import { execFileSync } from 'node:child_process'
import { readFileSync, statSync } from 'node:fs'

const patterns: Array<{ name: string; pattern: RegExp }> = [
  { name: 'private key', pattern: /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/ },
  { name: 'AWS access key', pattern: /\bAKIA[0-9A-Z]{16}\b/ },
  { name: 'Stripe secret key', pattern: /\bsk_(?:live|test)_[A-Za-z0-9]{16,}\b/ },
  { name: 'JWT', pattern: /\beyJ[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{20,}\b/ },
  { name: 'service-role assignment', pattern: /SUPABASE_SERVICE_ROLE_KEY\s*=\s*[A-Za-z0-9._-]{20,}/ },
  { name: 'database URL with password', pattern: /postgres(?:ql)?:\/\/[^:\s]+:[^@\s]+@/i }
]

const ignored = new Set(['bun.lock', 'package-lock.json', 'yarn.lock'])
const files = execFileSync('git', ['ls-files'], { encoding: 'utf8' })
  .split('\n')
  .filter(Boolean)
  .filter((file) => !ignored.has(file))

const findings: Array<{ file: string; line: number; name: string }> = []

for (const file of files) {
  if (file.startsWith('.git/') || file.startsWith('node_modules/')) continue
  const stats = statSync(file)
  if (!stats.isFile() || stats.size > 2_000_000) continue
  if (/\.(png|jpg|jpeg|gif|webp|ico|pdf|zip|gz|woff2?)$/i.test(file)) continue

  let text: string
  try {
    text = readFileSync(file, 'utf8')
  } catch {
    continue
  }

  const lines = text.split('\n')
  lines.forEach((line, index) => {
    if (/your-|placeholder|<[^>]+>|\$\{/.test(line)) return
    for (const { name, pattern } of patterns) {
      if (pattern.test(line)) {
        findings.push({ file, line: index + 1, name })
      }
    }
  })
}

if (findings.length > 0) {
  console.error('Secret scan failed:')
  for (const finding of findings) {
    console.error(`  ✗ ${finding.file}:${finding.line} — ${finding.name}`)
  }
  process.exit(1)
}

console.log(`Secret scan passed: ${files.length} tracked files checked.`)
