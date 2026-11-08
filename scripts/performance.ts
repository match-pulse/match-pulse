/**
 * Load/stress baseline for the registration path.
 *
 * Creates a shared user pool, then runs bursts at 20, 50 and 100 concurrent
 * requests against fresh tournaments with matching capacity. Records p50/p95/p99,
 * wall-clock time, throughput, accepted/refused counts and transport errors.
 *
 * Run against a disposable local Supabase database:
 *   bun run perf
 */
import { performance } from 'node:perf_hooks'
import { createUsers, deleteUsers } from '../tests/support/auth'
import { createTournament, deleteTournament } from '../tests/support/fixtures'

const LEVELS = [20, 50, 100]
const TEST_TIMEOUT_MS = 30 * 60_000

function percentile(values: number[], fraction: number): number {
  if (values.length === 0) return Number.NaN
  const sorted = [...values].sort((a, b) => a - b)
  const index = Math.min(sorted.length - 1, Math.ceil(fraction * sorted.length) - 1)
  return sorted[index]
}

async function main() {
  console.log(`Performance baseline: levels ${LEVELS.join(', ')}`)
  const users = await createUsers(Math.max(...LEVELS))
  const tournaments: string[] = []

  try {
    for (const level of LEVELS) {
      const tournamentId = await createTournament(level)
      tournaments.push(tournamentId)
      const subset = users.slice(0, level)

      const started = performance.now()
      const results = await Promise.all(
        subset.map(async (user) => {
          const callStarted = performance.now()
          const { data, error } = await user.client.rpc('register_for_tournament', {
            p_tournament_id: tournamentId
          })
          return {
            durationMs: performance.now() - callStarted,
            ok: !error,
            accepted: !error && data === true,
            refused: !error && data === false,
            message: error?.message
          }
        })
      )
      const wallClockMs = performance.now() - started
      const latencies = results.map((result) => result.durationMs)
      const accepted = results.filter((result) => result.accepted).length
      const refused = results.filter((result) => result.refused).length
      const errors = results.filter((result) => !result.ok)

      const line = {
        event: 'performance.burst',
        level,
        capacity: level,
        wallClockMs: Number(wallClockMs.toFixed(2)),
        throughputPerSecond: Number(((level / wallClockMs) * 1000).toFixed(2)),
        p50Ms: Number(percentile(latencies, 0.5).toFixed(2)),
        p95Ms: Number(percentile(latencies, 0.95).toFixed(2)),
        p99Ms: Number(percentile(latencies, 0.99).toFixed(2)),
        accepted,
        refused,
        transportErrors: errors.length,
        firstError: errors[0]?.message ?? null
      }
      console.log(JSON.stringify(line))

      if (errors.length > 0 || accepted !== level || refused !== 0) {
        process.exitCode = 1
      }
    }
  } finally {
    for (const tournamentId of tournaments) {
      await deleteTournament(tournamentId)
    }
    await deleteUsers(users)
  }
}

main().catch((error) => {
  console.error(`Performance run failed: ${error instanceof Error ? error.message : String(error)}`)
  process.exit(1)
})

setTimeout(() => {
  console.error('Performance run exceeded its time budget.')
  process.exit(1)
}, TEST_TIMEOUT_MS).unref()
