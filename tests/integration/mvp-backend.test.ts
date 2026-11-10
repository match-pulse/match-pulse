/**
 * MVP backend integration: roles, organizer ownership, tickets, rewards,
 * club analytics privacy and audit records.
 *
 * These tests use the real local Supabase/PostgreSQL boundary.
 */
import { describe, expect, test } from 'bun:test'
import { randomUUID } from 'crypto'
import { admin, createUser, deleteUsers, type TestUser } from '../support/auth'
import {
  deleteTournament,
  finishMatch,
  pointsOf,
  setPoints
} from '../support/fixtures'

const TEST_TIMEOUT_MS = 60_000

type Row = Record<string, unknown>

function normalize(data: unknown): Row | null {
  if (Array.isArray(data)) return (data[0] as Row) ?? null
  return (data as Row) ?? null
}

async function createOwnedTournament(
  organizer: TestUser,
  capacity = 8,
  ticketAllocation = 2,
  ticketPoints = 50,
  name = `MVP Cup ${crypto.randomUUID().slice(0, 8)}`
): Promise<string> {
  const { data, error } = await organizer.client.rpc('create_tournament', {
    p_name: name,
    p_max_capacity: capacity,
    p_ticket_allocation: ticketAllocation,
    p_ticket_points: ticketPoints
  })
  if (error) throw new Error(`create_tournament failed: ${error.message}`)
  return String(data)
}

async function createOwnedMatch(
  organizer: TestUser,
  tournamentId: string,
  kickoffOffsetMs = -3_600_000
): Promise<{ matchId: string; marketId: string }> {
  const { data, error } = await organizer.client.rpc('create_match', {
    p_tournament_id: tournamentId,
    p_home_team: 'MVP Home',
    p_away_team: 'MVP Away',
    p_kickoff: new Date(Date.now() + kickoffOffsetMs).toISOString()
  })
  if (error) throw new Error(`create_match failed: ${error.message}`)
  const row = normalize(data)
  if (!row) throw new Error('create_match returned no row')
  return { matchId: String(row.match_id), marketId: String(row.market_id) }
}

async function openTrade(user: TestUser, marketId: string, budget: number) {
  const { data, error } = await user.client.rpc('open_trade', {
    p_market_id: marketId,
    p_outcome: 'HOME',
    p_budget: budget,
    p_request_id: null
  })
  if (error) throw new Error(`open_trade failed: ${error.message}`)
  return normalize(data)
}

describe('MVP backend: roles and organizer ownership', () => {
  test(
    'an organizer creates a tournament and a match with its market',
    async () => {
      const organizer = await createUser('ORGANIZER')
      let tournamentId: string | null = null

      try {
        tournamentId = await createOwnedTournament(organizer)
        const { matchId, marketId } = await createOwnedMatch(organizer, tournamentId)

        const { data: tournament } = await admin
          .from('tournaments')
          .select('organizer_id, ticket_allocation, ticket_points')
          .eq('id', tournamentId)
          .single()

        expect(tournament?.organizer_id).toBe(organizer.id)
        expect(tournament?.ticket_allocation).toBe(2)
        expect(tournament?.ticket_points).toBe(50)

        const { data: match } = await admin
          .from('matches')
          .select('tournament_id, home_score, away_score')
          .eq('id', matchId)
          .single()

        expect(match?.tournament_id).toBe(tournamentId)
        expect(match?.home_score).toBe(0)
        expect(match?.away_score).toBe(0)

        const { data: market } = await admin
          .from('markets')
          .select('id')
          .eq('id', marketId)
          .single()

        expect(market?.id).toBe(marketId)
      } finally {
        if (tournamentId) await deleteTournament(tournamentId)
        await deleteUsers([organizer])
      }
    },
    TEST_TIMEOUT_MS
  )

  test(
    'a fan cannot create a tournament and another organizer cannot manage it',
    async () => {
      const organizerA = await createUser('ORGANIZER')
      const organizerB = await createUser('ORGANIZER')
      const fan = await createUser('FAN')
      let tournamentId: string | null = null

      try {
        const fanAttempt = await fan.client.rpc('create_tournament', {
          p_name: 'Not allowed',
          p_max_capacity: 4
        })
        expect(fanAttempt.error?.message).toContain('organizer authorization required')

        tournamentId = await createOwnedTournament(organizerA)
        const otherAttempt = await organizerB.client.rpc('update_tournament', {
          p_id: tournamentId,
          p_name: 'Hijacked',
          p_max_capacity: 4,
          p_ticket_allocation: 2,
          p_ticket_points: 50
        })
        expect(otherAttempt.error?.message).toContain('does not own')
      } finally {
        if (tournamentId) await deleteTournament(tournamentId)
        await deleteUsers([organizerA, organizerB, fan])
      }
    },
    TEST_TIMEOUT_MS
  )
})

describe('MVP backend: tickets and rewards', () => {
  test(
    'a ticket is awarded once, respects allocation and credits points',
    async () => {
      const organizer = await createUser('ORGANIZER')
      const fanA = await createUser('FAN')
      const fanB = await createUser('FAN')
      let tournamentId: string | null = null

      try {
        tournamentId = await createOwnedTournament(organizer, 8, 1, 50)

        const first = await fanA.client.rpc('claim_ticket', { p_tournament_id: tournamentId })
        expect(first.error).toBeNull()
        expect(Number(normalize(first.data)?.points_awarded)).toBe(50)
        expect(await pointsOf(fanA.id)).toBe(250)

        const duplicate = await fanA.client.rpc('claim_ticket', { p_tournament_id: tournamentId })
        expect(duplicate.error?.message).toContain('ticket already claimed')
        expect(await pointsOf(fanA.id)).toBe(250)

        const soldOut = await fanB.client.rpc('claim_ticket', { p_tournament_id: tournamentId })
        expect(soldOut.error?.message).toContain('tickets sold out')
        expect(await pointsOf(fanB.id)).toBe(200)
      } finally {
        if (tournamentId) await deleteTournament(tournamentId)
        await deleteUsers([organizer, fanA, fanB])
      }
    },
    TEST_TIMEOUT_MS
  )

  test(
    'a reward deducts points once and returns a local code',
    async () => {
      const fan = await createUser('FAN')

      try {
        const { data: rewards } = await admin
          .from('rewards')
          .select('id, cost_points')
          .eq('active', true)
          .is('club_id', null)
          .order('cost_points', { ascending: true })
          .limit(2)

        expect(rewards?.length).toBe(2)
        const reward = rewards![0]
        const secondReward = rewards![1]

        await setPoints(fan.id, 120)
        const requestId = randomUUID()
        const first = await fan.client.rpc('redeem_reward', {
          p_reward_id: reward.id,
          p_request_id: requestId
        })
        expect(first.error).toBeNull()
        const row = normalize(first.data)
        expect(String(row?.code)).toMatch(/^MP-[A-Z0-9]{10}$/)
        expect(Number(row?.points_after)).toBe(120 - reward.cost_points)

        const replay = await fan.client.rpc('redeem_reward', {
          p_reward_id: reward.id,
          p_request_id: requestId
        })
        expect(replay.error).toBeNull()
        expect(normalize(replay.data)?.code).toBe(row?.code)
        expect(await pointsOf(fan.id)).toBe(120 - reward.cost_points)

        const mismatch = await fan.client.rpc('redeem_reward', {
          p_reward_id: secondReward.id,
          p_request_id: requestId
        })
        expect(mismatch.error?.message).toContain('request id reused with a different payload')

        const second = await fan.client.rpc('redeem_reward', {
          p_reward_id: reward.id,
          p_request_id: randomUUID()
        })
        expect(second.error?.message).toContain('insufficient points')
        expect(await pointsOf(fan.id)).toBe(120 - reward.cost_points)

        const { data: redemptions } = await admin
          .from('reward_redemptions')
          .select('id')
          .eq('user_id', fan.id)
        expect(redemptions?.length).toBe(1)
      } finally {
        await deleteUsers([fan])
      }
    },
    TEST_TIMEOUT_MS
  )

  test(
    'concurrent redemptions with one request key commit one debit and one code',
    async () => {
      const fan = await createUser('FAN')

      try {
        const { data: rewards } = await admin
          .from('rewards')
          .select('id, cost_points')
          .eq('active', true)
          .is('club_id', null)
          .order('cost_points', { ascending: true })
          .limit(1)

        expect(rewards?.length).toBe(1)
        const reward = rewards![0]
        await setPoints(fan.id, 200)
        const requestId = randomUUID()

        const results = await Promise.all([
          fan.client.rpc('redeem_reward', {
            p_reward_id: reward.id,
            p_request_id: requestId
          }),
          fan.client.rpc('redeem_reward', {
            p_reward_id: reward.id,
            p_request_id: requestId
          })
        ])

        for (const result of results) {
          expect(result.error).toBeNull()
        }
        expect(normalize(results[0].data)?.code).toBe(normalize(results[1].data)?.code)
        expect(await pointsOf(fan.id)).toBe(200 - reward.cost_points)

        const { data: redemptions } = await admin
          .from('reward_redemptions')
          .select('id')
          .eq('user_id', fan.id)
        expect(redemptions?.length).toBe(1)
      } finally {
        await deleteUsers([fan])
      }
    },
    TEST_TIMEOUT_MS
  )
})

describe('MVP backend: organizer projections and club analytics', () => {
  test(
    'organizer projections are owner-only and expose no private rows',
    async () => {
      const organizerA = await createUser('ORGANIZER')
      const organizerB = await createUser('ORGANIZER')
      const fan = await createUser('FAN')
      let tournamentId: string | null = null

      try {
        tournamentId = await createOwnedTournament(organizerA, 8, 2, 50)
        await fan.client.rpc('claim_ticket', { p_tournament_id: tournamentId })
        await fan.client.rpc('register_for_tournament', { p_tournament_id: tournamentId })

        const registrations = await organizerA.client.rpc('organizer_tournament_registrations', {
          p_tournament_id: tournamentId
        })
        expect(registrations.error).toBeNull()
        expect(registrations.data?.length).toBe(1)
        expect(registrations.data?.[0]?.username).toBeString()

        const tickets = await organizerA.client.rpc('organizer_tournament_tickets', {
          p_tournament_id: tournamentId
        })
        expect(tickets.error).toBeNull()
        expect(tickets.data?.length).toBe(1)

        const denied = await organizerB.client.rpc('organizer_tournament_registrations', {
          p_tournament_id: tournamentId
        })
        expect(denied.error?.message).toContain('does not own')
      } finally {
        if (tournamentId) await deleteTournament(tournamentId)
        await deleteUsers([organizerA, organizerB, fan])
      }
    },
    TEST_TIMEOUT_MS
  )

})

describe('MVP backend: ownership-aware resolution', () => {
  test(
    'only the organizer who owns the match can resolve its market',
    async () => {
      const organizerA = await createUser('ORGANIZER')
      const organizerB = await createUser('ORGANIZER')
      const fan = await createUser('FAN')
      let tournamentId: string | null = null

      try {
        tournamentId = await createOwnedTournament(organizerA, 8, 10, 50)
        const { marketId } = await createOwnedMatch(organizerA, tournamentId)
        await setPoints(fan.id, 200)
        await openTrade(fan, marketId, 10)

        const denied = await organizerB.client.rpc('resolve_market', {
          p_market_id: marketId,
          p_winner: 'HOME'
        })
        expect(denied.error?.message).toContain('does not own')

        await finishMatch(marketId, 1, 0)

        const resolved = await organizerA.client.rpc('resolve_market', {
          p_market_id: marketId,
          p_winner: 'HOME'
        })
        expect(resolved.error).toBeNull()
        expect(Number(normalize(resolved.data)?.holders)).toBe(1)
      } finally {
        if (tournamentId) await deleteTournament(tournamentId)
        await deleteUsers([organizerA, organizerB, fan])
      }
    },
    TEST_TIMEOUT_MS
  )
})
