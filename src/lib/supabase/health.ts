import { createClient } from '@supabase/supabase-js'

/**
 * Cookie-less anon client for the public health read.
 *
 * The health check must work without a session and must not depend on request
 * cookies, so it uses the same public anon key as the browser client with
 * session persistence disabled. The anon key is protected by RLS; no service
 * role credential is used.
 */
export function createSupabaseHealthClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!url || !anonKey) {
    throw new Error('Missing Supabase environment variables')
  }

  return createClient(url, anonKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false
    }
  })
}
