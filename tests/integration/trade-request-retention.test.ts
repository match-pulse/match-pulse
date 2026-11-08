import { describe, expect, test } from 'bun:test'
import { randomUUID } from 'crypto'
import { admin, createUser, deleteUsers, type TestUser } from '../support/auth'
import { createMarket, deleteMarket } from '../support/fixtures'

const TEST_TIMEOUT_MS = 60_000

async function openTrade(user: TestUser, marketId: string, requestId: string) {
  return user.client.rpc('open_trade', {
    p_market_id: marketId,
    p_outcome: 'HOME',
    p_budget: 10,
    p_request_id: requestId
  })
}

describe('trade request retention', () => {
  test(
    'deletes only completed requests older than the retention window',
    async () => {
      const user = await createUser('FAN')
      const oldMarketId = await createMarket()
      const recentMarketId = await createMarket()
      const oldRequest = randomUUID()
      const recentRequest = randomUUID()

      try {
        await admin.from('profiles').update({ points: 200 }).eq('id', user.id)
        expect((await openTrade(user, oldMarketId, oldRequest)).error).toBeNull()
        expect((await openTrade(user, recentMarketId, recentRequest)).error).toBeNull()

        await admin
          .from('trade_requests')
          .update({ completed_at: new Date(Date.now() - 31 * 24 * 60 * 60 * 1000).toISOString() })
          .eq('user_id', user.id)
          .eq('request_id', oldRequest)

        const cleanup = await admin.rpc('cleanup_completed_trade_requests', {
          p_retention: '30 days'
        })
        expect(cleanup.error).toBeNull()
        expect(Number(cleanup.data)).toBe(1)

        const { data: oldRow } = await admin
          .from('trade_requests')
          .select('request_id')
          .eq('request_id', oldRequest)
        expect(oldRow).toEqual([])

        const { data: recentRow } = await admin
          .from('trade_requests')
          .select('request_id')
          .eq('request_id', recentRequest)
        expect(recentRow?.length).toBe(1)

        const denied = await user.client.rpc('cleanup_completed_trade_requests', {
          p_retention: '30 days'
        })
        expect(denied.error).not.toBeNull()
      } finally {
        await deleteUsers([user])
        await deleteMarket(oldMarketId)
        await deleteMarket(recentMarketId)
      }
    },
    TEST_TIMEOUT_MS
  )
})
