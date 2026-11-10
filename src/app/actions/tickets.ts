'use server'

import { revalidatePath } from 'next/cache'
import { getCurrentUser } from '@/lib/session'
import { createSupabaseServerClient } from '@/lib/supabase/server'

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export type ActionResult = { success: boolean; message: string; code?: string }

function describe(error: string): string {
  if (error.includes('authentication required')) return 'Sign in required.'
  if (error.includes('ticket already claimed')) return 'You already claimed a ticket for this tournament.'
  if (error.includes('tickets sold out')) return 'Tickets are sold out.'
  if (error.includes('tournament not found')) return 'Tournament not found.'
  return 'The action could not be completed. Please try again.'
}

export async function claimTicket(formData: FormData): Promise<ActionResult> {
  const tournamentId = formData.get('tournamentId')
  if (typeof tournamentId !== 'string' || !UUID_PATTERN.test(tournamentId)) {
    return { success: false, message: 'Invalid tournament.' }
  }

  const user = await getCurrentUser()
  if (!user) return { success: false, message: 'Sign in required.' }

  const supabase = await createSupabaseServerClient()
  const { data, error } = await supabase.rpc('claim_ticket', { p_tournament_id: tournamentId })

  if (error) return { success: false, message: describe(error.message) }

  const row = Array.isArray(data) ? data[0] : data
  revalidatePath('/fan')
  revalidatePath('/fan/tournaments')
  return {
    success: true,
    message: `Ticket claimed. +${row?.points_awarded ?? 0} points.`,
    code: String(row?.ticket_id ?? '')
  }
}
