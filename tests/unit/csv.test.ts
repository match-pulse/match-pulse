import { describe, expect, test } from 'bun:test'
import { csvValue } from '../../src/lib/csv'

describe('csvValue', () => {
  test('quotes and escapes ordinary values', () => {
    expect(csvValue('Match "One"')).toBe('"Match ""One"""')
    expect(csvValue(null)).toBe('""')
  })

  test('neutralises spreadsheet formula prefixes', () => {
    expect(csvValue('=HYPERLINK("https://example.test")')).toBe(
      '"\'=HYPERLINK(""https://example.test"")"'
    )
    expect(csvValue('+SUM(1,2)')).toBe('"\'+SUM(1,2)"')
    expect(csvValue('-1+2')).toBe('"\'-1+2"')
    expect(csvValue('@cmd')).toBe('"\'@cmd"')
  })
})
