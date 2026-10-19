/**
 * INV-01 — Registrations must never exceed `max_capacity`.
 *
 * This test asserts on *committed state*, not only on what the function
 * returned. A response count of 32 proves nothing if the database also stored
 * 40 rows.
 *
 * A previous version of this file only printed results and exited 0, so it
 * could not fail a build. A test that has never been observed failing has not
 * been shown to detect anything.
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
const BURST_SIZE = 100
const TEST_TIMEOUT_MS = 30_000

let tournamentId: string

beforeAll(async () => {
  tournamentId = randomUUID()

  const { error } = await supabase.from('tournaments').insert({
    id: tournamentId,
    name: 'Capacity Invariant Test',
    max_capacity: CAPACITY,
    current_players: 0
  })

  if (error) {
    throw new Error(`Failed to create test tournament: ${error.message}`)
  }
})

afterAll(async () => {
  // registrations cascade on tournament deletion.
  await supabase.from('tournaments').delete().eq('id', tournamentId)
})

describe('INV-01 tournament capacity under a concurrent burst', () => {
  test(
    `accepts exactly ${CAPACITY} of ${BURST_SIZE} concurrent requests and refuses the rest`,
    async () => {
      const results = await Promise.all(
        Array.from({ length: BURST_SIZE }).map(async () => {
          const { data, error } = await supabase.rpc('register_for_tournament', {
            p_tournament_id: tournamentId,
            p_user_id: randomUUID() // distinct participant per request
          })
          return { ok: !error, value: data, message: error?.message }
        })
      )

      const transportErrors = results.filter((r) => !r.ok)
      const accepted = results.filter((r) => r.ok && r.value === true).length
      const refused = results.filter((r) => r.ok && r.value === false).length

      expect(
        transportErrors.map((r) => r.message)
      ).toEqual([])
      expect(accepted).toBe(CAPACITY)
      expect(refused).toBe(BURST_SIZE - CAPACITY)
      expect(accepted + refused).toBe(BURST_SIZE)
    },
    TEST_TIMEOUT_MS
  )

  test(
    'committed state agrees with the capacity limit',
    async () => {
      const { count: registrationRows, error: countError } = await supabase
        .from('registrations')
        .select('id', { count: 'exact', head: true })
        .eq('tournament_id', tournamentId)

      if (countError) {
        throw new Error(`Failed to count registrations: ${countError.message}`)
      }

      const { data: tournament, error: readError } = await supabase
        .from('tournaments')
        .select('current_players, max_capacity')
        .eq('id', tournamentId)
        .single()

      if (readError) {
        throw new Error(`Failed to read tournament: ${readError.message}`)
      }

      // The invariant itself.
      expect(tournament.current_players).toBeLessThanOrEqual(tournament.max_capacity)

      // Internal consistency: the counter must describe the rows that exist.
      expect(registrationRows).toBe(CAPACITY)
      expect(tournament.current_players).toBe(CAPACITY)
      expect(tournament.current_players).toBe(registrationRows ?? -1)
    },
    TEST_TIMEOUT_MS
  )
})