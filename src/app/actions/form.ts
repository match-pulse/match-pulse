import { redirect } from 'next/navigation'
import { DomainError, fromUnknownError } from '@/lib/domain/errors'

export type Attempt<T> = { ok: true; data: T } | { ok: false; error: string }

export function text(formData: FormData, key: string): string | null {
  const value = formData.get(key)
  return typeof value === 'string' && value.trim().length > 0 ? value.trim() : null
}

export function requiredText(formData: FormData, key: string): string {
  const value = text(formData, key)
  if (!value) throw new DomainError('VALIDATION', `${key} is required.`)
  return value
}

export function requiredNumber(formData: FormData, key: string): number {
  const value = Number(text(formData, key))
  if (!Number.isFinite(value)) throw new DomainError('VALIDATION', `${key} must be a number.`)
  return value
}

export function optionalNumber(formData: FormData, key: string): number | undefined {
  const value = text(formData, key)
  if (value === null) return undefined
  const number = Number(value)
  if (!Number.isFinite(number)) throw new DomainError('VALIDATION', `${key} must be a number.`)
  return number
}

export function checked(formData: FormData, key: string): boolean {
  const value = formData.get(key)
  return value === 'on' || value === 'true' || value === '1'
}

export function back(path: string, key: 'message' | 'error', value: string): never {
  const separator = path.includes('?') ? '&' : '?'
  redirect(`${path}${separator}${key}=${encodeURIComponent(value)}`)
}

export function messageFor(error: unknown): string {
  return fromUnknownError(error).message
}

export async function attempt<T>(operation: () => Promise<T>): Promise<Attempt<T>> {
  try {
    return { ok: true, data: await operation() }
  } catch (error) {
    return { ok: false, error: messageFor(error) }
  }
}
