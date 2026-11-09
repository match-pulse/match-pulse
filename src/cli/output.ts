import { DomainError, fromUnknownError } from '@/lib/domain/errors'

export type CommandInfo = {
  command: string
  group: string
  description: string
  usage: string
  mutates: boolean
}

export function success(data: unknown, json: boolean): void {
  if (json) {
    console.log(JSON.stringify({ ok: true, data }, null, 2))
    return
  }

  if (typeof data === 'string' || typeof data === 'number' || typeof data === 'boolean') {
    console.log(data)
    return
  }

  if (Array.isArray(data) && data.every((row) => row && typeof row === 'object' && !Array.isArray(row))) {
    console.table(data)
    return
  }

  console.log(JSON.stringify(data, null, 2))
}

export function failure(error: unknown, json: boolean): void {
  const domain = fromUnknownError(error)
  process.exitCode = 1

  if (json) {
    console.log(
      JSON.stringify(
        {
          ok: false,
          error: {
            code: domain.code,
            message: domain.message,
            details: domain.details ?? null
          }
        },
        null,
        2
      )
    )
    return
  }

  console.error(`Error [${domain.code}]: ${domain.message}`)
  if (domain.details) console.error(domain.details)
}

export function helpText(commands: CommandInfo[]): string {
  const groups = new Map<string, CommandInfo[]>()
  for (const command of commands) {
    const list = groups.get(command.group) ?? []
    list.push(command)
    groups.set(command.group, list)
  }

  const lines = [
    'MatchPulse CLI',
    '',
    'Usage: matchpulse <group> <command> [--profile name] [--json] [flags]',
    '',
    'Global flags:',
    '  --profile <name>   Stored session profile (default: default)',
    '  --json             Machine-readable output',
    '  --help             Show this help',
    '',
    'Commands:'
  ]

  for (const [group, entries] of groups) {
    lines.push('', `${group}:`)
    for (const entry of entries) {
      lines.push(`  ${entry.command.padEnd(34)} ${entry.description}`)
    }
  }

  lines.push(
    '',
    'Discovery:',
    '  matchpulse commands --json',
    '  matchpulse describe <command> --json',
    '',
    'Example:',
    '  matchpulse auth login --email fan@example.test --password ...',
    '  matchpulse fan events list --json'
  )

  return lines.join('\n')
}

export function describeCommand(commands: CommandInfo[], target: string): CommandInfo | null {
  return commands.find((command) => command.command === target) ?? null
}

export function unknownCommand(command: string): DomainError {
  return new DomainError(
    'VALIDATION',
    `Unknown command "${command}". Run \`matchpulse help\` or \`matchpulse commands --json\`.`
  )
}
