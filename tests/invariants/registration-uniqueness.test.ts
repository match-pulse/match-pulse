/**
 * INV-02 — A participant cannot register for the same tournament twice, and a
 * retry must not consume a second place.
 *
 * The invariants registry previously recorded this rule as enforced. It was
 * not: there was no unique constraint, so a repeated submission incremented the
 * counter again and wrote a second row. Capacity correctness and uniqueness are
 * the same concern — a registration must not consume capacity it has not
 * earned — so they are tested together.
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

const CAPACITY = 32
const TEST_TIMEOUT_MS = 30_000

let tournamentId: string

beforeAll(async () => {
  tournamentId = randomUUID()

  const { error } = await supabase.from('tournaments').insert({
    id: tournamentId,
    name: 'Uniqueness Invariant Test',
    max_capacity: CAPACITY,
    current_players: 0
  })

  if (error) {
    throw new Error(`Failed to create test tournament: ${error.message}`)
  }
})

afterAll(async () => {
  await supabase.from('tournaments').delete().eq('id', tournamentId)
})

async function register(userId: string) {
  const { data, error } = await supabase.rpc('register_for_tournament', {
    p_tournament_id: tournamentId,
    p_user_id: userId
  })
  return { ok: !error, value: data, message: error?.message }
}

describe('INV-02 registration uniqueness', () => {
  test(
    'a repeated sequential registration is refused and consumes no second place',
    async () => {
      const userId = randomUUID()

      const first = await register(userId)
      const second = await register(userId)

      expect(first.message).toBeUndefined()
      expect(first.value).toBe(true)
      expect(second.message).toBeUndefined()
      expect(second.value).toBe(false)

      const { count, error } = await supabase
        .from('registrations')
        .select('id', { count: 'exact', head: true })
        .eq('tournament_id', tournamentId)
        .eq('user_id', userId)

      if (error) {
        throw new Error(`Failed to count registrations: ${error.message}`)
      }

      expect(count).toBe(1)

      const { data: tournament, error: readError } = await supabase
        .from('tournaments')
        .select('current_players')
        .eq('id', tournamentId)
        .single()

      if (readError || !tournament) {
        throw new Error(`Failed to read tournament: ${readError?.message ?? 'no row'}`)
      }

      expect(tournament.current_players).toBe(1)
    },
    TEST_TIMEOUT_MS
  )

  test(
    'concurrent duplicate submissions accept exactly one and consume one place',
    async () => {
      const userId = randomUUID()

      const results = await Promise.all(Array.from({ length: 10 }).map(() => register(userId)))

      expect(results.filter((r) => !r.ok)).toEqual([])
      expect(results.filter((r) => r.value === true).length).toBe(1)

      const { count, error } = await supabase
        .from('registrations')
        .select('id', { count: 'exact', head: true })
        .eq('tournament_id', tournamentId)
        .eq('user_id', userId)

      if (error) {
        throw new Error(`Failed to count registrations: ${error.message}`)
      }

      expect(count).toBe(1)

      // 1 from the sequential test above, 1 from this one.
      const { data: tournament, error: readError } = await supabase
        .from('tournaments')
        .select('current_players')
        .eq('id', tournamentId)
        .single()

      if (readError || !tournament) {
        throw new Error(`Failed to read tournament: ${readError?.message ?? 'no row'}`)
      }

      expect(tournament.current_players).toBe(2)
    },
    TEST_TIMEOUT_MS
  )

  test(
    'the stored counter never exceeds capacity even when distinct users are admitted and duplicates are refused',
    async () => {
      const { data: tournament, error: readError } = await supabase
        .from('tournaments')
        .select('current_players, max_capacity')
        .eq('id', tournamentId)
        .single()

      const { count, error: countError } = await supabase
        .from('registrations')
        .select('id', { count: 'exact', head: true })
        .eq('tournament_id', tournamentId)

      if (readError || !tournament) {
        throw new Error(`Failed to read tournament: ${readError?.message ?? 'no row'}`)
      }
      if (countError) {
        throw new Error(`Failed to count registrations: ${countError.message}`)
      }

      expect(tournament.current_players).toBeLessThanOrEqual(tournament.max_capacity)
      expect(tournament.current_players).toBe(count ?? -1)
    },
    TEST_TIMEOUT_MS
  )
})