/**
 * INV-02 — A participant cannot register for the same tournament twice, and a
 * retry must not consume a second place.
 *
 * Each test creates its own authenticated user and tournament, so the evidence
 * does not depend on another test having run first.
 */
import { describe, expect, test } from 'bun:test'
import { admin, createUser, deleteUsers, type TestUser } from '../support/auth'
import { createTournament, deleteTournament } from '../support/fixtures'

const CAPACITY = 32
const TEST_TIMEOUT_MS = 60_000

async function register(user: TestUser, tournamentId: string) {
  const { data, error } = await user.client.rpc('register_for_tournament', {
    p_tournament_id: tournamentId
  })
  return { ok: !error, value: data, message: error?.message }
}

async function committedState(tournamentId: string, userId: string) {
  const { count, error: countError } = await admin
    .from('registrations')
    .select('id', { count: 'exact', head: true })
    .eq('tournament_id', tournamentId)
    .eq('user_id', userId)

  if (countError) {
    throw new Error(`Failed to count registrations: ${countError.message}`)
  }

  const { data: tournament, error: readError } = await admin
    .from('tournaments')
    .select('current_players')
    .eq('id', tournamentId)
    .single()

  if (readError || !tournament) {
    throw new Error(`Failed to read tournament: ${readError?.message ?? 'no row'}`)
  }

  return { count: count ?? -1, currentPlayers: tournament.current_players }
}

describe('INV-02 registration uniqueness', () => {
  test(
    'a repeated sequential registration is refused and consumes no second place',
    async () => {
      const tournamentId = await createTournament(CAPACITY)
      const user = await createUser('FAN')

      try {
        const first = await register(user, tournamentId)
        const second = await register(user, tournamentId)

        expect(first.message).toBeUndefined()
        expect(first.value).toBe(true)
        expect(second.message).toBeUndefined()
        expect(second.value).toBe(false)

        const state = await committedState(tournamentId, user.id)
        expect(state.count).toBe(1)
        expect(state.currentPlayers).toBe(1)
      } finally {
        await deleteUsers([user])
        await deleteTournament(tournamentId)
      }
    },
    TEST_TIMEOUT_MS
  )

  test(
    'concurrent duplicate submissions accept exactly one and consume one place',
    async () => {
      const tournamentId = await createTournament(CAPACITY)
      const user = await createUser('FAN')

      try {
        const results = await Promise.all(
          Array.from({ length: 10 }).map(() => register(user, tournamentId))
        )

        expect(results.filter((result) => !result.ok)).toEqual([])
        expect(results.filter((result) => result.value === true).length).toBe(1)

        const state = await committedState(tournamentId, user.id)
        expect(state.count).toBe(1)
        expect(state.currentPlayers).toBe(1)
      } finally {
        await deleteUsers([user])
        await deleteTournament(tournamentId)
      }
    },
    TEST_TIMEOUT_MS
  )
})
