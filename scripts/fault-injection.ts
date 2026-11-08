/**
 * Fault-injection matrix for the market invariants.
 *
 * Each mutation weakens one enforcing mechanism in a disposable local database,
 * runs the targeted test and compares the exit code with the declared result.
 * The database is reset from migrations after every mutation.
 *
 * Run with `bun run fault:inject` after `supabase start` and `supabase db reset`.
 */
import { spawnSync } from 'node:child_process'
import { loadMigrations } from './fault-injection/sql'
import { mutations, type Mutation } from './fault-injection/mutations'

type Result = {
  id: string
  invariant: string
  kind: Mutation['kind']
  test: string
  expected: Mutation['expected']
  observedExit: number | null
  status: 'ok' | 'unexpected' | 'error'
  durationMs: number
  detail?: string
}

const root = process.cwd()

function run(command: string, args: string[], input?: string) {
  return spawnSync(command, args, {
    cwd: root,
    encoding: 'utf8',
    input,
    stdio: input === undefined ? 'inherit' : ['pipe', 'inherit', 'inherit']
  })
}

function databaseContainer(): string {
  const result = spawnSync(
    'docker',
    ['ps', '--filter', 'name=supabase_db', '--format', '{{.Names}}'],
    { cwd: root, encoding: 'utf8' }
  )

  if (result.status !== 0) {
    throw new Error(`docker ps failed: ${result.stderr || result.stdout}`)
  }

  const container = result.stdout.trim().split('\n').filter(Boolean)[0]
  if (!container) {
    throw new Error(
      'Supabase database container not found. Start Supabase and run migrations first.'
    )
  }

  return container
}

function applySql(container: string, sql: string) {
  const result = run(
    'docker',
    ['exec', '-i', container, 'psql', '-U', 'postgres', '-d', 'postgres', '-v', 'ON_ERROR_STOP=1'],
    sql
  )

  if (result.status !== 0) {
    throw new Error(`psql failed: ${result.stderr || result.stdout || `exit ${result.status}`}`)
  }
}

function resetDatabase() {
  const result = run(process.execPath, ['x', 'supabase', 'db', 'reset'])
  if (result.status !== 0) {
    throw new Error(`supabase db reset failed with exit ${result.status}`)
  }
}

function runTest(file: string): number | null {
  // Bun only treats an argument as a path (rather than a name filter) when it
  // starts with ./ or is absolute. The forced-failure file does not use the
  // normal .test/.spec suffix, so the explicit path is required.
  const path = file.startsWith('./') || file.startsWith('/') ? file : `./${file}`
  const result = run(process.execPath, ['test', '--env-file=.env.local', path])
  return result.status
}

function runFullSuite(): number | null {
  const result = run(process.execPath, [
    'test',
    '--env-file=.env.local',
    '--path-ignore-patterns=tests/fault-injection/**'
  ])
  return result.status
}

async function main() {
  const container = databaseContainer()
  const source = loadMigrations(root)
  const results: Result[] = []

  console.log(`Fault-injection matrix against ${container}`)
  console.log(`Mutations: ${mutations.length}\n`)

  for (const mutation of mutations) {
    const started = performance.now()
    let observedExit: number | null = null
    let status: Result['status'] = 'error'
    let detail: string | undefined

    try {
      resetDatabase()
      applySql(container, mutation.sql(source))
      observedExit = runTest(mutation.test)
      const passed =
        mutation.expected === 'fail' ? observedExit !== 0 : observedExit === 0
      status = passed ? 'ok' : 'unexpected'
      if (!passed) {
        detail = `expected ${mutation.expected}, observed exit ${observedExit}`
      }
    } catch (error) {
      detail = error instanceof Error ? error.message : String(error)
    }

    const result: Result = {
      id: mutation.id,
      invariant: mutation.invariant,
      kind: mutation.kind,
      test: mutation.test,
      expected: mutation.expected,
      observedExit,
      status,
      durationMs: Math.round(performance.now() - started),
      detail
    }
    results.push(result)
    console.log(JSON.stringify({ event: 'fault-injection.result', ...result }))
  }

  console.log('\nRestoring the schema and running the full invariant suite...')
  resetDatabase()
  const fullSuiteExit = runFullSuite()

  console.log('\nFault-injection summary')
  for (const result of results) {
    const mark = result.status === 'ok' ? '✓' : '✗'
    const expected = result.expected === 'fail' ? 'test fails' : 'test passes'
    console.log(
      `${mark} ${result.id} (${result.invariant}) — expected: ${expected}; observed exit: ${result.observedExit}; ${result.status}` +
        (result.detail ? ` — ${result.detail}` : '')
    )
  }
  console.log(`${fullSuiteExit === 0 ? '✓' : '✗'} full invariant suite — exit ${fullSuiteExit}`)

  const failed = results.some((result) => result.status !== 'ok') || fullSuiteExit !== 0
  if (failed) {
    process.exit(1)
  }
}

main().catch((error) => {
  console.error(`Fault-injection matrix failed: ${error instanceof Error ? error.message : String(error)}`)
  process.exit(1)
})
