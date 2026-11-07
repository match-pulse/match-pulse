import { redirect } from 'next/navigation'
import { createSupabaseServerClient } from './supabase/server'

/**
 * Single server-side source of the current user identity.
 *
 * Server actions and pages import this and never accept a user id from the
 * client. The database RPCs also resolve the caller with `auth.uid()`; this
 * seam is for rendering and for a clear "sign in required" response.
 */
export async function getCurrentUser() {
  const supabase = await createSupabaseServerClient()
  const {
    data: { user },
    error
  } = await supabase.auth.getUser()

  if (error) {
    return null
  }

  return user
}

export async function requireUser() {
  const user = await getCurrentUser()

  if (!user) {
    redirect('/login')
  }

  return user
}
