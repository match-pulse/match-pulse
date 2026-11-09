/**
 * v3.0.0 database contract: club tenancy, plans/entitlements, nominal
 * ticketing, transfer, check-in, box office, isolation and admin audit.
 *
 * These tests use a real local Supabase/PostgreSQL boundary.
 */
import { describe, expect, test } from 'bun:test'
import { randomUUID } from 'crypto'
import { admin, createUser, deleteUsers, type TestUser } from '../support/auth'

const TEST_TIMEOUT_MS = 60_000

type Row = Record<string, unknown>

function first(data: unknown): Row | null {
  if (Array.isArray(data)) return (data[0] as Row) ?? null
  return (data as Row) ?? null
}

function attendee(firstName: string, lastName: string, extra: Row = {}): Row {
  return {
    first_name: firstName,
    last_name: lastName,
    date_of_birth: '1990-01-01',
    place_of_birth: 'Milano',
    tax_code: `TC-${randomUUID().slice(0, 8)}`,
    ...extra
  }
}

async function createClub(user: TestUser, name: string, plan = 'PRO'): Promise<string> {
  const { data, error } = await user.client.rpc('create_club', {
    p_name: name,
    p_plan_code: plan
  })
  if (error) throw new Error(`create_club failed: ${error.message}`)
  return String(data)
}

async function createEvent(user: TestUser, clubId: string, capacity = 20): Promise<string> {
  const { data, error } = await user.client.rpc('create_club_event', {
    p_club_id: clubId,
    p_name: `Event ${randomUUID().slice(0, 8)}`,
    p_max_capacity: capacity,
    p_ticket_allocation: capacity,
    p_ticket_points: 10
  })
  if (error) throw new Error(`create_club_event failed: ${error.message}`)
  return String(data)
}

async function createTicketType(
  user: TestUser,
  eventId: string,
  options: {
    allocation?: number
    requiresFanCard?: boolean
    transferable?: boolean
    transferDeadline?: string | null
  } = {}
): Promise<string> {
  const { data, error } = await user.client.rpc('create_ticket_type', {
    p_event_id: eventId,
    p_name: 'General',
    p_sector: 'GENERAL',
    p_price_cents: 1500,
    p_allocation: options.allocation ?? 20,
    p_sales_start: null,
    p_sales_end: null,
    p_transfer_deadline: options.transferDeadline ?? new Date(Date.now() + 86_400_000).toISOString(),
    p_max_per_buyer: 4,
    p_requires_fan_card: options.requiresFanCard ?? false,
    p_transferable: options.transferable ?? true,
    p_away_sector: false
  })
  if (error) throw new Error(`create_ticket_type failed: ${error.message}`)
  return String(data)
}

async function publishEvent(user: TestUser, eventId: string): Promise<void> {
  const { error } = await user.client.rpc('publish_club_event', { p_event_id: eventId })
  if (error) throw new Error(`publish_club_event failed: ${error.message}`)
}

async function buy(
  user: TestUser,
  ticketTypeId: string,
  attendees: Row[],
  requestId = randomUUID(),
  channel = 'WEB',
  buyerId: string | null = null
) {
  const { data, error } = await user.client.rpc('purchase_ticket', {
    p_ticket_type_id: ticketTypeId,
    p_attendees: attendees,
    p_accept_terms: true,
    p_request_id: requestId,
    p_channel: channel,
    p_buyer_id: buyerId
  })
  if (error) throw new Error(`purchase_ticket failed: ${error.message}`)
  return first(data)
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

describe('v3 club tenancy and entitlements', () => {
  test(
    'owner creates a club, sees STARTER limits and upgrades to PRO before enabling predictions',
    async () => {
      const owner = await createUser()
      let clubId: string | null = null

      try {
        clubId = await createClub(owner, 'Starter Club', 'STARTER')

        const { data: clubs, error: clubsError } = await owner.client.rpc('list_my_clubs')
        expect(clubsError).toBeNull()
        const club = (clubs as Row[]).find((row) => row.club_id === clubId)
        expect(club?.role).toBe('OWNER')
        expect(club?.plan_code).toBe('STARTER')

        const { data: context, error: contextError } = await owner.client.rpc('get_club_context', {
          p_club_id: clubId
        })
        expect(contextError).toBeNull()
        const contextObject = context as Row
        expect(contextObject.plan).toBe('STARTER')
        expect((contextObject.entitlements as Row).prediction_markets).toEqual({
          enabled: false,
          limit: null
        })

        const eventId = await createEvent(owner, clubId)
        await createTicketType(owner, eventId)
        await publishEvent(owner, eventId)

        const denied = await owner.client.rpc('create_club_match', {
          p_event_id: eventId,
          p_home_team: 'Home',
          p_away_team: 'Away',
          p_kickoff: new Date(Date.now() + 3_600_000).toISOString(),
          p_prediction_enabled: true
        })
        expect(denied.error?.message).toContain('prediction_markets')

        const platformAdmin = await createUser()
        await admin.from('platform_admins').insert({ profile_id: platformAdmin.id })

        const assigned = await platformAdmin.client.rpc('admin_assign_plan', {
          p_club_id: clubId,
          p_plan_code: 'PRO',
          p_status: 'ACTIVE'
        })
        expect(assigned.error).toBeNull()

        const allowed = await owner.client.rpc('create_club_match', {
          p_event_id: eventId,
          p_home_team: 'Home',
          p_away_team: 'Away',
          p_kickoff: new Date(Date.now() + 3_600_000).toISOString(),
          p_prediction_enabled: true
        })
        expect(allowed.error).toBeNull()
        expect(first(allowed.data)?.market_id).toBeTruthy()

        await deleteUsers([platformAdmin])
      } finally {
        await cleanupClub(clubId)
        await deleteUsers([owner])
      }
    },
    TEST_TIMEOUT_MS
  )
})

describe('v3 nominal ticketing', () => {
  test(
    'buyer purchases named tickets, is capped at four, transfers, checks in and uses the box office',
    async () => {
      const owner = await createUser()
      const buyerA = await createUser()
      const buyerB = await createUser()
      let clubId: string | null = null

      try {
        clubId = await createClub(owner, 'Nominal Club', 'PRO')
        const eventId = await createEvent(owner, clubId)
        const ticketTypeId = await createTicketType(owner, eventId, { allocation: 20 })
        await publishEvent(owner, eventId)

        const order = await buy(buyerA, ticketTypeId, [
          attendee('Mario', 'Rossi'),
          attendee('Luigi', 'Bianchi')
        ])
        expect(order?.order_id).toBeTruthy()
        expect((order?.ticket_ids as string[]).length).toBe(2)
        expect((order?.ticket_codes as string[]).length).toBe(2)

        const { data: tickets, error: ticketError } = await admin
          .from('tickets')
          .select('id, buyer_id, order_id, attendee_first_name, attendee_last_name, ticket_code')
          .eq('order_id', order?.order_id as string)
        expect(ticketError).toBeNull()
        expect(tickets?.length).toBe(2)
        expect(tickets?.every((ticket) => ticket.buyer_id === buyerA.id)).toBe(true)
        expect(tickets?.map((ticket) => ticket.attendee_first_name).sort()).toEqual([
          'Luigi',
          'Mario'
        ])

        const tooMany = await buy(
          buyerA,
          ticketTypeId,
          Array.from({ length: 5 }, (_, index) => attendee(`Fan${index}`, 'Five'))
        ).catch((error: Error) => error)
        expect(tooMany instanceof Error ? tooMany.message : '').toContain('between one and four')

        const fanCardType = await createTicketType(owner, eventId, {
          allocation: 5,
          requiresFanCard: true
        })
        const noCard = await buy(buyerB, fanCardType, [attendee('Senza', 'Tessera')]).catch(
          (error: Error) => error
        )
        expect(noCard instanceof Error ? noCard.message : '').toContain('fan card required')

        const cardNumber = `CARD-${randomUUID().slice(0, 8)}`
        const card = await owner.client.rpc('issue_club_fan_card', {
          p_club_id: clubId,
          p_card_number: cardNumber,
          p_profile_id: buyerB.id
        })
        expect(card.error).toBeNull()

        const withCard = await buy(buyerB, fanCardType, [
          attendee('Con', 'Tessera', { fan_card_number: cardNumber })
        ])
        expect(withCard?.order_id).toBeTruthy()

        const ticketId = (order?.ticket_ids as string[])[0]
        const transfer = await buyerA.client.rpc('transfer_ticket', {
          p_ticket_id: ticketId,
          p_new_attendee: attendee('Nuovo', 'Titolare')
        })
        expect(transfer.error).toBeNull()

        const { data: transferred } = await admin
          .from('tickets')
          .select('attendee_first_name, attendee_last_name')
          .eq('id', ticketId)
          .single()
        expect(transferred?.attendee_first_name).toBe('Nuovo')
        expect(transferred?.attendee_last_name).toBe('Titolare')

        const checkIn = await owner.client.rpc('check_in_ticket', {
          p_ticket_code: (order?.ticket_codes as string[])[0]
        })
        expect(checkIn.error).toBeNull()
        expect(first(checkIn.data)?.already_checked_in).toBe(false)

        const secondCheckIn = await owner.client.rpc('check_in_ticket', {
          p_ticket_code: (order?.ticket_codes as string[])[0]
        })
        expect(secondCheckIn.error).toBeNull()
        expect(first(secondCheckIn.data)?.already_checked_in).toBe(true)

        const boxOffice = await owner.client.rpc('box_office_sell', {
          p_ticket_type_id: ticketTypeId,
          p_buyer_id: buyerB.id,
          p_attendees: [attendee('Box', 'Office')],
          p_accept_terms: true,
          p_request_id: randomUUID()
        })
        expect(boxOffice.error).toBeNull()
        const boxOrder = first(boxOffice.data)
        const { data: boxOrderRow } = await admin
          .from('ticket_orders')
          .select('channel')
          .eq('id', boxOrder?.order_id as string)
          .single()
        expect(boxOrderRow?.channel).toBe('BOX_OFFICE')
      } finally {
        await cleanupClub(clubId)
        await deleteUsers([owner, buyerA, buyerB])
      }
    },
    TEST_TIMEOUT_MS
  )
})

describe('v3 club isolation and prediction privacy', () => {
  test(
    'one club cannot read another club attendees or insights, and prediction data is aggregate',
    async () => {
      const ownerA = await createUser()
      const ownerB = await createUser()
      const fanA = await createUser()
      const fanB = await createUser()
      let clubA: string | null = null
      let clubB: string | null = null

      try {
        clubA = await createClub(ownerA, 'Isolation A', 'PRO')
        clubB = await createClub(ownerB, 'Isolation B', 'PRO')
        const eventA = await createEvent(ownerA, clubA)
        const typeA = await createTicketType(ownerA, eventA, { allocation: 10 })
        await publishEvent(ownerA, eventA)

        await buy(fanA, typeA, [attendee('Fan', 'A')])
        await buy(fanB, typeA, [attendee('Fan', 'B')])

        const match = await ownerA.client.rpc('create_club_match', {
          p_event_id: eventA,
          p_home_team: 'Home A',
          p_away_team: 'Away A',
          p_kickoff: new Date(Date.now() - 3_600_000).toISOString(),
          p_prediction_enabled: true
        })
        expect(match.error).toBeNull()
        const marketId = String(first(match.data)?.market_id)

        const tradeA = await fanA.client.rpc('open_trade', {
          p_market_id: marketId,
          p_outcome: 'HOME',
          p_budget: 50,
          p_request_id: randomUUID()
        })
        expect(tradeA.error).toBeNull()
        const tradeB = await fanB.client.rpc('open_trade', {
          p_market_id: marketId,
          p_outcome: 'AWAY',
          p_budget: 50,
          p_request_id: randomUUID()
        })
        expect(tradeB.error).toBeNull()

        const insights = await ownerA.client.rpc('club_prediction_insights', {
          p_club_id: clubA,
          p_event_id: eventA
        })
        expect(insights.error).toBeNull()
        const insightRows = insights.data as Row[]
        expect(insightRows.length).toBeGreaterThan(0)
        expect(insightRows.every((row) => row.suppressed === true)).toBe(true)
        expect(insightRows[0]).not.toHaveProperty('attendee_first_name')

        const crossAttendees = await ownerB.client.rpc('list_club_attendees', {
          p_event_id: eventA
        })
        expect(crossAttendees.error?.message).toContain('club authorization required')

        const crossInsights = await ownerB.client.rpc('club_prediction_insights', {
          p_club_id: clubA,
          p_event_id: eventA
        })
        expect(crossInsights.error?.message).toContain('club authorization required')

        const { data: crossOrders, error: crossOrdersError } = await ownerB.client
          .from('ticket_orders')
          .select('id')
          .eq('event_id', eventA)
        expect(crossOrdersError).toBeNull()
        expect(crossOrders).toEqual([])

        const { data: ownOrders, error: ownOrdersError } = await fanA.client
          .from('ticket_orders')
          .select('id, buyer_id')
          .eq('event_id', eventA)
        expect(ownOrdersError).toBeNull()
        expect(ownOrders?.length).toBe(1)
        expect(ownOrders?.[0]?.buyer_id).toBe(fanA.id)

        expect(clubB).toBeTruthy()
      } finally {
        await cleanupClub(clubA)
        await cleanupClub(clubB)
        await deleteUsers([ownerA, ownerB, fanA, fanB])
      }
    },
    TEST_TIMEOUT_MS
  )
})

describe('v3 platform admin', () => {
  test(
    'platform admin assigns a plan and the action is audited; a club owner cannot do it',
    async () => {
      const owner = await createUser()
      const platformAdmin = await createUser()
      let clubId: string | null = null

      try {
        clubId = await createClub(owner, 'Admin Audit Club', 'STARTER')
        await admin.from('platform_admins').insert({ profile_id: platformAdmin.id })

        const denied = await owner.client.rpc('admin_assign_plan', {
          p_club_id: clubId,
          p_plan_code: 'ELITE',
          p_status: 'ACTIVE'
        })
        expect(denied.error?.message).toContain('platform admin authorization required')

        const assigned = await platformAdmin.client.rpc('admin_assign_plan', {
          p_club_id: clubId,
          p_plan_code: 'ELITE',
          p_status: 'ACTIVE'
        })
        expect(assigned.error).toBeNull()

        const { data: subscription } = await admin
          .from('club_subscriptions')
          .select('plan_code, status')
          .eq('club_id', clubId)
          .single()
        expect(subscription?.plan_code).toBe('ELITE')
        expect(subscription?.status).toBe('ACTIVE')

        const audit = await platformAdmin.client.rpc('admin_list_audit', { p_limit: 20 })
        expect(audit.error).toBeNull()
        expect(
          (audit.data as Row[]).some(
            (row) => row.action === 'admin.plan.assign' && row.club_id === clubId
          )
        ).toBe(true)
      } finally {
        await cleanupClub(clubId)
        await deleteUsers([owner, platformAdmin])
      }
    },
    TEST_TIMEOUT_MS
  )
})
