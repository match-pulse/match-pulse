/**
 * Market lifecycle: window, resolution payout, cooldown ladder, scope and the
 * exit exemption.
 *
 * The cooldown tests advance the gate by moving `next_entry_at` into the past
 * instead of sleeping for minutes. That manipulates the same row the RPC reads;
 * it does not bypass the RPC's gate.
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
    .insert({ id, username: `lifecycle-${id.slice(0, 8)}`, points })

  if (error) throw new Error(`Failed to create profile: ${error.message}`)
  profileIds.push(id)
  return id
}

async function createMarket(kickoffOffsetMs = -3_600_000): Promise<string> {
  const matchId = randomUUID()
  const { error: matchError } = await supabase.from('matches').insert({
    id: matchId,
    home_team: 'Lifecycle Home',
    away_team: 'Lifecycle Away',
    status: 'LIVE',
    kickoff_time: new Date(Date.now() + kickoffOffsetMs).toISOString()
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

async function resolveMarket(marketId: string, winner: string) {
  const { data, error } = await supabase.rpc('resolve_market', {
    p_market_id: marketId,
    p_winner: winner
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
    .select('b, q_home, q_draw, q_away, status, winning_outcome, resolved_at')
    .eq('id', marketId)
    .single()

  if (error || !data) throw new Error(`Failed to read market: ${error?.message ?? 'no row'}`)
  return data
}

async function positionOf(marketId: string, userId: string, outcome: string) {
  const { data, error } = await supabase
    .from('market_positions')
    .select('shares')
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
    .select('kind, shares')
    .eq('market_id', marketId)
    .eq('user_id', userId)

  if (error) throw new Error(`Failed to read trades: ${error.message}`)
  return data ?? []
}

async function cooldownOf(marketId: string, userId: string) {
  const { data, error } = await supabase
    .from('market_entry_cooldowns')
    .select('level, next_entry_at')
    .eq('market_id', marketId)
    .eq('user_id', userId)
    .single()

  if (error || !data) throw new Error(`Failed to read cooldown: ${error?.message ?? 'no row'}`)
  return data
}

async function setCooldown(
  marketId: string,
  userId: string,
  level: number,
  elapsedMs: number
) {
  const { error } = await supabase
    .from('market_entry_cooldowns')
    .update({
      level,
      next_entry_at: new Date(Date.now() - elapsedMs).toISOString()
    })
    .eq('market_id', marketId)
    .eq('user_id', userId)

  if (error) throw new Error(`Failed to advance cooldown: ${error.message}`)
}

function expectWait(nextEntryAt: string, expectedSeconds: number) {
  const seconds = (new Date(nextEntryAt).getTime() - Date.now()) / 1000
  expect(seconds).toBeGreaterThan(expectedSeconds - 3)
  expect(seconds).toBeLessThan(expectedSeconds + 3)
}

afterAll(async () => {
  for (const matchId of matchIds) {
    await supabase.from('matches').delete().eq('id', matchId)
  }
  for (const profileId of profileIds) {
    await supabase.from('profiles').delete().eq('id', profileId)
  }
})

describe('market window (M-INV1)', () => {
  test(
    'entries and exits are refused before kickoff',
    async () => {
      const marketId = await createMarket(3_600_000)
      const userId = await createProfile(100)

      const entry = await openTrade(marketId, userId, 'HOME', 10)
      expect(entry.error?.message).toContain('has not opened')

      const exit = await closeTrade(marketId, userId, 'HOME', 1)
      expect(exit.error?.message).toContain('has not opened')

      expect(await pointsOf(userId)).toBe(100)
      expect((await tradesOf(marketId, userId)).length).toBe(0)
      expect(await positionOf(marketId, userId, 'HOME')).toBeNull()
    },
    TEST_TIMEOUT_MS
  )
})

describe('market resolution (M-INV6)', () => {
  test(
    'pays winning shares once, leaves losers unpaid and closes the market terminally',
    async () => {
      const marketId = await createMarket()
      const winnerA = await createProfile(500)
      const winnerB = await createProfile(500)
      const loser = await createProfile(500)

      const entryA = await openTrade(marketId, winnerA, 'HOME', 50)
      const entryB = await openTrade(marketId, winnerB, 'HOME', 80)
      const entryL = await openTrade(marketId, loser, 'DRAW', 40)

      expect(entryA.error).toBeNull()
      expect(entryB.error).toBeNull()
      expect(entryL.error).toBeNull()

      const sharesA = num(entryA.row!.shares)
      const sharesB = num(entryB.row!.shares)
      const balanceABefore = await pointsOf(winnerA)
      const balanceBBefore = await pointsOf(winnerB)
      const balanceLBefore = await pointsOf(loser)

      const resolution = await resolveMarket(marketId, 'HOME')
      expect(resolution.error).toBeNull()
      expect(num(resolution.row!.holders)).toBe(2)
      expect(num(resolution.row!.total_points)).toBe(
        Math.floor(sharesA) + Math.floor(sharesB)
      )

      expect(await pointsOf(winnerA)).toBe(balanceABefore + Math.floor(sharesA))
      expect(await pointsOf(winnerB)).toBe(balanceBBefore + Math.floor(sharesB))
      expect(await pointsOf(loser)).toBe(balanceLBefore)

      const market = await marketOf(marketId)
      expect(market.status).toBe('RESOLVED')
      expect(market.winning_outcome).toBe('HOME')
      expect(market.resolved_at).not.toBeNull()

      const { data: payouts, error: payoutError } = await supabase
        .from('market_payouts')
        .select('user_id, shares, points')
        .eq('market_id', marketId)

      if (payoutError) throw new Error(`Failed to read payouts: ${payoutError.message}`)
      expect(payouts?.length).toBe(2)

      const afterEntry = await openTrade(marketId, winnerA, 'HOME', 10)
      expect(afterEntry.error?.message).toContain('market is not open')

      const afterExit = await closeTrade(marketId, winnerA, 'HOME', 1)
      expect(afterExit.error?.message).toContain('market is not open')

      const secondResolution = await resolveMarket(marketId, 'HOME')
      expect(secondResolution.error?.message).toContain('already resolved')
      expect(await pointsOf(winnerA)).toBe(balanceABefore + Math.floor(sharesA))

      const { data: payoutsAgain, error: payoutAgainError } = await supabase
        .from('market_payouts')
        .select('user_id')
        .eq('market_id', marketId)

      if (payoutAgainError) throw new Error(`Failed to reread payouts: ${payoutAgainError.message}`)
      expect(payoutsAgain?.length).toBe(2)
    },
    TEST_TIMEOUT_MS
  )
})

describe('entry cooldown (M-INV7)', () => {
  test(
    'applies the 5/15/30/45 ladder, caps at 600, decays and ignores refused attempts',
    async () => {
      const marketId = await createMarket()
      const userId = await createProfile(1000)

      expect((await openTrade(marketId, userId, 'HOME', 10)).error).toBeNull()

      let cooldown = await cooldownOf(marketId, userId)
      expect(cooldown.level).toBe(1)
      expectWait(cooldown.next_entry_at, 5)

      // A refused attempt must not escalate the ladder.
      const refused = await openTrade(marketId, userId, 'HOME', 10)
      expect(refused.error?.message).toContain('cooldown')

      const unchanged = await cooldownOf(marketId, userId)
      expect(unchanged.level).toBe(1)
      expect(unchanged.next_entry_at).toBe(cooldown.next_entry_at)

      await setCooldown(marketId, userId, 1, 5_000)
      expect((await openTrade(marketId, userId, 'HOME', 10)).error).toBeNull()
      cooldown = await cooldownOf(marketId, userId)
      expect(cooldown.level).toBe(2)
      expectWait(cooldown.next_entry_at, 15)

      await setCooldown(marketId, userId, 2, 5_000)
      expect((await openTrade(marketId, userId, 'HOME', 10)).error).toBeNull()
      cooldown = await cooldownOf(marketId, userId)
      expect(cooldown.level).toBe(3)
      expectWait(cooldown.next_entry_at, 30)

      await setCooldown(marketId, userId, 3, 5_000)
      expect((await openTrade(marketId, userId, 'HOME', 10)).error).toBeNull()
      cooldown = await cooldownOf(marketId, userId)
      expect(cooldown.level).toBe(4)
      expectWait(cooldown.next_entry_at, 45)

      await setCooldown(marketId, userId, 40, 5_000)
      expect((await openTrade(marketId, userId, 'HOME', 10)).error).toBeNull()
      cooldown = await cooldownOf(marketId, userId)
      expect(cooldown.level).toBe(40)
      expectWait(cooldown.next_entry_at, 600)

      // Two quiet five-minute steps decay level 10 to 8; the next wait is 15 + 7*15 = 120.
      await setCooldown(marketId, userId, 10, 605_000)
      expect((await openTrade(marketId, userId, 'HOME', 10)).error).toBeNull()
      cooldown = await cooldownOf(marketId, userId)
      expect(cooldown.level).toBe(9)
      expectWait(cooldown.next_entry_at, 120)
    },
    TEST_TIMEOUT_MS
  )

  test(
    'accepts exits while the entry cooldown is active',
    async () => {
      const marketId = await createMarket()
      const userId = await createProfile(1000)

      const entry = await openTrade(marketId, userId, 'HOME', 50)
      expect(entry.error).toBeNull()
      const shares = num(entry.row!.shares)
      const cooldownBefore = await cooldownOf(marketId, userId)
      const balanceBefore = await pointsOf(userId)

      // The next entry is gated, but selling must not be.
      const exit = await closeTrade(marketId, userId, 'HOME', shares)
      expect(exit.error).toBeNull()
      const proceeds = num(exit.row!.proceeds)
      expect(proceeds).toBeGreaterThan(0)
      expect(num(exit.row!.points_after)).toBe(balanceBefore + proceeds)
      expect(await pointsOf(userId)).toBe(balanceBefore + proceeds)

      const position = await positionOf(marketId, userId, 'HOME')
      expect(num(position!.shares)).toBe(0)

      // Exiting neither resets nor escalates the entry cooldown.
      const cooldownAfter = await cooldownOf(marketId, userId)
      expect(cooldownAfter.level).toBe(cooldownBefore.level)
      expect(cooldownAfter.next_entry_at).toBe(cooldownBefore.next_entry_at)
    },
    TEST_TIMEOUT_MS
  )

  test(
    'is scoped per user and market',
    async () => {
      const marketId = await createMarket()
      const secondMarketId = await createMarket()
      const first = await createProfile(1000)
      const second = await createProfile(1000)

      expect((await openTrade(marketId, first, 'HOME', 10)).error).toBeNull()

      // The same market does not block a different user.
      expect((await openTrade(marketId, second, 'HOME', 10)).error).toBeNull()

      // The same user is not blocked in a different market.
      expect((await openTrade(secondMarketId, first, 'HOME', 10)).error).toBeNull()
    },
    TEST_TIMEOUT_MS
  )
})
