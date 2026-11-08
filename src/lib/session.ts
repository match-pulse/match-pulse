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

export type Profile = {
  id: string
  username: string
  points: number
  role: 'FAN' | 'ORGANIZER' | 'CLUB'
}

export async function getProfile(): Promise<Profile | null> {
  const user = await getCurrentUser()

  if (!user) {
    return null
  }

  const supabase = await createSupabaseServerClient()
  const { data, error } = await supabase
    .from('profiles')
    .select('id, username, points, role')
    .eq('id', user.id)
    .maybeSingle()

  if (error || !data) {
    return null
  }

  return data as Profile
}

export async function requireRole(role: Profile['role']): Promise<Profile> {
  const profile = await getProfile()

  if (!profile) {
    redirect('/login')
  }

  if (profile.role !== role) {
    redirect('/')
  }

  return profile
}
