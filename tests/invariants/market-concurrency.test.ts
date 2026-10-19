/**
 * Market concurrency: the profile lock prevents a double-spend across markets,
 * and the market lock plus cooldown serialise a same-market burst.
 */
import { afterAll, describe, expect, test } from 'bun:test'
import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { randomUUID } from 'crypto'

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!URL || !KEY) {
  throw new Error(
    'NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY must be set. Run `bunx supabase db reset` first.'
  )
}

const supabase: SupabaseClient = createClient(URL, KEY)

const B = 100
const TEST_TIMEOUT_MS = 30_000

const profileIds: string[] = []
const matchIds: string[] = []

type Row = Record<string, unknown>

const num = (value: unknown): number => Number(value)

function normalize(data: unknown): Row | null {
  if (Array.isArray(data)) return (data[0] as Row) ?? null
  return (data as Row) ?? null
}

async function createProfile(points: number): Promise<string> {
  const id = randomUUID()
  const { error } = await supabase
    .from('profiles')
    .insert({ id, username: `concurrency-${id.slice(0, 8)}`, points })

  if (error) throw new Error(`Failed to create profile: ${error.message}`)
  profileIds.push(id)
  return id
}

async function createMarket(): Promise<string> {
  const matchId = randomUUID()
  const { error: matchError } = await supabase.from('matches').insert({
    id: matchId,
    home_team: 'Concurrency Home',
    away_team: 'Concurrency Away',
    status: 'LIVE',
    kickoff_time: new Date(Date.now() - 3_600_000).toISOString()
  })

  if (matchError) throw new Error(`Failed to create match: ${matchError.message}`)
  matchIds.push(matchId)

  const marketId = randomUUID()
  const { error } = await supabase
    .from('markets')
    .insert({ id: marketId, match_id: matchId, b: B })

  if (error) throw new Error(`Failed to create market: ${error.message}`)
  return marketId
}

async function openTrade(marketId: string, userId: string, outcome: string, budget: number) {
  const { data, error } = await supabase.rpc('open_trade', {
    p_market_id: marketId,
    p_user_id: userId,
    p_outcome: outcome,
    p_budget: budget
  })
  return { error, row: normalize(data) }
}

async function pointsOf(userId: string): Promise<number> {
  const { data, error } = await supabase
    .from('profiles')
    .select('points')
    .eq('id', userId)
    .single()

  if (error || !data) throw new Error(`Failed to read profile: ${error?.message ?? 'no row'}`)
  return data.points
}

async function tradesOf(marketId: string, userId: string) {
  const { data, error } = await supabase
    .from('market_trades')
    .select('kind, shares')
    .eq('market_id', marketId)
    .eq('user_id', userId)

  if (error) throw new Error(`Failed to read trades: ${error.message}`)
  return data ?? []
}

async function positionsOf(marketId: string, userId: string) {
  const { data, error } = await supabase
    .from('market_positions')
    .select('outcome, shares')
    .eq('market_id', marketId)
    .eq('user_id', userId)

  if (error) throw new Error(`Failed to read positions: ${error.message}`)
  return data ?? []
}

afterAll(async () => {
  for (const matchId of matchIds) {
    await supabase.from('matches').delete().eq('id', matchId)
  }
  for (const profileId of profileIds) {
    await supabase.from('profiles').delete().eq('id', profileId)
  }
})

describe('market concurrency (M-INV4)', () => {
  test(
    'two markets cannot spend the same balance twice',
    async () => {
      const userId = await createProfile(60)
      const firstMarket = await createMarket()
      const secondMarket = await createMarket()

      const results = await Promise.all([
        openTrade(firstMarket, userId, 'HOME', 50),
        openTrade(secondMarket, userId, 'HOME', 50)
      ])

      const accepted = results.filter((result) => result.error === null)
      const refused = results.filter((result) => result.error !== null)

      expect(accepted.length).toBe(1)
      expect(refused.length).toBe(1)
      expect(refused[0].error?.message).toContain('insufficient points')

      const balance = await pointsOf(userId)
      expect(balance).toBeGreaterThanOrEqual(0)
      expect(balance).toBe(60 - num(accepted[0].row!.cost))

      const trades =
        (await tradesOf(firstMarket, userId)).length +
        (await tradesOf(secondMarket, userId)).length
      const positions =
        (await positionsOf(firstMarket, userId)).length +
        (await positionsOf(secondMarket, userId)).length

      expect(trades).toBe(1)
      expect(positions).toBe(1)
    },
    TEST_TIMEOUT_MS
  )

  test(
    'a same-market burst accepts exactly one entry and cools the rest down',
    async () => {
      const userId = await createProfile(1000)
      const marketId = await createMarket()

      const results = await Promise.all(
        Array.from({ length: 10 }).map(() => openTrade(marketId, userId, 'HOME', 10))
      )

      const accepted = results.filter((result) => result.error === null)
      const refused = results.filter((result) => result.error !== null)

      expect(accepted.length).toBe(1)
      expect(refused.length).toBe(9)
      for (const result of refused) {
        expect(result.error?.message).toContain('cooldown')
      }

      expect(await pointsOf(userId)).toBe(1000 - num(accepted[0].row!.cost))

      const trades = await tradesOf(marketId, userId)
      expect(trades.length).toBe(1)

      const positions = await positionsOf(marketId, userId)
      expect(positions.length).toBe(1)
      expect(num(positions[0].shares)).toBeCloseTo(num(accepted[0].row!.shares), 8)
    },
    TEST_TIMEOUT_MS
  )
})
