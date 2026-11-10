/**
 * INV-01 — Registrations must never exceed `max_capacity`.
 *
 * The test asserts committed state as well as responses, and it creates its own
 * authenticated users and tournament. It is one self-contained scenario so a
 * failure cannot be caused by another test having run first.
 */
import { afterAll, beforeAll, describe, expect, test } from 'bun:test'
import { admin, createUsers, deleteUsers, type TestUser } from '../support/auth'
import { createTournament, deleteTournament } from '../support/fixtures'

const CAPACITY = 32
const BURST_SIZE = 100
const TEST_TIMEOUT_MS = 120_000

function percentile(values: number[], fraction: number): number {
  if (values.length === 0) return Number.NaN
  const sorted = [...values].sort((a, b) => a - b)
  const index = Math.min(sorted.length - 1, Math.ceil(fraction * sorted.length) - 1)
  return sorted[index]
}

let tournamentId: string
let users: TestUser[]

beforeAll(async () => {
  tournamentId = await createTournament(CAPACITY)
  users = await createUsers(BURST_SIZE)
}, TEST_TIMEOUT_MS)

afterAll(async () => {
  await deleteUsers(users)
  await deleteTournament(tournamentId)
})

describe('INV-01 tournament capacity under a concurrent burst', () => {
  test(
    `accepts exactly ${CAPACITY} of ${BURST_SIZE} concurrent requests and commits consistent state`,
    async () => {
      const started = performance.now()
      const results = await Promise.all(
        users.map(async (user) => {
          const callStarted = performance.now()
          const { data, error } = await user.client.rpc('register_for_tournament', {
            p_tournament_id: tournamentId
          })
          return {
            ok: !error,
            value: data,
            message: error?.message,
            durationMs: performance.now() - callStarted
          }
        })
      )
      const wallClockMs = performance.now() - started

      const latencies = results.map((result) => result.durationMs)
      const p95 = percentile(latencies, 0.95)

      console.log(
        JSON.stringify({
          event: 'capacity.burst_latency',
          requests: BURST_SIZE,
          wallClockMs: Number(wallClockMs.toFixed(2)),
          p50Ms: Number(percentile(latencies, 0.5).toFixed(2)),
          p95Ms: Number(p95.toFixed(2)),
          maxMs: Number(Math.max(...latencies).toFixed(2))
        })
      )

      const transportErrors = results.filter((result) => !result.ok)
      const accepted = results.filter((result) => result.ok && result.value === true).length
      const refused = results.filter((result) => result.ok && result.value === false).length

      expect(transportErrors.map((result) => result.message)).toEqual([])
      if (process.env.P95_STRICT !== 'false') {
        expect(p95).toBeLessThan(1000)
      }
      expect(accepted).toBe(CAPACITY)
      expect(refused).toBe(BURST_SIZE - CAPACITY)
      expect(accepted + refused).toBe(BURST_SIZE)

      const { count: registrationRows, error: countError } = await admin
        .from('registrations')
        .select('id', { count: 'exact', head: true })
        .eq('tournament_id', tournamentId)

      if (countError) {
        throw new Error(`Failed to count registrations: ${countError.message}`)
      }

      const { data: tournament, error: readError } = await admin
        .from('tournaments')
        .select('current_players, max_capacity')
        .eq('id', tournamentId)
        .single()

      if (readError || !tournament) {
        throw new Error(`Failed to read tournament: ${readError?.message ?? 'no row'}`)
      }

      expect(tournament.current_players).toBeLessThanOrEqual(tournament.max_capacity)
      expect(registrationRows).toBe(CAPACITY)
      expect(tournament.current_players).toBe(CAPACITY)
      expect(tournament.current_players).toBe(registrationRows ?? -1)
    },
    TEST_TIMEOUT_MS
  )
})
