/**
 * M-INV2 — forced-failure rollback check.
 *
 * This file is run only by the fault-injection runner, after the runner has
 * installed a trigger that raises when a trade row is inserted. It proves that
 * the profile debit, position update and market update do not survive the
 * failure. It is not part of the normal `bun test` discovery.
 */
import { describe, expect, test } from 'bun:test'
import { createUser, deleteUsers } from '../support/auth'
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

function normalize(data: unknown): Row | null {
  if (Array.isArray(data)) return (data[0] as Row) ?? null
  return (data as Row) ?? null
}

describe('M-INV2 forced-failure rollback', () => {
  test(
    'a trade-insert failure leaves no partial balance, position or trade',
    async () => {
      const user = await createUser('FAN')
      const marketId = await createMarket()

      try {
        await setPoints(user.id, 100)

        const { data, error } = await user.client.rpc('open_trade', {
          p_market_id: marketId,
          p_outcome: 'HOME',
          p_budget: 10,
          p_request_id: null
        })

        expect(normalize(data)).toBeNull()
        expect(error?.message).toContain('fault injection: trade insert failed')

        expect(await pointsOf(user.id)).toBe(100)
        expect(await positionOf(marketId, user.id, 'HOME')).toBeNull()
        expect((await tradesOf(marketId, user.id)).length).toBe(0)
      } finally {
        await deleteUsers([user])
        await deleteMarket(marketId)
      }
    },
    TEST_TIMEOUT_MS
  )
})
