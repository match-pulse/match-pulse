/**
 * Market concurrency: the profile lock prevents a double-spend across markets,
 * and the market lock plus cooldown serialise a same-market burst.
 *
 * The user calls the RPC with their own auth session; the database resolves the
 * identity with auth.uid().
 */
import { describe, expect, test } from 'bun:test'
import { createUser, deleteUsers, type TestUser } from '../support/auth'
import {
  createMarket,
  deleteMarket,
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
    p_budget: budget
  })
  return { error, row: normalize(data) }
}

describe('market concurrency (M-INV4)', () => {
  test(
    'two markets cannot spend the same balance twice',
    async () => {
      const user = await createUser('FAN')
      const firstMarket = await createMarket()
      const secondMarket = await createMarket()

      try {
        await setPoints(user.id, 60)

        const results = await Promise.all([
          openTrade(user, firstMarket, 'HOME', 50),
          openTrade(user, secondMarket, 'HOME', 50)
        ])

        const accepted = results.filter((result) => result.error === null)
        const refused = results.filter((result) => result.error !== null)

        expect(accepted.length).toBe(1)
        expect(refused.length).toBe(1)
        expect(refused[0].error?.message).toContain('insufficient points')

        const balance = await pointsOf(user.id)
        expect(balance).toBeGreaterThanOrEqual(0)
        expect(balance).toBe(60 - num(accepted[0].row!.cost))

        const trades =
          (await tradesOf(firstMarket, user.id)).length +
          (await tradesOf(secondMarket, user.id)).length
        const firstPosition = await positionOf(firstMarket, user.id, 'HOME')
        const secondPosition = await positionOf(secondMarket, user.id, 'HOME')
        const positions = (firstPosition ? 1 : 0) + (secondPosition ? 1 : 0)

        expect(trades).toBe(1)
        expect(positions).toBe(1)
      } finally {
        await deleteUsers([user])
        await deleteMarket(firstMarket)
        await deleteMarket(secondMarket)
      }
    },
    TEST_TIMEOUT_MS
  )

  test(
    'a same-market burst accepts exactly one entry and cools the rest down',
    async () => {
      const user = await createUser('FAN')
      const marketId = await createMarket()

      try {
        await setPoints(user.id, 1000)

        const results = await Promise.all(
          Array.from({ length: 10 }).map(() => openTrade(user, marketId, 'HOME', 10))
        )

        const accepted = results.filter((result) => result.error === null)
        const refused = results.filter((result) => result.error !== null)

        expect(accepted.length).toBe(1)
        expect(refused.length).toBe(9)
        for (const result of refused) {
          expect(result.error?.message).toContain('cooldown')
        }

        expect(await pointsOf(user.id)).toBe(1000 - num(accepted[0].row!.cost))

        const trades = await tradesOf(marketId, user.id)
        expect(trades.length).toBe(1)

        const position = await positionOf(marketId, user.id, 'HOME')
        expect(num(position!.shares)).toBeCloseTo(num(accepted[0].row!.shares), 8)
      } finally {
        await deleteUsers([user])
        await deleteMarket(marketId)
      }
    },
    TEST_TIMEOUT_MS
  )
})
