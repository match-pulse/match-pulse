import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join, relative } from 'node:path'

type Failure = { rule: string; detail: string }

const root = process.cwd()
const failures: Failure[] = []
const passes: string[] = []

function walk(dir: string): string[] {
  const entries = readdirSync(dir)
  const files: string[] = []

  for (const entry of entries) {
    const full = join(dir, entry)
    if (statSync(full).isDirectory()) {
      files.push(...walk(full))
    } else if (full.endsWith('.ts') || full.endsWith('.tsx')) {
      files.push(full)
    }
  }

  return files
}

function fail(rule: string, detail: string) {
  failures.push({ rule, detail })
}

function pass(rule: string) {
  passes.push(rule)
}

const sourceFiles = walk(join(root, 'src'))
const sourceText = new Map(sourceFiles.map((file) => [file, readFileSync(file, 'utf8')]))

// 1. The application runtime must never use the service-role credential.
const serviceRoleFiles = sourceFiles.filter((file) => {
  const text = sourceText.get(file) ?? ''
  return /SUPABASE_SERVICE_ROLE_KEY|service_role/i.test(text)
})

if (serviceRoleFiles.length > 0) {
  fail(
    'No service-role key in application source',
    serviceRoleFiles.map((file) => relative(root, file)).join(', ')
  )
} else {
  pass('No service-role key in application source')
}

// 2. Mutations must go through authorized RPCs, not direct table calls.
//    Match Supabase-style `from('table').insert(...)` etc., not Map.delete or
//    FormData.set.
const directMutationPattern = /\.from\([^)]*\)\s*\.\s*(insert|update|delete)\s*\(/
const directMutationFiles = sourceFiles.filter((file) =>
  directMutationPattern.test(sourceText.get(file) ?? '')
)

if (directMutationFiles.length > 0) {
  fail(
    'No direct table mutations in application source',
    directMutationFiles.map((file) => relative(root, file)).join(', ')
  )
} else {
  pass('No direct table mutations in application source')
}

// 3. Client components must not import the server-only Supabase client.
const componentFiles = walk(join(root, 'src', 'components'))
const serverImportFiles = componentFiles.filter((file) =>
  (sourceText.get(file) ?? '').includes("@/lib/supabase/server")
)

if (serverImportFiles.length > 0) {
  fail(
    'Components do not import the server Supabase client',
    serverImportFiles.map((file) => relative(root, file)).join(', ')
  )
} else {
  pass('Components do not import the server Supabase client')
}

// 4. The retired singleton client must not return.
const oldClientFiles = sourceFiles.filter((file) =>
  (sourceText.get(file) ?? '').includes("from '@/lib/supabase'")
)

if (oldClientFiles.length > 0) {
  fail(
    'No imports of the retired unauthenticated client',
    oldClientFiles.map((file) => relative(root, file)).join(', ')
  )
} else {
  pass('No imports of the retired unauthenticated client')
}

// 5. Every mutation RPC must be SECURITY DEFINER, resolve auth.uid(), and be
//    granted only to authenticated users. This is a text-level guard, not a
//    substitute for the database-backed authorization suite.
const migrationsDir = join(root, 'supabase', 'migrations')
const migrationFiles = readdirSync(migrationsDir)
  .filter((file) => file.endsWith('.sql'))
  .sort()
const rpcSql = migrationFiles
  .map((file) => readFileSync(join(migrationsDir, file), 'utf8'))
  .join('\n')

const mutationRpcs = [
  { name: 'register_for_tournament', signature: '(UUID)' },
  { name: 'open_trade', signature: '(UUID, TEXT, INT, UUID)' },
  { name: 'close_trade', signature: '(UUID, TEXT, NUMERIC, UUID)' },
  { name: 'resolve_market', signature: '(UUID, TEXT)' },
  { name: 'create_tournament', signature: '(TEXT, INT, INT, INT)' },
  { name: 'update_tournament', signature: '(UUID, TEXT, INT, INT, INT)' },
  { name: 'create_match', signature: '(UUID, TEXT, TEXT, TIMESTAMPTZ)' },
  { name: 'update_match', signature: '(UUID, INT, INT, TEXT)' },
  { name: 'claim_ticket', signature: '(UUID)' },
  { name: 'redeem_reward', signature: '(UUID)' },
  { name: 'record_club_export', signature: '(TEXT, JSONB)' },
  { name: 'create_club', signature: '(TEXT, TEXT, TEXT)' },
  { name: 'update_club', signature: '(UUID, TEXT, TEXT)' },
  { name: 'request_plan_change', signature: '(UUID, TEXT)' },
  { name: 'admin_assign_plan', signature: '(UUID, TEXT, TEXT)' },
  { name: 'admin_set_subscription_status', signature: '(UUID, TEXT)' },
  { name: 'invite_club_member', signature: '(UUID, TEXT, TEXT)' },
  { name: 'accept_club_invite', signature: '(TEXT)' },
  { name: 'set_club_member_role', signature: '(UUID, UUID, TEXT)' },
  { name: 'remove_club_member', signature: '(UUID, UUID)' },
  { name: 'create_club_event', signature: '(UUID, TEXT, INT, INT, INT)' },
  { name: 'update_club_event', signature: '(UUID, TEXT, INT, INT, INT)' },
  { name: 'publish_club_event', signature: '(UUID)' },
  { name: 'create_club_match', signature: '(UUID, TEXT, TEXT, TIMESTAMPTZ, BOOLEAN)' },
  { name: 'update_club_match', signature: '(UUID, INT, INT, TEXT)' },
  { name: 'set_prediction_enabled', signature: '(UUID, BOOLEAN)' },
  {
    name: 'create_ticket_type',
    signature:
      '(UUID, TEXT, TEXT, INT, INT, TIMESTAMPTZ, TIMESTAMPTZ, TIMESTAMPTZ, INT, BOOLEAN, BOOLEAN, BOOLEAN)'
  },
  { name: 'purchase_ticket', signature: '(UUID, JSONB, BOOLEAN, UUID, TEXT, UUID)' },
  { name: 'box_office_sell', signature: '(UUID, UUID, JSONB, BOOLEAN, UUID)' },
  { name: 'transfer_ticket', signature: '(UUID, JSONB)' },
  { name: 'check_in_ticket', signature: '(TEXT)' },
  { name: 'create_club_reward', signature: '(UUID, TEXT, INT, INT)' },
  { name: 'issue_club_fan_card', signature: '(UUID, TEXT, UUID)' }
]

function functionBlock(name: string): string {
  const marker = `CREATE OR REPLACE FUNCTION public.${name}(`
  let start = -1
  let index = rpcSql.indexOf(marker)

  while (index !== -1) {
    start = index
    index = rpcSql.indexOf(marker, index + marker.length)
  }

  if (start === -1) return ''
  const next = rpcSql.indexOf('CREATE OR REPLACE FUNCTION public.', start + marker.length)
  return rpcSql.slice(start, next === -1 ? rpcSql.length : next)
}

for (const rpc of mutationRpcs) {
  const block = functionBlock(rpc.name)
  if (!block) {
    fail('Mutation RPC exists', `${rpc.name} not found in migrations`)
    continue
  }
  if (!block.includes('SECURITY DEFINER')) {
    fail('Mutation RPC is SECURITY DEFINER', rpc.name)
  }
  if (!block.includes('auth.uid()') && !block.includes('public.require_')) {
    fail('Mutation RPC resolves auth.uid() or an auth helper', rpc.name)
  }
  if (!rpcSql.includes(`REVOKE ALL ON FUNCTION public.${rpc.name}${rpc.signature}`)) {
    fail('Mutation RPC revokes broad execute', rpc.name)
  }
  if (!rpcSql.includes(`GRANT EXECUTE ON FUNCTION public.${rpc.name}${rpc.signature} TO authenticated;`)) {
    fail('Mutation RPC grants execute to authenticated', rpc.name)
  }
}

if (
  !functionBlock('resolve_market').includes('has_club_role') ||
  !functionBlock('resolve_market').includes('organizer authorization required')
) {
  fail(
    'resolve_market requires club or organizer authorization',
    'club/organizer check not found'
  )
}

if (failures.length === 0) {
  pass('Mutation RPCs are definer functions with auth checks and explicit grants')
}

if (failures.length > 0) {
  console.error('Architecture guards failed:')
  for (const failure of failures) {
    console.error(`  ✗ ${failure.rule}: ${failure.detail}`)
  }
  process.exit(1)
}

console.log('Architecture guards passed:')
for (const rule of passes) {
  console.log(`  ✓ ${rule}`)
}
