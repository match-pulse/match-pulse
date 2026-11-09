export type DomainErrorCode =
  | 'AUTH_REQUIRED'
  | 'FORBIDDEN'
  | 'VALIDATION'
  | 'CONFLICT'
  | 'NOT_FOUND'
  | 'EMAIL_CONFIRMATION_REQUIRED'
  | 'UNKNOWN'

export class DomainError extends Error {
  readonly code: DomainErrorCode
  readonly details?: string

  constructor(code: DomainErrorCode, message: string, details?: string) {
    super(message)
    this.name = 'DomainError'
    this.code = code
    this.details = details
  }
}

type RpcErrorLike = {
  message?: string
  details?: string | null
  hint?: string | null
  code?: string
}

function classify(message: string): DomainErrorCode {
  const lower = message.toLowerCase()

  if (lower.includes('authentication required') || lower.includes('session missing')) {
    return 'AUTH_REQUIRED'
  }
  if (
    lower.includes('authorization required') ||
    lower.includes('does not own') ||
    lower.includes('only the owner') ||
    lower.includes('only the buyer') ||
    lower.includes('only the club') ||
    lower.includes('platform admin') ||
    lower.includes('permission denied')
  ) {
    return 'FORBIDDEN'
  }
  if (lower.includes('not found') || lower.includes('not available') || lower.includes('no longer')) {
    return 'NOT_FOUND'
  }
  if (
    lower.includes('already') ||
    lower.includes('reused') ||
    lower.includes('limit') ||
    lower.includes('sold out') ||
    lower.includes('insufficient') ||
    lower.includes('exhausted') ||
    lower.includes('conflict')
  ) {
    return 'CONFLICT'
  }
  if (
    lower.includes('required') ||
    lower.includes('invalid') ||
    lower.includes('must') ||
    lower.includes('between') ||
    lower.includes('cannot') ||
    lower.includes('not published') ||
    lower.includes('not active') ||
    lower.includes('has ended') ||
    lower.includes('has not started')
  ) {
    return 'VALIDATION'
  }
  return 'UNKNOWN'
}

export function fromRpcError(error: RpcErrorLike | null | undefined): DomainError {
  const message = error?.message ?? 'The operation could not be completed.'
  return new DomainError(
    classify(message),
    message,
    error?.details ?? error?.hint ?? error?.code
  )
}

export function fromUnknownError(error: unknown): DomainError {
  if (error instanceof DomainError) return error
  if (error instanceof Error) {
    return new DomainError(classify(error.message), error.message)
  }
  return new DomainError('UNKNOWN', String(error))
}
