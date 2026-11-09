export type FlagValue = string | boolean | string[]

export type ParsedArgs = {
  positionals: string[]
  flags: Record<string, FlagValue>
}

export function parseArgs(argv: string[]): ParsedArgs {
  const positionals: string[] = []
  const flags: Record<string, FlagValue> = {}

  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index]

    if (argument === '--') {
      positionals.push(...argv.slice(index + 1))
      break
    }

    if (argument.startsWith('--')) {
      const equals = argument.indexOf('=')
      const key = equals === -1 ? argument.slice(2) : argument.slice(2, equals)
      let value: string | boolean | undefined =
        equals === -1 ? undefined : argument.slice(equals + 1)

      if (value === undefined) {
        const next = argv[index + 1]
        if (next !== undefined && !next.startsWith('--')) {
          value = next
          index += 1
        } else {
          value = true
        }
      }

      if (key in flags) {
        const previous = flags[key]
        flags[key] = Array.isArray(previous)
          ? [...previous, String(value)]
          : [String(previous), String(value)]
      } else {
        flags[key] = value
      }
      continue
    }

    if (argument === '-h') {
      flags.help = true
      continue
    }

    positionals.push(argument)
  }

  return { positionals, flags }
}

export function getString(flags: Record<string, FlagValue>, key: string): string | undefined {
  const value = flags[key]
  if (typeof value === 'string') return value
  if (Array.isArray(value)) return value[value.length - 1]
  return undefined
}

export function getBoolean(flags: Record<string, FlagValue>, key: string): boolean {
  const value = flags[key]
  return value === true || value === 'true' || value === '1'
}

export function getList(flags: Record<string, FlagValue>, key: string): string[] {
  const value = flags[key]
  if (Array.isArray(value)) return value
  if (typeof value === 'string' && value.length > 0) return [value]
  return []
}

export function getNumber(
  flags: Record<string, FlagValue>,
  key: string
): number | undefined {
  const value = getString(flags, key)
  if (value === undefined) return undefined
  const number = Number(value)
  return Number.isFinite(number) ? number : undefined
}
