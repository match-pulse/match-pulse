'use server'

import { getCurrentUser } from '@/lib/session'
import { createSupabaseServerClient } from '@/lib/supabase/server'

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

/**
 * Register the current user for a tournament.
 *
 * Identity is resolved from the auth session and again inside the database with
 * `auth.uid()`. Capacity and uniqueness are enforced by
 * `register_for_tournament`; this action only validates the request and
 * translates the result.
 */
export async function registerForTournament(formData: FormData) {
  const tournamentId = formData.get('tournamentId')

  if (typeof tournamentId !== 'string' || !UUID_PATTERN.test(tournamentId)) {
    return { success: false, message: 'Invalid registration request.' }
  }

  const user = await getCurrentUser()
  if (!user) {
    return { success: false, message: 'Sign in required.' }
  }

  const supabase = await createSupabaseServerClient()
  const { data: registered, error } = await supabase.rpc('register_for_tournament', {
    p_tournament_id: tournamentId
  })

  if (error) {
    if (error.message.includes('authentication required')) {
      return { success: false, message: 'Sign in required.' }
    }
    return { success: false, message: 'Registration failed. Please try again.' }
  }

  if (!registered) {
    // The function returns false both when the tournament is full and when this
    // participant already holds a place. The page resolves which of the two it
    // is so the message can say so.
    return { success: false, message: 'Registration refused.' }
  }

  return { success: true, message: 'Your place is confirmed.' }
}
