import type { SupabaseClient } from '@supabase/supabase-js'
import { fromRpcError } from './errors'

type QueryError = {
  message?: string
  details?: string | null
  hint?: string | null
  code?: string
}

type QueryResult<T> = {
  data: T | null
  error: QueryError | null
}

export async function callRpc<T>(
  client: SupabaseClient,
  name: string,
  args?: Record<string, unknown>
): Promise<T> {
  const { data, error } = await client.rpc(name, args)
  if (error) throw fromRpcError(error)
  return data as T
}

export async function selectRows<T>(
  query: PromiseLike<QueryResult<T[]>>
): Promise<T[]> {
  const { data, error } = await query
  if (error) throw fromRpcError(error)
  return data ?? []
}

export async function selectOne<T>(
  query: PromiseLike<QueryResult<T>>
): Promise<T | null> {
  const { data, error } = await query
  if (error) throw fromRpcError(error)
  return data
}

export function first<T>(data: T[] | T | null): T | null {
  if (Array.isArray(data)) return (data[0] as T) ?? null
  return (data as T) ?? null
}
