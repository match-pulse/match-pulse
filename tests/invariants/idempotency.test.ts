/**
 * M-INV9 — request-key idempotency for entry and exit.
 *
 * A completed request replays the recorded trade; the same key with a different
 * payload is refused. The request and the trade commit or roll back together.
 */
import { describe, expect, test } from 'bun:test'
import { randomUUID } from 'crypto'
import { admin, createUser, deleteUsers, type TestUser } from '../support/auth'
import {
  createMarket,
  deleteMarket,
  pointsOf,
  positionOf,
  setCooldown,
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

async function openTrade(
  user: TestUser,
  marketId: string,
  outcome: string,
  budget: number,
  requestId: string
) {
  const { data, error } = await user.client.rpc('open_trade', {
    p_market_id: marketId,
    p_outcome: outcome,
    p_budget: budget,
    p_request_id: requestId
  })
  return { error, row: normalize(data) }
}

async function closeTrade(
  user: TestUser,
  marketId: string,
  outcome: string,
  shares: number,
  requestId: string
) {
  const { data, error } = await user.client.rpc('close_trade', {
    p_market_id: marketId,
    p_outcome: outcome,
    p_shares: shares,
    p_request_id: requestId
  })
  return { error, row: normalize(data) }
}

async function requestRow(userId: string, requestId: string) {
  const { data, error } = await admin
    .from('trade_requests')
    .select('kind, market_id, outcome, budget, shares, status, trade_id')
    .eq('user_id', userId)
    .eq('request_id', requestId)
    .maybeSingle()

  if (error) throw new Error(`Failed to read trade request: ${error.message}`)
  return data
}

describe('M-INV9 request-key idempotency', () => {
  test(
    'replays a completed entry without a second debit or trade',
    async () => {
      const user = await createUser('FAN')
      const marketId = await createMarket()
      const requestId = randomUUID()

      try {
        await setPoints(user.id, 200)

        const first = await openTrade(user, marketId, 'HOME', 10, requestId)
        expect(first.error).toBeNull()
        expect(first.row).not.toBeNull()

        const second = await openTrade(user, marketId, 'HOME', 10, requestId)
        expect(second.error).toBeNull()
        expect(num(second.row!.shares)).toBeCloseTo(num(first.row!.shares), 8)
        expect(num(second.row!.cost)).toBe(num(first.row!.cost))
        expect(num(second.row!.points_after)).toBe(num(first.row!.points_after))

        expect(await pointsOf(user.id)).toBe(200 - num(first.row!.cost))
        expect((await tradesOf(marketId, user.id)).length).toBe(1)
        expect(num((await positionOf(marketId, user.id, 'HOME'))!.shares)).toBeCloseTo(
          num(first.row!.shares),
          8
        )

        const stored = await requestRow(user.id, requestId)
        expect(stored?.status).toBe('COMPLETED')
        expect(stored?.kind).toBe('OPEN')
        expect(stored?.trade_id).not.toBeNull()
      } finally {
        await deleteUsers([user])
        await deleteMarket(marketId)
      }
    },
    TEST_TIMEOUT_MS
  )

  test(
    'serialises concurrent duplicate entries into one trade',
    async () => {
      const user = await createUser('FAN')
      const marketId = await createMarket()
      const requestId = randomUUID()

      try {
        await setPoints(user.id, 200)

        const results = await Promise.all(
          Array.from({ length: 5 }).map(() => openTrade(user, marketId, 'HOME', 10, requestId))
        )

        expect(results.filter((result) => result.error !== null)).toEqual([])
        const shares = results.map((result) => num(result.row!.shares))
        const costs = results.map((result) => num(result.row!.cost))

        expect(new Set(shares.map((value) => value.toFixed(8))).size).toBe(1)
        expect(new Set(costs).size).toBe(1)

        expect(await pointsOf(user.id)).toBe(200 - costs[0])
        expect((await tradesOf(marketId, user.id)).length).toBe(1)
        expect(num((await positionOf(marketId, user.id, 'HOME'))!.shares)).toBeCloseTo(
          shares[0],
          8
        )
      } finally {
        await deleteUsers([user])
        await deleteMarket(marketId)
      }
    },
    TEST_TIMEOUT_MS
  )

  test(
    'refuses a reused key with a different entry payload',
    async () => {
      const user = await createUser('FAN')
      const marketId = await createMarket()
      const requestId = randomUUID()

      try {
        await setPoints(user.id, 200)

        const first = await openTrade(user, marketId, 'HOME', 10, requestId)
        expect(first.error).toBeNull()
        const balanceAfterFirst = await pointsOf(user.id)

        const mismatch = await openTrade(user, marketId, 'HOME', 20, requestId)
        expect(mismatch.error?.message).toContain('request id reused with a different payload')

        expect(await pointsOf(user.id)).toBe(balanceAfterFirst)
        expect((await tradesOf(marketId, user.id)).length).toBe(1)
      } finally {
        await deleteUsers([user])
        await deleteMarket(marketId)
      }
    },
    TEST_TIMEOUT_MS
  )

  test(
    'replays after the cooldown would have allowed a new entry, and a new key is accepted',
    async () => {
      const user = await createUser('FAN')
      const marketId = await createMarket()
      const firstRequest = randomUUID()
      const secondRequest = randomUUID()

      try {
        await setPoints(user.id, 1000)

        const first = await openTrade(user, marketId, 'HOME', 10, firstRequest)
        expect(first.error).toBeNull()
        const balanceAfterFirst = await pointsOf(user.id)

        // Advance the cooldown into the past, so a new key would be accepted.
        await setCooldown(marketId, user.id, 1, 5_000)

        const replay = await openTrade(user, marketId, 'HOME', 10, firstRequest)
        expect(replay.error).toBeNull()
        expect(await pointsOf(user.id)).toBe(balanceAfterFirst)
        expect((await tradesOf(marketId, user.id)).length).toBe(1)

        const newEntry = await openTrade(user, marketId, 'HOME', 10, secondRequest)
        expect(newEntry.error).toBeNull()
        expect((await tradesOf(marketId, user.id)).length).toBe(2)
        expect(await pointsOf(user.id)).toBe(balanceAfterFirst - num(newEntry.row!.cost))
      } finally {
        await deleteUsers([user])
        await deleteMarket(marketId)
      }
    },
    TEST_TIMEOUT_MS
  )

  test(
    'replays a completed exit without selling twice',
    async () => {
      const user = await createUser('FAN')
      const marketId = await createMarket()
      const entryRequest = randomUUID()
      const exitRequest = randomUUID()

      try {
        await setPoints(user.id, 200)

        const entry = await openTrade(user, marketId, 'HOME', 50, entryRequest)
        expect(entry.error).toBeNull()
        const shares = num(entry.row!.shares)

        const first = await closeTrade(user, marketId, 'HOME', shares, exitRequest)
        expect(first.error).toBeNull()
        const balanceAfterFirst = await pointsOf(user.id)
        const proceeds = num(first.row!.proceeds)

        const second = await closeTrade(user, marketId, 'HOME', shares, exitRequest)
        expect(second.error).toBeNull()
        expect(num(second.row!.proceeds)).toBe(proceeds)
        expect(num(second.row!.points_after)).toBe(num(first.row!.points_after))
        expect(await pointsOf(user.id)).toBe(balanceAfterFirst)

        const trades = await tradesOf(marketId, user.id)
        expect(trades.filter((trade) => trade.kind === 'SELL').length).toBe(1)
        expect(trades.length).toBe(2)
        expect(num((await positionOf(marketId, user.id, 'HOME'))!.shares)).toBe(0)
      } finally {
        await deleteUsers([user])
        await deleteMarket(marketId)
      }
    },
    TEST_TIMEOUT_MS
  )

  test(
    'refuses a reused exit key with different shares',
    async () => {
      const user = await createUser('FAN')
      const marketId = await createMarket()
      const entryRequest = randomUUID()
      const exitRequest = randomUUID()

      try {
        await setPoints(user.id, 200)

        const entry = await openTrade(user, marketId, 'HOME', 50, entryRequest)
        expect(entry.error).toBeNull()
        const shares = num(entry.row!.shares)

        const first = await closeTrade(user, marketId, 'HOME', shares, exitRequest)
        expect(first.error).toBeNull()

        const mismatch = await closeTrade(user, marketId, 'HOME', shares / 2, exitRequest)
        expect(mismatch.error?.message).toContain('request id reused with a different payload')

        const sells = (await tradesOf(marketId, user.id)).filter((trade) => trade.kind === 'SELL')
        expect(sells.length).toBe(1)
      } finally {
        await deleteUsers([user])
        await deleteMarket(marketId)
      }
    },
    TEST_TIMEOUT_MS
  )
})
