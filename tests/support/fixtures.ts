import { randomUUID } from 'crypto'
import { admin } from './auth'

export const B = 100

export async function createTournament(
  capacity = 32,
  organizerId: string | null = null,
  ticketAllocation = 100,
  ticketPoints = 100
): Promise<string> {
  const id = randomUUID()
  const { error } = await admin.from('tournaments').insert({
    id,
    name: `Test Tournament ${id.slice(0, 8)}`,
    max_capacity: capacity,
    current_players: 0,
    organizer_id: organizerId,
    ticket_allocation: ticketAllocation,
    ticket_points: ticketPoints
  })

  if (error) {
    throw new Error(`Failed to create test tournament: ${error.message}`)
  }

  return id
}

export async function createMarket(
  kickoffOffsetMs = -3_600_000,
  b = B,
  tournamentId: string | null = null
): Promise<string> {
  const matchId = randomUUID()
  const { error: matchError } = await admin.from('matches').insert({
    id: matchId,
    tournament_id: tournamentId,
    home_team: 'Test Home',
    away_team: 'Test Away',
    status: 'LIVE',
    kickoff_time: new Date(Date.now() + kickoffOffsetMs).toISOString()
  })

  if (matchError) {
    throw new Error(`Failed to create test match: ${matchError.message}`)
  }

  const marketId = randomUUID()
  const { error } = await admin.from('markets').insert({
    id: marketId,
    match_id: matchId,
    b
  })

  if (error) {
    throw new Error(`Failed to create test market: ${error.message}`)
  }

  return marketId
}

export async function finishMatch(
  marketId: string,
  homeScore = 1,
  awayScore = 0
): Promise<void> {
  const { data, error } = await admin
    .from('markets')
    .select('match_id')
    .eq('id', marketId)
    .single()

  if (error || !data?.match_id) {
    throw new Error(`Failed to find match for market: ${error?.message ?? 'no match'}`)
  }

  const { error: updateError } = await admin
    .from('matches')
    .update({ status: 'FINISHED', home_score: homeScore, away_score: awayScore })
    .eq('id', data.match_id)

  if (updateError) {
    throw new Error(`Failed to finish match: ${updateError.message}`)
  }
}

export async function setPoints(userId: string, points: number): Promise<void> {
  const { error } = await admin.from('profiles').update({ points }).eq('id', userId)

  if (error) {
    throw new Error(`Failed to set test points: ${error.message}`)
  }
}

export async function pointsOf(userId: string): Promise<number> {
  const { data, error } = await admin
    .from('profiles')
    .select('points')
    .eq('id', userId)
    .single()

  if (error || !data) {
    throw new Error(`Failed to read profile: ${error?.message ?? 'no row'}`)
  }

  return data.points
}

export async function marketOf(marketId: string) {
  const { data, error } = await admin
    .from('markets')
    .select('b, q_home, q_draw, q_away, status, winning_outcome, resolved_at')
    .eq('id', marketId)
    .single()

  if (error || !data) {
    throw new Error(`Failed to read market: ${error?.message ?? 'no row'}`)
  }

  return data
}

export async function positionOf(marketId: string, userId: string, outcome: string) {
  const { data, error } = await admin
    .from('market_positions')
    .select('shares, cost_basis')
    .eq('market_id', marketId)
    .eq('user_id', userId)
    .eq('outcome', outcome)
    .maybeSingle()

  if (error) {
    throw new Error(`Failed to read position: ${error.message}`)
  }

  return data
}

export async function tradesOf(marketId: string, userId: string) {
  const { data, error } = await admin
    .from('market_trades')
    .select('kind, outcome, shares, cost_points, proceeds_points')
    .eq('market_id', marketId)
    .eq('user_id', userId)
    .order('created_at', { ascending: true })

  if (error) {
    throw new Error(`Failed to read trades: ${error.message}`)
  }

  return data ?? []
}

export async function cooldownOf(marketId: string, userId: string) {
  const { data, error } = await admin
    .from('market_entry_cooldowns')
    .select('level, next_entry_at')
    .eq('market_id', marketId)
    .eq('user_id', userId)
    .single()

  if (error || !data) {
    throw new Error(`Failed to read cooldown: ${error?.message ?? 'no row'}`)
  }

  return data
}

export async function setCooldown(
  marketId: string,
  userId: string,
  level: number,
  elapsedMs: number
): Promise<void> {
  const { error } = await admin
    .from('market_entry_cooldowns')
    .update({
      level,
      next_entry_at: new Date(Date.now() - elapsedMs).toISOString()
    })
    .eq('market_id', marketId)
    .eq('user_id', userId)

  if (error) {
    throw new Error(`Failed to advance cooldown: ${error.message}`)
  }
}

export async function deleteTournament(tournamentId: string): Promise<void> {
  await admin.from('matches').delete().eq('tournament_id', tournamentId)
  await admin.from('tournaments').delete().eq('id', tournamentId)
}

export async function deleteMarket(marketId: string): Promise<void> {
  const { data } = await admin
    .from('markets')
    .select('match_id')
    .eq('id', marketId)
    .maybeSingle()

  if (data?.match_id) {
    await admin.from('matches').delete().eq('id', data.match_id)
  }
}
