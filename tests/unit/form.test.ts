import { describe, expect, test } from 'bun:test'
import { requiredNumber } from '../../src/app/actions/form'

function withValue(key: string, value?: string): FormData {
  const formData = new FormData()
  if (value !== undefined) formData.set(key, value)
  return formData
}

describe('requiredNumber', () => {
  test('rejects a missing required value instead of converting it to zero', () => {
    expect(() => requiredNumber(withValue('homeScore'), 'homeScore')).toThrow('homeScore is required.')
  })

  test('rejects an empty or whitespace-only required value', () => {
    expect(() => requiredNumber(withValue('homeScore', ''), 'homeScore')).toThrow('homeScore is required.')
    expect(() => requiredNumber(withValue('homeScore', '   '), 'homeScore')).toThrow('homeScore is required.')
  })

  test('rejects a non-numeric required value', () => {
    expect(() => requiredNumber(withValue('homeScore', 'abc'), 'homeScore')).toThrow(
      'homeScore must be a number.'
    )
  })

  test('accepts an explicit zero and finite positive or negative values', () => {
    expect(requiredNumber(withValue('homeScore', '0'), 'homeScore')).toBe(0)
    expect(requiredNumber(withValue('homeScore', '3'), 'homeScore')).toBe(3)
    expect(requiredNumber(withValue('homeScore', '-2'), 'homeScore')).toBe(-2)
  })
})
