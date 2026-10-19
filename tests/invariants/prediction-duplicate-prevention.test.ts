/**
 * Duplicate prediction prevention, under concurrency.
 *
 * RENAMED from `prediction-lock.test.ts`.
 *
 * The old filename asserted that predictions are locked at kickoff. That claim
 * is false: `submit_prediction` checks `status = 'SCHEDULED'` and never reads
 * `kickoff_time`. Kickoff enforcement (INV-03) is not implemented and is
 * recorded as such in the invariants registry.
 *
 * What this file actually exercises is the `UNIQUE (user_id, match_id)`
 * constraint — that a double submission does not create two predictions.
 *
 * NOTE: `submit_prediction` trusts the caller-supplied `p_user_id`, so this test
 * also cannot say anything about authorisation. See INV-05.
 */
import { afterAll, beforeAll, describe, expect, test } from 'bun:test'
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

const BURST_SIZE = 20
const TEST_TIMEOUT_MS = 30_000

let matchId: string
let userId: string

beforeAll(async () => {
  matchId = randomUUID()
  userId = randomUUID()

  const { error } = await supabase.from('matches').insert({
    id: matchId,
    home_team: 'Italy',
    away_team: 'France',
    status: 'SCHEDULED',
    kickoff_time: new Date(Date.now() + 86_400_000).toISOString()
  })

  if (error) {
    throw new Error(`Failed to create test match: ${error.message}`)
  }
})

afterAll(async () => {
  // predictions cascade on match deletion.
  await supabase.from('matches').delete().eq('id', matchId)
})

describe('duplicate prediction prevention', () => {
  test(
    `at most one of ${BURST_SIZE} concurrent submissions for the same match succeeds`,
    async () => {
      const results = await Promise.all(
        Array.from({ length: BURST_SIZE }).map(async () => {
          const { data, error } = await supabase.rpc('submit_prediction', {
            p_user_id: userId,
            p_match_id: matchId,
            p_home_score: 2,
            p_away_score: 1
          })
          return { ok: !error, value: data, message: error?.message }
        })
      )

      expect(results.filter((r) => !r.ok).map((r) => r.message)).toEqual([])
      expect(results.filter((r) => r.value === true).length).toBe(1)

      const { count, error } = await supabase
        .from('predictions')
        .select('id', { count: 'exact', head: true })
        .eq('match_id', matchId)
        .eq('user_id', userId)

      if (error) {
        throw new Error(`Failed to count predictions: ${error.message}`)
      }

      expect(count).toBe(1)
    },
    TEST_TIMEOUT_MS
  )

  test(
    'distinct users may each predict the same match',
    async () => {
      const others = Array.from({ length: 3 }).map(() => randomUUID())

      const results = await Promise.all(
        others.map(async (uid) => {
          const { data, error } = await supabase.rpc('submit_prediction', {
            p_user_id: uid,
            p_match_id: matchId,
            p_home_score: 1,
            p_away_score: 0
          })
          return { ok: !error, value: data, message: error?.message }
        })
      )

      expect(results.filter((r) => !r.ok).map((r) => r.message)).toEqual([])
      expect(results.filter((r) => r.value === true).length).toBe(others.length)

      const { count } = await supabase
        .from('predictions')
        .select('id', { count: 'exact', head: true })
        .eq('match_id', matchId)

      expect(count).toBe(1 + others.length)
    },
    TEST_TIMEOUT_MS
  )
})