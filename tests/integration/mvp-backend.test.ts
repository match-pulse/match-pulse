/**
 * MVP backend integration: roles, organizer ownership, tickets, rewards,
 * club analytics privacy and audit records.
 *
 * These tests use the real local Supabase/PostgreSQL boundary.
 */
import { describe, expect, test } from 'bun:test'
import { admin, createUser, deleteUsers, type TestUser } from '../support/auth'
import {
  createMarket,
  deleteMarket,
  deleteTournament,
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
          .order('cost_points', { ascending: true })
          .limit(1)

        expect(rewards?.length).toBe(1)
        const reward = rewards![0]

        await setPoints(fan.id, 120)
        const first = await fan.client.rpc('redeem_reward', { p_reward_id: reward.id })
        expect(first.error).toBeNull()
        const row = normalize(first.data)
        expect(String(row?.code)).toMatch(/^MP-[A-Z0-9]{10}$/)
        expect(Number(row?.points_after)).toBe(120 - reward.cost_points)

        const second = await fan.client.rpc('redeem_reward', { p_reward_id: reward.id })
        expect(second.error?.message).toContain('insufficient points')
        expect(await pointsOf(fan.id)).toBe(120 - reward.cost_points)
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

  test(
    'club analytics aggregate five traders and suppress small cohorts',
    async () => {
      const organizer = await createUser('ORGANIZER')
      const club = await createUser('CLUB')
      const fans = await Promise.all(Array.from({ length: 5 }, () => createUser('FAN')))
      let tournamentId: string | null = null
      let smallMarketId: string | null = null

      try {
        tournamentId = await createOwnedTournament(organizer, 8, 10, 50)
        const { marketId } = await createOwnedMatch(organizer, tournamentId)

        for (const fan of fans) {
          await setPoints(fan.id, 200)
          await openTrade(fan, marketId, 10)
        }

        const summary = await club.client.rpc('club_analytics_summary', {
          p_tournament_id: tournamentId,
          p_match_id: null
        })
        expect(summary.error).toBeNull()
        expect(summary.data?.length).toBeGreaterThan(0)
        const aggregate = summary.data!.find((row: Row) => row.outcome === 'HOME') as Row
        expect(Number(aggregate.unique_traders)).toBe(5)
        expect(aggregate.suppressed).toBe(false)

        // A separate market with one trader must be suppressed.
        smallMarketId = await createMarket(-3_600_000)
        await setPoints(fans[0].id, 200)
        await openTrade(fans[0], smallMarketId, 10)

        const small = await club.client.rpc('club_analytics_summary', {
          p_tournament_id: null,
          p_match_id: null
        })
        expect(small.error).toBeNull()
        const suppressed = small.data!.find(
          (row: Row) => row.market_id === smallMarketId
        ) as Row
        expect(suppressed.suppressed).toBe(true)
        expect(suppressed.unique_traders).toBeNull()

        // Club cannot read private rows.
        const trades = await club.client.from('market_trades').select('id').limit(1)
        expect(trades.error).toBeNull()
        expect(trades.data).toEqual([])

        const profiles = await club.client.from('profiles').select('id')
        expect(profiles.error).toBeNull()
        expect(profiles.data?.every((row: Row) => row.id === club.id)).toBe(true)

        const series = await club.client.rpc('club_analytics_timeseries', {
          p_market_id: marketId,
          p_bucket_minutes: 5
        })
        expect(series.error).toBeNull()
        expect(series.data?.length).toBeGreaterThan(0)

        const exported = await club.client.rpc('record_club_export', {
          p_resource: 'summary',
          p_metadata: { tournament_id: tournamentId }
        })
        expect(exported.error).toBeNull()

        const audit = await admin
          .from('audit_events')
          .select('action')
          .eq('actor_id', club.id)
          .eq('action', 'club.export')
        expect(audit.data?.length).toBe(1)
      } finally {
        if (smallMarketId) await deleteMarket(smallMarketId)
        if (tournamentId) await deleteTournament(tournamentId)
        await deleteUsers([organizer, club, ...fans])
      }
    },
    TEST_TIMEOUT_MS
  )

  test(
    'a non-club user cannot call club analytics',
    async () => {
      const fan = await createUser('FAN')

      try {
        const result = await fan.client.rpc('club_analytics_summary', {
          p_tournament_id: null,
          p_match_id: null
        })
        expect(result.error?.message).toContain('club authorization required')
      } finally {
        await deleteUsers([fan])
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
