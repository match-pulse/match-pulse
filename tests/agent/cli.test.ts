/**
 * v3 CLI contract and agent playbook: the match-day journey and refusal cases
 * run against real local Supabase through the `matchpulse` command.
 */
import { describe, expect, test } from 'bun:test'
import { spawnSync } from 'node:child_process'
import { randomUUID } from 'node:crypto'
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { admin } from '../support/auth'

const TEST_TIMEOUT_MS = 120_000
const PASSWORD = 'matchpulse-test-password'

type CliResult = {
  status: number | null
  json: Record<string, unknown>
  stderr: string
}

function runCli(
  args: string[],
  configDir: string,
  extraEnv: Record<string, string> = {}
): CliResult {
  const result = spawnSync(process.execPath, ['src/cli/index.ts', ...args], {
    cwd: process.cwd(),
    env: {
      ...process.env,
      MATCHPULSE_CONFIG_DIR: configDir,
      ...extraEnv
    },
    encoding: 'utf8'
  })

  let json: Record<string, unknown> = {}
  try {
    json = JSON.parse(result.stdout || '{}') as Record<string, unknown>
  } catch {
    throw new Error(
      `CLI did not return JSON.\nstdout: ${result.stdout}\nstderr: ${result.stderr}`
    )
  }

  return { status: result.status, json, stderr: result.stderr }
}

function dataOf(result: CliResult): Record<string, unknown> {
  if (result.status !== 0 || result.json.ok !== true) {
    throw new Error(`CLI failed: ${JSON.stringify(result.json)} ${result.stderr}`)
  }
  return result.json.data as Record<string, unknown>
}

function arrayOf(result: CliResult): Array<Record<string, unknown>> {
  if (result.status !== 0 || result.json.ok !== true) {
    throw new Error(`CLI failed: ${JSON.stringify(result.json)} ${result.stderr}`)
  }
  return result.json.data as Array<Record<string, unknown>>
}

function attendee(firstName: string, lastName: string, extra: Record<string, string> = {}) {
  return JSON.stringify({
    first_name: firstName,
    last_name: lastName,
    date_of_birth: '1990-01-01',
    place_of_birth: 'Milano',
    tax_code: `TC-${randomUUID().slice(0, 8)}`,
    ...extra
  })
}

async function cleanupClub(clubId: string | null): Promise<void> {
  if (!clubId) return
  const { data: events } = await admin.from('tournaments').select('id').eq('club_id', clubId)
  const eventIds = (events ?? []).map((event) => event.id)
  if (eventIds.length > 0) {
    await admin.from('matches').delete().in('tournament_id', eventIds)
  }
  await admin.from('tournaments').delete().eq('club_id', clubId)
  await admin.from('clubs').delete().eq('id', clubId)
}

async function deleteUser(userId: string | null): Promise<void> {
  if (!userId) return
  await admin.auth.admin.deleteUser(userId)
}

describe('matchpulse CLI', () => {
  test(
    'runs the match-day journey through signup, club setup, nominal tickets, check-in, prediction and audit',
    async () => {
      const configDir = mkdtempSync(join(tmpdir(), 'matchpulse-cli-'))
      const ownerEmail = `cli-owner-${randomUUID()}@matchpulse.local`
      const fanEmail = `cli-fan-${randomUUID()}@matchpulse.local`
      const adminEmail = `cli-admin-${randomUUID()}@matchpulse.local`
      let clubId: string | null = null
      let ownerId: string | null = null
      let fanId: string | null = null
      let adminId: string | null = null

      try {
        const owner = runCli(
          ['auth', 'signup', '--profile', 'owner', '--email', ownerEmail, '--password', PASSWORD, '--username', 'CLI Owner', '--json'],
          configDir
        )
        ownerId = String(dataOf(owner).userId)

        const fan = runCli(
          ['auth', 'signup', '--profile', 'fan', '--email', fanEmail, '--password', PASSWORD, '--username', 'CLI Fan', '--json'],
          configDir
        )
        fanId = String(dataOf(fan).userId)

        const adminUser = runCli(
          ['auth', 'signup', '--profile', 'admin', '--email', adminEmail, '--password', PASSWORD, '--username', 'CLI Admin', '--json'],
          configDir
        )
        adminId = String(dataOf(adminUser).userId)
        await admin.from('platform_admins').insert({ profile_id: adminId })

        const who = runCli(['auth', 'whoami', '--profile', 'owner', '--json'], configDir)
        expect(dataOf(who).isAdmin).toBe(false)
        expect((dataOf(who).profile as Record<string, unknown>).username).toBe('CLI Owner')

        const createdClub = runCli(
          ['club', 'create', '--profile', 'owner', '--name', 'CLI Club', '--plan', 'STARTER', '--json'],
          configDir
        )
        clubId = String(dataOf(createdClub).clubId)

        const clubList = arrayOf(runCli(['club', 'list', '--profile', 'owner', '--json'], configDir))
        expect(clubList.find((row) => row.club_id === clubId)?.role).toBe('OWNER')

        const starter = dataOf(
          runCli(['club', 'show', '--profile', 'owner', '--club', clubId, '--json'], configDir)
        )
        expect((starter.entitlements as Record<string, unknown>).prediction_markets).toEqual({
          enabled: false,
          limit: null
        })

        runCli(
          ['club', 'plan', 'request', '--profile', 'owner', '--club', clubId, '--plan', 'PRO', '--json'],
          configDir
        )
        dataOf(
          runCli(
            ['admin', 'plans', 'assign', '--profile', 'admin', '--club', clubId, '--plan', 'PRO', '--status', 'ACTIVE', '--json'],
            configDir
          )
        )

        const event = runCli(
          ['club', 'events', 'create', '--profile', 'owner', '--club', clubId, '--name', 'CLI Derby', '--capacity', '20', '--allocation', '20', '--points', '10', '--json'],
          configDir
        )
        const eventId = String(dataOf(event).eventId)

        const ticketType = runCli(
          [
            'club', 'ticket-types', 'create', '--profile', 'owner', '--event', eventId,
            '--name', 'General', '--price-cents', '1500', '--allocation', '20',
            '--transfer-deadline', new Date(Date.now() + 86_400_000).toISOString(), '--json'
          ],
          configDir
        )
        const ticketTypeId = String(dataOf(ticketType).ticketTypeId)

        runCli(['club', 'events', 'publish', '--profile', 'owner', '--event', eventId, '--json'], configDir)

        const match = runCli(
          [
            'club', 'matches', 'create', '--profile', 'owner', '--event', eventId,
            '--home', 'CLI Home', '--away', 'CLI Away',
            '--kickoff', new Date(Date.now() - 3_600_000).toISOString(),
            '--predictions', '--json'
          ],
          configDir
        )
        const matchData = dataOf(match)
        const marketId = String(matchData.market_id)
        expect(marketId).not.toBe('null')

        const publicEvents = arrayOf(runCli(['fan', 'events', 'list', '--profile', 'fan', '--json'], configDir))
        expect(publicEvents.some((row) => row.id === eventId)).toBe(true)

        const purchase = runCli(
          [
            'fan', 'tickets', 'buy', '--profile', 'fan', '--ticket-type', ticketTypeId,
            '--attendee', attendee('Mario', 'Rossi'),
            '--attendee', attendee('Luigi', 'Bianchi'),
            '--accept-terms', '--json'
          ],
          configDir
        )
        const order = dataOf(purchase)
        expect((order.ticket_ids as string[]).length).toBe(2)
        expect((order.ticket_codes as string[]).length).toBe(2)

        const myTickets = arrayOf(runCli(['fan', 'tickets', 'list', '--profile', 'fan', '--json'], configDir))
        expect(myTickets.length).toBe(2)

        const attendees = arrayOf(
          runCli(['club', 'attendees', 'list', '--profile', 'owner', '--event', eventId, '--json'], configDir)
        )
        expect(attendees.map((row) => row.attendee_first_name).sort()).toEqual(['Luigi', 'Mario'])

        const checkIn = dataOf(
          runCli(
            ['club', 'tickets', 'check-in', '--profile', 'owner', '--code', (order.ticket_codes as string[])[0], '--json'],
            configDir
          )
        )
        expect(checkIn.already_checked_in).toBe(false)

        const secondCheckIn = dataOf(
          runCli(
            ['club', 'tickets', 'check-in', '--profile', 'owner', '--code', (order.ticket_codes as string[])[0], '--json'],
            configDir
          )
        )
        expect(secondCheckIn.already_checked_in).toBe(true)

        const summary = arrayOf(
          runCli(['club', 'analytics', 'summary', '--profile', 'owner', '--club', clubId, '--event', eventId, '--json'], configDir)
        )
        expect(summary[0]?.tickets_sold).toBe(2)
        expect(summary[0]?.checked_in).toBe(1)
        expect(summary[0]?.simulated_revenue_cents).toBe(3000)

        const prediction = runCli(
          ['fan', 'predictions', 'enter', '--profile', 'fan', '--market', marketId, '--outcome', 'HOME', '--budget', '50', '--json'],
          configDir
        )
        const predictionData = dataOf(prediction)
        expect(Number(predictionData.shares)).toBeGreaterThan(0)

        const insights = arrayOf(
          runCli(['club', 'analytics', 'predictions', '--profile', 'owner', '--club', clubId, '--event', eventId, '--json'], configDir)
        )
        expect(insights.length).toBeGreaterThan(0)
        expect(insights.every((row) => row.suppressed === true)).toBe(true)

        const finished = runCli(
          [
            'club', 'matches', 'update', '--profile', 'owner',
            '--match', String(matchData.match_id),
            '--home-score', '1', '--away-score', '0', '--status', 'FINISHED', '--json'
          ],
          configDir
        )
        expect(finished.status).toBe(0)

        const resolution = dataOf(
          runCli(
            ['club', 'predictions', 'resolve', '--profile', 'owner', '--market', marketId, '--winner', 'HOME', '--json'],
            configDir
          )
        )
        expect(resolution.holders).toBe(1)
        expect(Number(resolution.total_points)).toBeGreaterThan(0)

        const portfolio = dataOf(runCli(['fan', 'portfolio', '--profile', 'fan', '--json'], configDir))
        expect((portfolio.positions as unknown[]).length).toBeGreaterThan(0)

        const audit = arrayOf(
          runCli(['admin', 'audit', 'list', '--profile', 'admin', '--limit', '50', '--json'], configDir)
        )
        expect(audit.some((row) => row.action === 'admin.plan.assign')).toBe(true)
        expect(audit.some((row) => row.action === 'ticket.order')).toBe(true)
      } finally {
        await cleanupClub(clubId)
        await deleteUser(ownerId)
        await deleteUser(fanId)
        await deleteUser(adminId)
        rmSync(configDir, { recursive: true, force: true })
      }
    },
    TEST_TIMEOUT_MS
  )

  test(
    'refuses cross-club access and more than four tickets',
    async () => {
      const configDir = mkdtempSync(join(tmpdir(), 'matchpulse-cli-'))
      const ownerAEmail = `cli-a-${randomUUID()}@matchpulse.local`
      const ownerBEmail = `cli-b-${randomUUID()}@matchpulse.local`
      let clubA: string | null = null
      let clubB: string | null = null
      let ownerAId: string | null = null
      let ownerBId: string | null = null

      try {
        ownerAId = String(
          dataOf(
            runCli(['auth', 'signup', '--profile', 'a', '--email', ownerAEmail, '--password', PASSWORD, '--json'], configDir)
          ).userId
        )
        ownerBId = String(
          dataOf(
            runCli(['auth', 'signup', '--profile', 'b', '--email', ownerBEmail, '--password', PASSWORD, '--json'], configDir)
          ).userId
        )

        clubA = String(
          dataOf(runCli(['club', 'create', '--profile', 'a', '--name', 'CLI A', '--plan', 'PRO', '--json'], configDir)).clubId
        )
        clubB = String(
          dataOf(runCli(['club', 'create', '--profile', 'b', '--name', 'CLI B', '--plan', 'PRO', '--json'], configDir)).clubId
        )

        const eventA = String(
          dataOf(
            runCli(['club', 'events', 'create', '--profile', 'a', '--club', clubA, '--name', 'A Event', '--capacity', '20', '--json'], configDir)
          ).eventId
        )

        const crossClub = runCli(
          ['club', 'attendees', 'list', '--profile', 'b', '--event', eventA, '--json'],
          configDir
        )
        expect(crossClub.status).not.toBe(0)
        expect((crossClub.json.error as Record<string, unknown>).code).toBe('FORBIDDEN')

        const ticketType = String(
          dataOf(
            runCli(
              ['club', 'ticket-types', 'create', '--profile', 'a', '--event', eventA, '--name', 'General', '--allocation', '20', '--json'],
              configDir
            )
          ).ticketTypeId
        )
        runCli(['club', 'events', 'publish', '--profile', 'a', '--event', eventA, '--json'], configDir)

        const tooMany = runCli(
          [
            'fan', 'tickets', 'buy', '--profile', 'a', '--ticket-type', ticketType,
            '--attendee', attendee('One', 'Fan'),
            '--attendee', attendee('Two', 'Fan'),
            '--attendee', attendee('Three', 'Fan'),
            '--attendee', attendee('Four', 'Fan'),
            '--attendee', attendee('Five', 'Fan'),
            '--accept-terms', '--json'
          ],
          configDir
        )
        expect(tooMany.status).not.toBe(0)
        expect((tooMany.json.error as Record<string, unknown>).code).toBe('VALIDATION')

        expect(clubB).toBeTruthy()
      } finally {
        await cleanupClub(clubA)
        await cleanupClub(clubB)
        await deleteUser(ownerAId)
        await deleteUser(ownerBId)
        rmSync(configDir, { recursive: true, force: true })
      }
    },
    TEST_TIMEOUT_MS
  )
})
