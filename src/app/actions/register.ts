'use server'

import { supabase } from '@/lib/supabase'
import { getCurrentUserId } from '@/lib/session'

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

/**
 * Register the current user for a tournament.
 *
 * The identity is resolved on the server and is never read from the form.
 * Capacity and uniqueness are enforced by `register_for_tournament` in the
 * database, not here: this action validates the request and translates the
 * result, it does not decide whether a place is available.
 */
export async function registerForTournament(formData: FormData) {
  const tournamentId = formData.get('tournamentId')

  if (typeof tournamentId !== 'string' || !UUID_PATTERN.test(tournamentId)) {
    return { success: false, message: 'Invalid registration request.' }
  }

  const userId = await getCurrentUserId()

  const { data: registered, error } = await supabase.rpc('register_for_tournament', {
    p_tournament_id: tournamentId,
    p_user_id: userId
  })

  if (error) {
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