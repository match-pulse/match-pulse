/**
 * Market engine pricing and accounting.
 *
 * Every mutation goes through an authenticated user client. Setup and reads use
 * the service-role admin client so the assertions see committed state rather
 * than what RLS allows the user to see.
 */
import { describe, expect, test } from 'bun:test'
import { admin, createUser, deleteUsers, type TestUser } from '../support/auth'
import {
  B,
  createMarket,
  deleteMarket,
  marketOf,
  pointsOf,
  positionOf,
  setPoints,
  tradesOf
} from '../support/fixtures'

const TEST_TIMEOUT_MS = 60_000

type Row = Record<string, unknown>

const num = (value: unknown): number => Number(value)

function normalize(data: unknown): Row | null {
  if (Array.isArray(data)) return (data[0] as Row) ?? null
  return (data as Row) ?? null
}

async function openTrade(user: TestUser, marketId: string, outcome: string, budget: number) {
  const { data, error } = await user.client.rpc('open_trade', {
    p_market_id: marketId,
    p_outcome: outcome,
    p_budget: budget,
    p_request_id: null
  })
  return { error, row: normalize(data) }
}

async function closeTrade(user: TestUser, marketId: string, outcome: string, shares: number) {
  const { data, error } = await user.client.rpc('close_trade', {
    p_market_id: marketId,
    p_outcome: outcome,
    p_shares: shares,
    p_request_id: null
  })
  return { error, row: normalize(data) }
}

async function costOf(marketId: string): Promise<number> {
  const market = await marketOf(marketId)
  const { data, error } = await admin.rpc('market_cost', {
    p_b: market.b,
    p_q_home: market.q_home,
    p_q_draw: market.q_draw,
    p_q_away: market.q_away
  })

  if (error) throw new Error(`Failed to read cost: ${error.message}`)
  return num(data)
}

describe('market pricing (M-INV2, M-INV8)', () => {
  test(
    'LMSR prices are uniform at rest and sum to one',
    async () => {
      const marketId = await createMarket()

      try {
        const { data: price, error } = await admin.rpc('market_price', {
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
      } finally {
        await deleteMarket(marketId)
      }
    },
    TEST_TIMEOUT_MS
  )

  test(
    'an entry is budget-bounded, ceil-debited and written atomically',
    async () => {
      const user = await createUser('FAN')
      const marketId = await createMarket()

      try {
        await setPoints(user.id, 200)
        const costBefore = await costOf(marketId)

        const { error, row } = await openTrade(user, marketId, 'HOME', 50)
        expect(error).toBeNull()
        expect(row).not.toBeNull()

        const shares = num(row!.shares)
        const cost = num(row!.cost)
        const costAfter = await costOf(marketId)

        expect(shares).toBeGreaterThan(0)
        expect(cost).toBeGreaterThan(0)
        expect(cost).toBeLessThanOrEqual(50)

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
        expect(await pointsOf(user.id)).toBe(200 - cost)

        const position = await positionOf(marketId, user.id, 'HOME')
        expect(num(position?.shares)).toBeCloseTo(shares, 8)
        expect(num(position?.cost_basis)).toBe(cost)

        const trades = await tradesOf(marketId, user.id)
        expect(trades.length).toBe(1)
        expect(trades[0].kind).toBe('BUY')
        expect(num(trades[0].shares)).toBeCloseTo(shares, 8)
        expect(trades[0].cost_points).toBe(cost)
        expect(trades[0].proceeds_points).toBe(0)
      } finally {
        await deleteUsers([user])
        await deleteMarket(marketId)
      }
    },
    TEST_TIMEOUT_MS
  )
})

describe('market exits (M-INV2, M-INV3, M-INV8)', () => {
  test(
    'a position opened before the price rises exits at a proportional profit',
    async () => {
      const trader = await createUser('FAN')
      const other = await createUser('FAN')
      const marketId = await createMarket()

      try {
        await setPoints(trader.id, 200)
        await setPoints(other.id, 200)

        const entry = await openTrade(trader, marketId, 'HOME', 50)
        expect(entry.error).toBeNull()
        const shares = num(entry.row!.shares)
        const cost = num(entry.row!.cost)

        // Re-entry is refused while the cooldown is active; refused attempts write nothing.
        const retry = await openTrade(trader, marketId, 'HOME', 5)
        expect(retry.error?.message).toContain('cooldown')

        const push = await openTrade(other, marketId, 'HOME', 20)
        expect(push.error).toBeNull()

        const market = await marketOf(marketId)
        expect(num(market.q_home)).toBeGreaterThan(shares)

        const costBeforeExit = await costOf(marketId)
        const exit = await closeTrade(trader, marketId, 'HOME', shares)
        expect(exit.error).toBeNull()

        const costAfterExit = await costOf(marketId)
        const proceeds = num(exit.row!.proceeds)
        const difference = costBeforeExit - costAfterExit

        expect(proceeds).toBeLessThanOrEqual(difference + 1e-9)
        expect(proceeds).toBeGreaterThan(difference - 1)
        expect(proceeds).toBeGreaterThan(cost)

        expect(await pointsOf(trader.id)).toBe(200 - cost + proceeds)

        const trades = await tradesOf(marketId, trader.id)
        expect(trades.map((trade) => trade.kind)).toEqual(['BUY', 'SELL'])

        const position = await positionOf(marketId, trader.id, 'HOME')
        expect(num(position?.shares)).toBe(0)
      } finally {
        await deleteUsers([trader, other])
        await deleteMarket(marketId)
      }
    },
    TEST_TIMEOUT_MS
  )

  test(
    'a position opened after the price rises exits at a proportional loss, not the whole stake',
    async () => {
      const trader = await createUser('FAN')
      const bull = await createUser('FAN')
      const bear = await createUser('FAN')
      const marketId = await createMarket()

      try {
        await setPoints(trader.id, 1000)
        await setPoints(bull.id, 2000)
        await setPoints(bear.id, 2000)

        expect((await openTrade(bull, marketId, 'HOME', 200)).error).toBeNull()

        const entry = await openTrade(trader, marketId, 'HOME', 100)
        expect(entry.error).toBeNull()
        const shares = num(entry.row!.shares)
        const cost = num(entry.row!.cost)

        expect((await openTrade(bear, marketId, 'DRAW', 300)).error).toBeNull()

        const exit = await closeTrade(trader, marketId, 'HOME', shares)
        expect(exit.error).toBeNull()
        const proceeds = num(exit.row!.proceeds)

        expect(proceeds).toBeGreaterThan(0)
        expect(proceeds).toBeLessThan(cost)
        expect(await pointsOf(trader.id)).toBe(1000 - cost + proceeds)
      } finally {
        await deleteUsers([trader, bull, bear])
        await deleteMarket(marketId)
      }
    },
    TEST_TIMEOUT_MS
  )
})

describe('market refusals and bookkeeping (M-INV3, M-INV5)', () => {
  test(
    'over-selling and an unaffordable entry are refused without partial writes',
    async () => {
      const trader = await createUser('FAN')
      const drawHolder = await createUser('FAN')
      const awayHolder = await createUser('FAN')
      const poor = await createUser('FAN')
      const marketId = await createMarket()

      try {
        await setPoints(trader.id, 200)
        await setPoints(drawHolder.id, 200)
        await setPoints(awayHolder.id, 200)
        await setPoints(poor.id, 1)

        expect((await openTrade(trader, marketId, 'HOME', 10)).error).toBeNull()
        expect((await openTrade(drawHolder, marketId, 'DRAW', 10)).error).toBeNull()
        expect((await openTrade(awayHolder, marketId, 'AWAY', 10)).error).toBeNull()

        const held = num((await positionOf(marketId, trader.id, 'HOME'))?.shares)
        const balanceBefore = await pointsOf(trader.id)

        const oversell = await closeTrade(trader, marketId, 'HOME', held + 1)
        expect(oversell.error?.message).toContain('insufficient shares')
        expect(await pointsOf(trader.id)).toBe(balanceBefore)
        expect(num((await positionOf(marketId, trader.id, 'HOME'))?.shares)).toBeCloseTo(held, 8)
        expect((await tradesOf(marketId, trader.id)).length).toBe(1)

        const unaffordable = await openTrade(poor, marketId, 'HOME', 100)
        expect(unaffordable.error?.message).toContain('insufficient points')
        expect(await pointsOf(poor.id)).toBe(1)
        expect(await positionOf(marketId, poor.id, 'HOME')).toBeNull()
        expect((await tradesOf(marketId, poor.id)).length).toBe(0)

        // M-INV5: held shares equal the market's outstanding quantity per outcome.
        const market = await marketOf(marketId)
        const { data: positions, error } = await admin
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
      } finally {
        await deleteUsers([trader, drawHolder, awayHolder, poor])
        await deleteMarket(marketId)
      }
    },
    TEST_TIMEOUT_MS
  )
})
