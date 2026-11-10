/**
 * Market lifecycle: window, resolution payout, cooldown ladder, scope and the
 * exit exemption.
 *
 * Every mutation goes through an authenticated user client. The admin client is
 * used for setup, committed-state reads and the controlled cooldown advance.
 */
import { describe, expect, test } from 'bun:test'
import { admin, createUser, deleteUsers, type TestUser } from '../support/auth'
import {
  cooldownOf,
  createMarket,
  deleteMarket,
  finishMatch,
  marketOf,
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

async function resolveMarket(organizer: TestUser, marketId: string, winner: string) {
  const { data, error } = await organizer.client.rpc('resolve_market', {
    p_market_id: marketId,
    p_winner: winner
  })
  return { error, row: normalize(data) }
}

function expectWait(nextEntryAt: string, expectedSeconds: number) {
  const seconds = (new Date(nextEntryAt).getTime() - Date.now()) / 1000
  expect(seconds).toBeGreaterThan(expectedSeconds - 3)
  expect(seconds).toBeLessThan(expectedSeconds + 3)
}

describe('market window (M-INV1)', () => {
  test(
    'entries and exits are refused before kickoff',
    async () => {
      const user = await createUser('FAN')
      const marketId = await createMarket(3_600_000)

      try {
        await setPoints(user.id, 100)

        const entry = await openTrade(user, marketId, 'HOME', 10)
        expect(entry.error?.message).toContain('has not opened')

        const exit = await closeTrade(user, marketId, 'HOME', 1)
        expect(exit.error?.message).toContain('has not opened')

        expect(await pointsOf(user.id)).toBe(100)
        expect((await tradesOf(marketId, user.id)).length).toBe(0)
        expect(await positionOf(marketId, user.id, 'HOME')).toBeNull()
      } finally {
        await deleteUsers([user])
        await deleteMarket(marketId)
      }
    },
    TEST_TIMEOUT_MS
  )
})

describe('market resolution (M-INV6)', () => {
  test(
    'pays winning shares once, leaves losers unpaid and closes the market terminally',
    async () => {
      const organizer = await createUser('ORGANIZER')
      const winnerA = await createUser('FAN')
      const winnerB = await createUser('FAN')
      const loser = await createUser('FAN')
      const marketId = await createMarket()

      try {
        await setPoints(winnerA.id, 500)
        await setPoints(winnerB.id, 500)
        await setPoints(loser.id, 500)

        const entryA = await openTrade(winnerA, marketId, 'HOME', 50)
        const entryB = await openTrade(winnerB, marketId, 'HOME', 80)
        const entryL = await openTrade(loser, marketId, 'DRAW', 40)

        expect(entryA.error).toBeNull()
        expect(entryB.error).toBeNull()
        expect(entryL.error).toBeNull()

        const sharesA = num(entryA.row!.shares)
        const sharesB = num(entryB.row!.shares)
        const balanceABefore = await pointsOf(winnerA.id)
        const balanceBBefore = await pointsOf(winnerB.id)
        const balanceLBefore = await pointsOf(loser.id)

        await finishMatch(marketId, 1, 0)
        const resolution = await resolveMarket(organizer, marketId, 'HOME')
        expect(resolution.error).toBeNull()
        expect(num(resolution.row!.holders)).toBe(2)
        expect(num(resolution.row!.total_points)).toBe(
          Math.floor(sharesA) + Math.floor(sharesB)
        )

        expect(await pointsOf(winnerA.id)).toBe(balanceABefore + Math.floor(sharesA))
        expect(await pointsOf(winnerB.id)).toBe(balanceBBefore + Math.floor(sharesB))
        expect(await pointsOf(loser.id)).toBe(balanceLBefore)

        const market = await marketOf(marketId)
        expect(market.status).toBe('RESOLVED')
        expect(market.winning_outcome).toBe('HOME')
        expect(market.resolved_at).not.toBeNull()

        const { data: payouts, error: payoutError } = await admin
          .from('market_payouts')
          .select('user_id, shares, points')
          .eq('market_id', marketId)

        if (payoutError) throw new Error(`Failed to read payouts: ${payoutError.message}`)
        expect(payouts?.length).toBe(2)

        const afterEntry = await openTrade(winnerA, marketId, 'HOME', 10)
        expect(afterEntry.error?.message).toContain('market is not open')

        const afterExit = await closeTrade(winnerA, marketId, 'HOME', 1)
        expect(afterExit.error?.message).toContain('market is not open')

        const secondResolution = await resolveMarket(organizer, marketId, 'HOME')
        expect(secondResolution.error?.message).toContain('already resolved')
        expect(await pointsOf(winnerA.id)).toBe(balanceABefore + Math.floor(sharesA))

        const { data: payoutsAgain, error: payoutAgainError } = await admin
          .from('market_payouts')
          .select('user_id')
          .eq('market_id', marketId)

        if (payoutAgainError) {
          throw new Error(`Failed to reread payouts: ${payoutAgainError.message}`)
        }
        expect(payoutsAgain?.length).toBe(2)
      } finally {
        await deleteUsers([organizer, winnerA, winnerB, loser])
        await deleteMarket(marketId)
      }
    },
    TEST_TIMEOUT_MS
  )
})

describe('market closure after full time (M-INV1)', () => {
  test(
    'refuses new entries after FINISHED but still accepts exits',
    async () => {
      const user = await createUser('FAN')
      const second = await createUser('FAN')
      const marketId = await createMarket()

      try {
        await setPoints(user.id, 100)
        await setPoints(second.id, 100)
        const entry = await openTrade(user, marketId, 'HOME', 10)
        expect(entry.error).toBeNull()
        const shares = num(entry.row!.shares)

        await finishMatch(marketId, 1, 0)

        const blocked = await openTrade(second, marketId, 'DRAW', 10)
        expect(blocked.error?.message).toContain('market is closed')

        const exit = await closeTrade(user, marketId, 'HOME', shares)
        expect(exit.error).toBeNull()
      } finally {
        await deleteUsers([user, second])
        await deleteMarket(marketId)
      }
    },
    TEST_TIMEOUT_MS
  )
})

describe('result-bound resolution (M-INV6)', () => {
  test(
    'requires a finished match and the score-derived winner',
    async () => {
      const organizer = await createUser('ORGANIZER')
      const holder = await createUser('FAN')
      const marketId = await createMarket()

      try {
        await setPoints(holder.id, 100)
        const entry = await openTrade(holder, marketId, 'HOME', 10)
        expect(entry.error).toBeNull()

        const early = await resolveMarket(organizer, marketId, 'HOME')
        expect(early.error?.message).toContain('match is not finished')

        await finishMatch(marketId, 0, 0)

        const mismatch = await resolveMarket(organizer, marketId, 'HOME')
        expect(mismatch.error?.message).toContain('does not match the final score')

        const resolved = await resolveMarket(organizer, marketId, 'DRAW')
        expect(resolved.error).toBeNull()
        expect((await marketOf(marketId)).status).toBe('RESOLVED')
        expect((await marketOf(marketId)).winning_outcome).toBe('DRAW')

        const { data: market } = await admin
          .from('markets')
          .select('match_id')
          .eq('id', marketId)
          .single()
        const scoreChange = await admin
          .from('matches')
          .update({ home_score: 2 })
          .eq('id', market!.match_id)
        expect(scoreChange.error?.message).toContain('after market resolution')
      } finally {
        await deleteUsers([organizer, holder])
        await deleteMarket(marketId)
      }
    },
    TEST_TIMEOUT_MS
  )
})

describe('match result integrity', () => {
  test(
    'refuses marking a future match FINISHED',
    async () => {
      const marketId = await createMarket(3_600_000)

      try {
        const { data: market } = await admin
          .from('markets')
          .select('match_id')
          .eq('id', marketId)
          .single()
        expect(market?.match_id).toBeTruthy()

        const premature = await admin
          .from('matches')
          .update({ status: 'FINISHED' })
          .eq('id', market!.match_id)
        expect(premature.error?.message).toContain('before kickoff')
      } finally {
        await deleteMarket(marketId)
      }
    },
    TEST_TIMEOUT_MS
  )
})

describe('prediction disable preserves exits (M-INV1)', () => {
  test(
    'allows a SELL exit but refuses a new BUY',
    async () => {
      const user = await createUser('FAN')
      const second = await createUser('FAN')
      const marketId = await createMarket()

      try {
        await setPoints(user.id, 100)
        await setPoints(second.id, 100)
        const entry = await openTrade(user, marketId, 'HOME', 50)
        expect(entry.error).toBeNull()
        const shares = num(entry.row!.shares)

        const { data: market } = await admin
          .from('markets')
          .select('match_id')
          .eq('id', marketId)
          .single()
        expect(market?.match_id).toBeTruthy()

        const disabled = await admin
          .from('matches')
          .update({ prediction_enabled: false })
          .eq('id', market!.match_id)
        expect(disabled.error).toBeNull()

        const exit = await closeTrade(user, marketId, 'HOME', shares)
        expect(exit.error).toBeNull()

        const blocked = await openTrade(second, marketId, 'HOME', 10)
        expect(blocked.error?.message).toContain('predictions are not enabled')
      } finally {
        await deleteUsers([user, second])
        await deleteMarket(marketId)
      }
    },
    TEST_TIMEOUT_MS
  )
})

describe('entry cooldown (M-INV7)', () => {
  test(
    'applies the 5/15/30/45 ladder, caps at 600, decays and ignores refused attempts',
    async () => {
      const user = await createUser('FAN')
      const marketId = await createMarket()

      try {
        await setPoints(user.id, 1000)

        expect((await openTrade(user, marketId, 'HOME', 10)).error).toBeNull()

        let cooldown = await cooldownOf(marketId, user.id)
        expect(cooldown.level).toBe(1)
        expectWait(cooldown.next_entry_at, 5)

        // A refused attempt must not escalate the ladder.
        const refused = await openTrade(user, marketId, 'HOME', 10)
        expect(refused.error?.message).toContain('cooldown')

        const unchanged = await cooldownOf(marketId, user.id)
        expect(unchanged.level).toBe(1)
        expect(unchanged.next_entry_at).toBe(cooldown.next_entry_at)

        await setCooldown(marketId, user.id, 1, 5_000)
        expect((await openTrade(user, marketId, 'HOME', 10)).error).toBeNull()
        cooldown = await cooldownOf(marketId, user.id)
        expect(cooldown.level).toBe(2)
        expectWait(cooldown.next_entry_at, 15)

        await setCooldown(marketId, user.id, 2, 5_000)
        expect((await openTrade(user, marketId, 'HOME', 10)).error).toBeNull()
        cooldown = await cooldownOf(marketId, user.id)
        expect(cooldown.level).toBe(3)
        expectWait(cooldown.next_entry_at, 30)

        await setCooldown(marketId, user.id, 3, 5_000)
        expect((await openTrade(user, marketId, 'HOME', 10)).error).toBeNull()
        cooldown = await cooldownOf(marketId, user.id)
        expect(cooldown.level).toBe(4)
        expectWait(cooldown.next_entry_at, 45)

        await setCooldown(marketId, user.id, 40, 5_000)
        expect((await openTrade(user, marketId, 'HOME', 10)).error).toBeNull()
        cooldown = await cooldownOf(marketId, user.id)
        expect(cooldown.level).toBe(40)
        expectWait(cooldown.next_entry_at, 600)

        // Two quiet five-minute steps decay level 10 to 8; the next wait is 15 + 7*15 = 120.
        await setCooldown(marketId, user.id, 10, 605_000)
        expect((await openTrade(user, marketId, 'HOME', 10)).error).toBeNull()
        cooldown = await cooldownOf(marketId, user.id)
        expect(cooldown.level).toBe(9)
        expectWait(cooldown.next_entry_at, 120)
      } finally {
        await deleteUsers([user])
        await deleteMarket(marketId)
      }
    },
    TEST_TIMEOUT_MS
  )

  test(
    'accepts exits while the entry cooldown is active',
    async () => {
      const user = await createUser('FAN')
      const marketId = await createMarket()

      try {
        await setPoints(user.id, 1000)

        const entry = await openTrade(user, marketId, 'HOME', 50)
        expect(entry.error).toBeNull()
        const shares = num(entry.row!.shares)
        const cooldownBefore = await cooldownOf(marketId, user.id)
        const balanceBefore = await pointsOf(user.id)

        // The next entry is gated, but selling must not be.
        const exit = await closeTrade(user, marketId, 'HOME', shares)
        expect(exit.error).toBeNull()
        const proceeds = num(exit.row!.proceeds)
        expect(proceeds).toBeGreaterThan(0)
        expect(num(exit.row!.points_after)).toBe(balanceBefore + proceeds)
        expect(await pointsOf(user.id)).toBe(balanceBefore + proceeds)

        const position = await positionOf(marketId, user.id, 'HOME')
        expect(num(position!.shares)).toBe(0)

        // Exiting neither resets nor escalates the entry cooldown.
        const cooldownAfter = await cooldownOf(marketId, user.id)
        expect(cooldownAfter.level).toBe(cooldownBefore.level)
        expect(cooldownAfter.next_entry_at).toBe(cooldownBefore.next_entry_at)
      } finally {
        await deleteUsers([user])
        await deleteMarket(marketId)
      }
    },
    TEST_TIMEOUT_MS
  )

  test(
    'is scoped per user and market',
    async () => {
      const first = await createUser('FAN')
      const second = await createUser('FAN')
      const marketId = await createMarket()
      const secondMarketId = await createMarket()

      try {
        await setPoints(first.id, 1000)
        await setPoints(second.id, 1000)

        expect((await openTrade(first, marketId, 'HOME', 10)).error).toBeNull()

        // The same market does not block a different user.
        expect((await openTrade(second, marketId, 'HOME', 10)).error).toBeNull()

        // The same user is not blocked in a different market.
        expect((await openTrade(first, secondMarketId, 'HOME', 10)).error).toBeNull()
      } finally {
        await deleteUsers([first, second])
        await deleteMarket(marketId)
        await deleteMarket(secondMarketId)
      }
    },
    TEST_TIMEOUT_MS
  )
})
