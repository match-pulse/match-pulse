import { readFileSync } from 'node:fs'
import { join } from 'node:path'

export type MigrationSource = {
  core: string
  idempotent: string
  security: string
  marketBinding: string
  ticketing: string
  reward: string
  subscription: string
  privacy: string
  payload: string
}

export type Replacement = {
  find: string
  replace: string
  all?: boolean
}

export function loadMigrations(root: string): MigrationSource {
  const migration = (name: string) =>
    readFileSync(join(root, 'supabase', 'migrations', name), 'utf8')

  return {
    core: migration('20261021_market_core.sql'),
    idempotent: migration('20261112_idempotent_rpcs.sql'),
    security: migration('20261206_security_boundary.sql'),
    marketBinding: migration('20261207_market_result_binding.sql'),
    ticketing: migration('20261208_ticketing_integrity.sql'),
    reward: migration('20261209_reward_idempotency.sql'),
    subscription: migration('20261210_subscription_limits.sql'),
    privacy: migration('20261211_privacy_retention.sql'),
    payload: migration('20261212_ticket_payload_hash.sql')
  }
}

/**
 * Return the last definition of a public function in a migration source.
 * The check is deliberately text-level: a missing function is a maintenance
 * error, not a silent pass.
 */
export function functionBlock(sql: string, name: string): string {
  const marker = `CREATE OR REPLACE FUNCTION public.${name}(`
  let start = -1
  let index = sql.indexOf(marker)

  while (index !== -1) {
    start = index
    index = sql.indexOf(marker, index + marker.length)
  }

  if (start === -1) {
    throw new Error(`function public.${name} not found in migration source`)
  }

  const next = sql.indexOf('CREATE OR REPLACE FUNCTION public.', start + marker.length)
  return sql.slice(start, next === -1 ? sql.length : next)
}

export function mutateFunction(
  sql: string,
  name: string,
  replacements: Replacement[]
): string {
  let block = functionBlock(sql, name)

  for (const replacement of replacements) {
    if (!block.includes(replacement.find)) {
      throw new Error(
        `mutation target not found in public.${name}: ${replacement.find.slice(0, 100)}`
      )
    }

    block = replacement.all
      ? block.split(replacement.find).join(replacement.replace)
      : block.replace(replacement.find, replacement.replace)
  }

  return block
}
