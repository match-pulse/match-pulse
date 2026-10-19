/**
 * Market engine pricing and accounting.
 *
 * These tests assert committed state, not only RPC responses: balances,
 * positions, trade rows and the market's outstanding quantity are read back
 * from the database. The owner scenarios are the two economic claims: profit
 * when the market moves in your favour, proportional loss when it moves
 * against you.
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
    .insert({ id, username: `market-${id.slice(0, 8)}`, points })

  if (error) throw new Error(`Failed to create profile: ${error.message}`)
  profileIds.push(id)
  return id
}

async function createMarket(): Promise<string> {
  const matchId = randomUUID()
  const { error: matchError } = await supabase.from('matches').insert({
    id: matchId,
    home_team: 'Engine Test Home',
    away_team: 'Engine Test Away',
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

async function closeTrade(marketId: string, userId: string, outcome: string, shares: number) {
  const { data, error } = await supabase.rpc('close_trade', {
    p_market_id: marketId,
    p_user_id: userId,
    p_outcome: outcome,
    p_shares: shares
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

async function marketOf(marketId: string) {
  const { data, error } = await supabase
    .from('markets')
    .select('b, q_home, q_draw, q_away, status')
    .eq('id', marketId)
    .single()

  if (error || !data) throw new Error(`Failed to read market: ${error?.message ?? 'no row'}`)
  return data
}

async function costOf(marketId: string): Promise<number> {
  const market = await marketOf(marketId)
  const { data, error } = await supabase.rpc('market_cost', {
    p_b: market.b,
    p_q_home: market.q_home,
    p_q_draw: market.q_draw,
    p_q_away: market.q_away
  })

  if (error) throw new Error(`Failed to read cost: ${error.message}`)
  return num(data)
}

async function positionOf(marketId: string, userId: string, outcome: string) {
  const { data, error } = await supabase
    .from('market_positions')
    .select('shares, cost_basis')
    .eq('market_id', marketId)
    .eq('user_id', userId)
    .eq('outcome', outcome)
    .maybeSingle()

  if (error) throw new Error(`Failed to read position: ${error.message}`)
  return data
}

async function tradesOf(marketId: string, userId: string) {
  const { data, error } = await supabase
    .from('market_trades')
    .select('kind, outcome, shares, cost_points, proceeds_points')
    .eq('market_id', marketId)
    .eq('user_id', userId)
    .order('created_at', { ascending: true })

  if (error) throw new Error(`Failed to read trades: ${error.message}`)
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

describe('market pricing (M-INV2, M-INV8)', () => {
  test(
    'LMSR prices are uniform at rest and sum to one',
    async () => {
      const marketId = await createMarket()

      const { data: price, error } = await supabase.rpc('market_price', {
        p_q: 0,
        p_b: B,
        p_q_home: 0,
        p_q_draw: 0,
        p_q_away: 0
      })

      expect(error).toBeNull()
      expect(num(price)).toBeCloseTo(1 / 3, 12)
      expect(3 * num(price)).toBeCloseTo(1, 12)
      expect(await costOf(marketId)).toBeCloseTo(B * Math.log(3), 9)
    },
    TEST_TIMEOUT_MS
  )

  test(
    'an entry is budget-bounded, ceil-debited and written atomically',
    async () => {
      const userId = await createProfile(200)
      const marketId = await createMarket()
      const costBefore = await costOf(marketId)

      const { error, row } = await openTrade(marketId, userId, 'HOME', 50)
      expect(error).toBeNull()
      expect(row).not.toBeNull()

      const shares = num(row!.shares)
      const cost = num(row!.cost)
      const costAfter = await costOf(marketId)

      expect(shares).toBeGreaterThan(0)
      expect(cost).toBeGreaterThan(0)
      expect(cost).toBeLessThanOrEqual(50)

      // ceil: the integer debit is the smallest whole number at or above the cost.
      const costDifference = costAfter - costBefore
      expect(cost).toBeGreaterThanOrEqual(costDifference - 1e-9)
      expect(cost).toBeLessThan(costDifference + 1)

      expect(num(row!.price_before)).toBeCloseTo(1 / 3, 9)
      expect(num(row!.price_after)).toBeGreaterThan(num(row!.price_before))
      expect(num(row!.price_after)).toBeLessThan(1)

      const market = await marketOf(marketId)
      expect(num(market.q_home)).toBeCloseTo(shares, 8)
      expect(num(market.q_draw)).toBe(0)
      expect(num(market.q_away)).toBe(0)
      expect(await pointsOf(userId)).toBe(200 - cost)

      const position = await positionOf(marketId, userId, 'HOME')
      expect(num(position?.shares)).toBeCloseTo(shares, 8)
      expect(num(position?.cost_basis)).toBe(cost)

      const trades = await tradesOf(marketId, userId)
      expect(trades.length).toBe(1)
      expect(trades[0].kind).toBe('BUY')
      expect(num(trades[0].shares)).toBeCloseTo(shares, 8)
      expect(trades[0].cost_points).toBe(cost)
      expect(trades[0].proceeds_points).toBe(0)
    },
    TEST_TIMEOUT_MS
  )
})

describe('market exits (M-INV2, M-INV3, M-INV8)', () => {
  test(
    'a position opened before the price rises exits at a proportional profit',
    async () => {
      const trader = await createProfile(200)
      const other = await createProfile(200)
      const marketId = await createMarket()

      const entry = await openTrade(marketId, trader, 'HOME', 50)
      expect(entry.error).toBeNull()
      const shares = num(entry.row!.shares)
      const cost = num(entry.row!.cost)

      // Re-entry is refused while the cooldown is active; refused attempts write nothing.
      const retry = await openTrade(marketId, trader, 'HOME', 5)
      expect(retry.error?.message).toContain('cooldown')

      const push = await openTrade(marketId, other, 'HOME', 20)
      expect(push.error).toBeNull()

      const market = await marketOf(marketId)
      expect(num(market.q_home)).toBeGreaterThan(shares)

      const costBeforeExit = await costOf(marketId)
      const exit = await closeTrade(marketId, trader, 'HOME', shares)
      expect(exit.error).toBeNull()

      const costAfterExit = await costOf(marketId)
      const proceeds = num(exit.row!.proceeds)
      const difference = costBeforeExit - costAfterExit

      // floor: the integer credit is the largest whole number at or below the proceeds.
      expect(proceeds).toBeLessThanOrEqual(difference + 1e-9)
      expect(proceeds).toBeGreaterThan(difference - 1)

      expect(proceeds).toBeGreaterThan(cost)
      expect(await pointsOf(trader)).toBe(200 - cost + proceeds)

      const trades = await tradesOf(marketId, trader)
      expect(trades.map((trade) => trade.kind)).toEqual(['BUY', 'SELL'])

      const position = await positionOf(marketId, trader, 'HOME')
      expect(num(position?.shares)).toBe(0)
    },
    TEST_TIMEOUT_MS
  )

  test(
    'a position opened after the price rises exits at a proportional loss, not the whole stake',
    async () => {
      const trader = await createProfile(1000)
      const bull = await createProfile(2000)
      const bear = await createProfile(2000)
      const marketId = await createMarket()

      expect((await openTrade(marketId, bull, 'HOME', 200)).error).toBeNull()

      const entry = await openTrade(marketId, trader, 'HOME', 100)
      expect(entry.error).toBeNull()
      const shares = num(entry.row!.shares)
      const cost = num(entry.row!.cost)

      expect((await openTrade(marketId, bear, 'DRAW', 300)).error).toBeNull()

      const exit = await closeTrade(marketId, trader, 'HOME', shares)
      expect(exit.error).toBeNull()
      const proceeds = num(exit.row!.proceeds)

      expect(proceeds).toBeGreaterThan(0)
      expect(proceeds).toBeLessThan(cost)
      expect(await pointsOf(trader)).toBe(1000 - cost + proceeds)
    },
    TEST_TIMEOUT_MS
  )
})

describe('market refusals and bookkeeping (M-INV3, M-INV5)', () => {
  test(
    'over-selling and an unaffordable entry are refused without partial writes',
    async () => {
      const trader = await createProfile(200)
      const drawHolder = await createProfile(200)
      const awayHolder = await createProfile(200)
      const poor = await createProfile(1)
      const marketId = await createMarket()

      expect((await openTrade(marketId, trader, 'HOME', 10)).error).toBeNull()
      expect((await openTrade(marketId, drawHolder, 'DRAW', 10)).error).toBeNull()
      expect((await openTrade(marketId, awayHolder, 'AWAY', 10)).error).toBeNull()

      const held = num((await positionOf(marketId, trader, 'HOME'))?.shares)
      const balanceBefore = await pointsOf(trader)

      const oversell = await closeTrade(marketId, trader, 'HOME', held + 1)
      expect(oversell.error?.message).toContain('insufficient shares')
      expect(await pointsOf(trader)).toBe(balanceBefore)
      expect(num((await positionOf(marketId, trader, 'HOME'))?.shares)).toBeCloseTo(held, 8)
      expect((await tradesOf(marketId, trader)).length).toBe(1)

      const unaffordable = await openTrade(marketId, poor, 'HOME', 100)
      expect(unaffordable.error?.message).toContain('insufficient points')
      expect(await pointsOf(poor)).toBe(1)
      expect(await positionOf(marketId, poor, 'HOME')).toBeNull()
      expect((await tradesOf(marketId, poor)).length).toBe(0)

      // M-INV5: held shares equal the market's outstanding quantity per outcome.
      const market = await marketOf(marketId)
      const { data: positions, error } = await supabase
        .from('market_positions')
        .select('outcome, shares')
        .eq('market_id', marketId)

      if (error) throw new Error(`Failed to read positions: ${error.message}`)

      const sums = { HOME: 0, DRAW: 0, AWAY: 0 } as Record<string, number>
      for (const position of positions ?? []) {
        sums[position.outcome] += num(position.shares)
      }

      expect(sums.HOME).toBeCloseTo(num(market.q_home), 8)
      expect(sums.DRAW).toBeCloseTo(num(market.q_draw), 8)
      expect(sums.AWAY).toBeCloseTo(num(market.q_away), 8)
    },
    TEST_TIMEOUT_MS
  )
})
