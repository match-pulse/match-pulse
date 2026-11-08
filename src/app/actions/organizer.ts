'use server'

import { revalidatePath } from 'next/cache'
import { getProfile } from '@/lib/session'
import { createSupabaseServerClient } from '@/lib/supabase/server'

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export type OrganizerResult = { success: boolean; message: string; id?: string }

function describe(error: string): string {
  if (error.includes('organizer authorization required')) return 'Organizer access required.'
  if (error.includes('does not own')) return 'You do not own this tournament or match.'
  if (error.includes('capacity cannot be below')) return 'Capacity cannot be below current players.'
  if (error.includes('ticket allocation cannot be below')) return 'Ticket allocation cannot be below sold tickets.'
  if (error.includes('sold out')) return 'Tickets are sold out.'
  if (error.includes('market already resolved')) return 'This market is already resolved.'
  if (error.includes('invalid')) return 'Check the form values.'
  return 'The action could not be completed. Please try again.'
}

async function requireOrganizer() {
  const profile = await getProfile()
  if (!profile || profile.role !== 'ORGANIZER') return null
  return profile
}

export async function createTournament(formData: FormData): Promise<OrganizerResult> {
  const profile = await requireOrganizer()
  if (!profile) return { success: false, message: 'Organizer access required.' }

  const name = formData.get('name')
  const capacity = Number(formData.get('capacity'))
  const ticketAllocation = Number(formData.get('ticketAllocation'))
  const ticketPoints = Number(formData.get('ticketPoints'))

  if (typeof name !== 'string' || !name.trim()) {
    return { success: false, message: 'Tournament name is required.' }
  }
  if (!Number.isInteger(capacity) || capacity < 1) {
    return { success: false, message: 'Capacity must be a positive integer.' }
  }
  if (!Number.isInteger(ticketAllocation) || ticketAllocation < 0) {
    return { success: false, message: 'Ticket allocation must be a non-negative integer.' }
  }
  if (!Number.isInteger(ticketPoints) || ticketPoints < 0) {
    return { success: false, message: 'Ticket points must be a non-negative integer.' }
  }

  const supabase = await createSupabaseServerClient()
  const { data, error } = await supabase.rpc('create_tournament', {
    p_name: name.trim(),
    p_max_capacity: capacity,
    p_ticket_allocation: ticketAllocation,
    p_ticket_points: ticketPoints
  })

  if (error) return { success: false, message: describe(error.message) }
  revalidatePath('/organizer')
  return { success: true, message: 'Tournament created.', id: String(data) }
}

export async function createMatch(formData: FormData): Promise<OrganizerResult> {
  const profile = await requireOrganizer()
  if (!profile) return { success: false, message: 'Organizer access required.' }

  const tournamentId = formData.get('tournamentId')
  const homeTeam = formData.get('homeTeam')
  const awayTeam = formData.get('awayTeam')
  const kickoff = formData.get('kickoff')

  if (typeof tournamentId !== 'string' || !UUID_PATTERN.test(tournamentId)) {
    return { success: false, message: 'Invalid tournament.' }
  }
  if (typeof homeTeam !== 'string' || !homeTeam.trim() || typeof awayTeam !== 'string' || !awayTeam.trim()) {
    return { success: false, message: 'Both teams are required.' }
  }
  if (typeof kickoff !== 'string' || Number.isNaN(new Date(kickoff).getTime())) {
    return { success: false, message: 'A valid kickoff time is required.' }
  }

  const supabase = await createSupabaseServerClient()
  const { data, error } = await supabase.rpc('create_match', {
    p_tournament_id: tournamentId,
    p_home_team: homeTeam.trim(),
    p_away_team: awayTeam.trim(),
    p_kickoff: new Date(kickoff).toISOString()
  })

  if (error) return { success: false, message: describe(error.message) }
  const row = Array.isArray(data) ? data[0] : data
  revalidatePath('/organizer')
  revalidatePath(`/organizer/tournaments/${tournamentId}`)
  return { success: true, message: 'Match and market created.', id: String(row?.match_id ?? '') }
}

export async function updateMatch(formData: FormData): Promise<OrganizerResult> {
  const profile = await requireOrganizer()
  if (!profile) return { success: false, message: 'Organizer access required.' }

  const matchId = formData.get('matchId')
  const homeScore = Number(formData.get('homeScore'))
  const awayScore = Number(formData.get('awayScore'))
  const status = formData.get('status')

  if (typeof matchId !== 'string' || !UUID_PATTERN.test(matchId)) {
    return { success: false, message: 'Invalid match.' }
  }
  if (!Number.isInteger(homeScore) || homeScore < 0 || !Number.isInteger(awayScore) || awayScore < 0) {
    return { success: false, message: 'Scores must be non-negative integers.' }
  }
  if (status !== 'SCHEDULED' && status !== 'LIVE' && status !== 'FINISHED') {
    return { success: false, message: 'Invalid match status.' }
  }

  const supabase = await createSupabaseServerClient()
  const { error } = await supabase.rpc('update_match', {
    p_match_id: matchId,
    p_home_score: homeScore,
    p_away_score: awayScore,
    p_status: status
  })

  if (error) return { success: false, message: describe(error.message) }
  revalidatePath('/organizer')
  return { success: true, message: 'Match updated.' }
}

export async function resolveMarket(formData: FormData): Promise<OrganizerResult> {
  const profile = await requireOrganizer()
  if (!profile) return { success: false, message: 'Organizer access required.' }

  const marketId = formData.get('marketId')
  const winner = formData.get('winner')

  if (typeof marketId !== 'string' || !UUID_PATTERN.test(marketId)) {
    return { success: false, message: 'Invalid market.' }
  }
  if (winner !== 'HOME' && winner !== 'DRAW' && winner !== 'AWAY') {
    return { success: false, message: 'Choose a valid winner.' }
  }

  const supabase = await createSupabaseServerClient()
  const { error } = await supabase.rpc('resolve_market', {
    p_market_id: marketId,
    p_winner: winner
  })

  if (error) return { success: false, message: describe(error.message) }
  revalidatePath('/organizer')
  return { success: true, message: 'Market resolved.' }
}
