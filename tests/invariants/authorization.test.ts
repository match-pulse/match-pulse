/**
 * Authorization boundary.
 *
 * These tests exercise the database as the anon role, as two different fans and
 * as an organizer. They verify that RLS and grants restrict reads and writes,
 * not only the UI. The service-role client is used for setup and committed-state
 * reads; it is never used by the application runtime.
 */
import { describe, expect, test } from 'bun:test'
import { randomUUID } from 'crypto'
import {
  admin,
  anonClient,
  createUser,
  deleteUsers,
  type TestUser
} from '../support/auth'
import {
  createMarket,
  createTournament,
  deleteMarket,
  deleteTournament,
  finishMatch,
  setPoints
} from '../support/fixtures'

const TEST_TIMEOUT_MS = 60_000

async function openTrade(user: TestUser, marketId: string, outcome: string, budget: number) {
  return user.client.rpc('open_trade', {
    p_market_id: marketId,
    p_outcome: outcome,
    p_budget: budget,
    p_request_id: null
  })
}

describe('authorization boundary', () => {
  test(
    'anonymous can read public data but cannot read private tables or execute mutations',
    async () => {
      const anon = anonClient()

      expect((await anon.from('tournaments').select('id').limit(1)).error).toBeNull()
      expect((await anon.from('matches').select('id').limit(1)).error).toBeNull()
      expect((await anon.from('markets').select('id').limit(1)).error).toBeNull()

      expect((await anon.from('profiles').select('id').limit(1)).error).not.toBeNull()
      expect((await anon.from('registrations').select('id').limit(1)).error).not.toBeNull()
      expect((await anon.from('market_positions').select('id').limit(1)).error).not.toBeNull()
      expect((await anon.from('market_trades').select('id').limit(1)).error).not.toBeNull()
      expect((await anon.from('market_payouts').select('id').limit(1)).error).not.toBeNull()

      expect(
        (
          await anon.from('profiles').insert({
            id: randomUUID(),
            username: 'Anon',
            points: 1
          })
        ).error
      ).not.toBeNull()

      expect(
        (
          await anon.rpc('register_for_tournament', {
            p_tournament_id: randomUUID()
          })
        ).error
      ).not.toBeNull()

      expect(
        (
          await anon.rpc('open_trade', {
            p_market_id: randomUUID(),
            p_outcome: 'HOME',
            p_budget: 1
          })
        ).error
      ).not.toBeNull()

      expect(
        (
          await anon.rpc('resolve_market', {
            p_market_id: randomUUID(),
            p_winner: 'HOME'
          })
        ).error
      ).not.toBeNull()

      // The public trade feed is readable without identity.
      expect(
        (
          await anon.rpc('market_public_trades', {
            p_market_id: randomUUID()
          })
        ).error
      ).toBeNull()
    },
    TEST_TIMEOUT_MS
  )

  test(
    'a fan can read only their own private rows',
    async () => {
      const fanA = await createUser('FAN')
      const fanB = await createUser('FAN')
      const marketId = await createMarket()

      try {
        await setPoints(fanA.id, 200)
        await setPoints(fanB.id, 200)
        expect((await openTrade(fanA, marketId, 'HOME', 10)).error).toBeNull()

        const ownProfiles = await fanA.client.from('profiles').select('id')
        expect(ownProfiles.error).toBeNull()
        expect((ownProfiles.data ?? []).map((row) => row.id)).toEqual([fanA.id])

        const otherProfile = await fanA.client
          .from('profiles')
          .select('id')
          .eq('id', fanB.id)
        expect(otherProfile.error).toBeNull()
        expect(otherProfile.data).toEqual([])

        const ownPositions = await fanA.client
          .from('market_positions')
          .select('outcome, shares')
          .eq('market_id', marketId)
        expect(ownPositions.error).toBeNull()
        expect(ownPositions.data?.length).toBe(1)

        const otherPositions = await fanB.client
          .from('market_positions')
          .select('outcome, shares')
          .eq('market_id', marketId)
        expect(otherPositions.error).toBeNull()
        expect(otherPositions.data).toEqual([])

        const ownTrades = await fanA.client
          .from('market_trades')
          .select('kind')
          .eq('market_id', marketId)
        expect(ownTrades.error).toBeNull()
        expect(ownTrades.data?.length).toBe(1)

        const otherTrades = await fanB.client
          .from('market_trades')
          .select('kind')
          .eq('market_id', marketId)
        expect(otherTrades.error).toBeNull()
        expect(otherTrades.data).toEqual([])

        const ownCooldown = await fanA.client
          .from('market_entry_cooldowns')
          .select('level')
          .eq('market_id', marketId)
        expect(ownCooldown.error).toBeNull()
        expect(ownCooldown.data?.length).toBe(1)

        const otherCooldown = await fanB.client
          .from('market_entry_cooldowns')
          .select('level')
          .eq('market_id', marketId)
        expect(otherCooldown.error).toBeNull()
        expect(otherCooldown.data).toEqual([])
      } finally {
        await deleteUsers([fanA, fanB])
        await deleteMarket(marketId)
      }
    },
    TEST_TIMEOUT_MS
  )

  test(
    'a fan cannot resolve a market; an organizer can',
    async () => {
      const fan = await createUser('FAN')
      const organizer = await createUser('ORGANIZER')
      const marketId = await createMarket()

      try {
        const refused = await fan.client.rpc('resolve_market', {
          p_market_id: marketId,
          p_winner: 'HOME'
        })
        expect(refused.error?.message).toContain('organizer authorization required')

        await finishMatch(marketId, 1, 0)

        const resolved = await organizer.client.rpc('resolve_market', {
          p_market_id: marketId,
          p_winner: 'HOME'
        })
        expect(resolved.error).toBeNull()

        const { data: market, error } = await admin
          .from('markets')
          .select('status, winning_outcome')
          .eq('id', marketId)
          .single()

        if (error || !market) {
          throw new Error(`Failed to read market: ${error?.message ?? 'no row'}`)
        }

        expect(market.status).toBe('RESOLVED')
        expect(market.winning_outcome).toBe('HOME')
      } finally {
        await deleteUsers([fan, organizer])
        await deleteMarket(marketId)
      }
    },
    TEST_TIMEOUT_MS
  )

  test(
    'direct table writes are denied for an authenticated fan',
    async () => {
      const fan = await createUser('FAN')
      const tournamentId = await createTournament()
      const marketId = await createMarket()

      try {
        expect(
          (
            await fan.client
              .from('profiles')
              .update({ points: 9999 })
              .eq('id', fan.id)
          ).error
        ).not.toBeNull()

        expect(
          (
            await fan.client
              .from('tournaments')
              .update({ max_capacity: 1 })
              .eq('id', tournamentId)
          ).error
        ).not.toBeNull()

        expect(
          (
            await fan.client
              .from('markets')
              .update({ q_home: 1 })
              .eq('id', marketId)
          ).error
        ).not.toBeNull()

        expect(
          (
            await fan.client.from('market_trades').insert({
              market_id: marketId,
              user_id: fan.id,
              outcome: 'HOME',
              kind: 'BUY',
              shares: 1,
              cost_points: 1,
              proceeds_points: 0,
              price_before: 0.5,
              price_after: 0.5,
              points_after: 199
            })
          ).error
        ).not.toBeNull()
      } finally {
        await deleteUsers([fan])
        await deleteTournament(tournamentId)
        await deleteMarket(marketId)
      }
    },
    TEST_TIMEOUT_MS
  )

  test(
    'the public trade feed exposes trades without identity',
    async () => {
      const fan = await createUser('FAN')
      const marketId = await createMarket()

      try {
        await setPoints(fan.id, 200)
        expect((await openTrade(fan, marketId, 'HOME', 10)).error).toBeNull()

        const anon = anonClient()
        const { data: trades, error } = await anon.rpc('market_public_trades', {
          p_market_id: marketId
        })

        expect(error).toBeNull()
        expect(trades?.length).toBe(1)
        expect('user_id' in (trades?.[0] ?? {})).toBe(false)
        expect('points_after' in (trades?.[0] ?? {})).toBe(false)

        expect((await anon.from('market_trades').select('id').limit(1)).error).not.toBeNull()
      } finally {
        await deleteUsers([fan])
        await deleteMarket(marketId)
      }
    },
    TEST_TIMEOUT_MS
  )

  test(
    'anonymous sign-in is disabled',
    async () => {
      const anon = anonClient()
      const { data, error } = await anon.auth.signInAnonymously()

      expect(error).not.toBeNull()
      expect(data.session).toBeNull()
    },
    TEST_TIMEOUT_MS
  )

  test(
    'trade request rows are owner-only and direct writes are denied',
    async () => {
      const fanA = await createUser('FAN')
      const fanB = await createUser('FAN')
      const marketId = await createMarket()
      const requestId = randomUUID()

      try {
        await setPoints(fanA.id, 200)
        const opened = await fanA.client.rpc('open_trade', {
          p_market_id: marketId,
          p_outcome: 'HOME',
          p_budget: 10,
          p_request_id: requestId
        })
        expect(opened.error).toBeNull()

        const own = await fanA.client
          .from('trade_requests')
          .select('request_id, status')
          .eq('request_id', requestId)
        expect(own.error).toBeNull()
        expect(own.data?.length).toBe(1)

        const other = await fanB.client
          .from('trade_requests')
          .select('request_id')
          .eq('request_id', requestId)
        expect(other.error).toBeNull()
        expect(other.data).toEqual([])

        const anon = anonClient()
        expect((await anon.from('trade_requests').select('request_id').limit(1)).error).not.toBeNull()

        expect(
          (
            await fanA.client.from('trade_requests').insert({
              user_id: fanA.id,
              request_id: randomUUID(),
              kind: 'OPEN',
              market_id: marketId,
              outcome: 'HOME',
              budget: 10
            })
          ).error
        ).not.toBeNull()

        expect(
          (
            await fanA.client
              .from('trade_requests')
              .update({ status: 'COMPLETED' })
              .eq('request_id', requestId)
          ).error
        ).not.toBeNull()

        expect(
          (
            await fanA.client
              .from('trade_requests')
              .delete()
              .eq('request_id', requestId)
          ).error
        ).not.toBeNull()
      } finally {
        await deleteUsers([fanA, fanB])
        await deleteMarket(marketId)
      }
    },
    TEST_TIMEOUT_MS
  )
})
