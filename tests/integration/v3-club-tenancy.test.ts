/**
 * v3.0.0 database contract: club tenancy, plans/entitlements, nominal
 * ticketing, transfer, check-in, box office, isolation and admin audit.
 *
 * These tests use a real local Supabase/PostgreSQL boundary.
 */
import { describe, expect, test } from 'bun:test'
import { randomUUID } from 'crypto'
import { admin, createUser, createUsers, deleteUsers, type TestUser } from '../support/auth'
import { createTournament, deleteTournament, setPoints } from '../support/fixtures'

const TEST_TIMEOUT_MS = 60_000

type Row = Record<string, unknown>

function percentile(values: number[], fraction: number): number {
  if (values.length === 0) return Number.NaN
  const sorted = [...values].sort((a, b) => a - b)
  const index = Math.min(sorted.length - 1, Math.ceil(fraction * sorted.length) - 1)
  return sorted[index]
}

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

describe('v3 attendee retention', () => {
  test(
    'clears identity from past tickets only and refuses authenticated execution',
    async () => {
      const owner = await createUser()
      const fan = await createUser()
      let clubId: string | null = null

      try {
        clubId = await createClub(owner, 'Retention Club', 'PRO')
        const oldEvent = await createEvent(owner, clubId)
        const oldType = await createTicketType(owner, oldEvent, { allocation: 10 })
        await publishEvent(owner, oldEvent)
        const oldOrder = await buy(fan, oldType, [attendee('Old', 'Attendee')])
        const oldTicketId = (oldOrder?.ticket_ids as string[])[0]
        const transfer = await fan.client.rpc('transfer_ticket', {
          p_ticket_id: oldTicketId,
          p_new_attendee: attendee('New', 'Attendee')
        })
        expect(transfer.error).toBeNull()

        const cardNumber = `RET-${randomUUID()}`
        const card = await owner.client.rpc('issue_club_fan_card', {
          p_club_id: clubId,
          p_card_number: cardNumber
        })
        expect(card.error).toBeNull()
        const cardId = String(card.data)

        const invite = await owner.client.rpc('invite_club_member', {
          p_club_id: clubId,
          p_email: `retention-${randomUUID()}@matchpulse.local`,
          p_role: 'STAFF'
        })
        expect(invite.error).toBeNull()
        const inviteId = String(first(invite.data)?.invite_id)

        const oldCreatedAt = new Date(Date.now() - 400 * 86_400_000).toISOString()
        await admin
          .from('audit_events')
          .update({ created_at: oldCreatedAt, metadata: { card_number: cardNumber } })
          .eq('action', 'club.fan_card.issue')
          .eq('entity_id', cardId)
        await admin
          .from('club_invites')
          .update({ expires_at: oldCreatedAt })
          .eq('id', inviteId)

        const recentEvent = await createEvent(owner, clubId)
        const recentType = await createTicketType(owner, recentEvent, { allocation: 10 })
        await publishEvent(owner, recentEvent)
        await buy(fan, recentType, [attendee('Recent', 'Attendee')])

        await admin
          .from('tournaments')
          .update({ created_at: new Date(Date.now() - 400 * 86_400_000).toISOString() })
          .eq('id', oldEvent)

        const cleanup = await admin.rpc('cleanup_expired_attendee_data', {
          p_older_than: '365 days'
        })
        expect(cleanup.error).toBeNull()
        expect(Number(cleanup.data)).toBeGreaterThanOrEqual(1)

        const { data: oldTicket } = await admin
          .from('tickets')
          .select('attendee_first_name, attendee_last_name, attendee_tax_code, ticket_code, order_id')
          .eq('order_id', oldOrder?.order_id as string)
          .single()
        expect(oldTicket?.attendee_first_name).toBeNull()
        expect(oldTicket?.attendee_last_name).toBeNull()
        expect(oldTicket?.attendee_tax_code).toBeNull()
        expect(oldTicket?.ticket_code).toBeTruthy()
        expect(oldTicket?.order_id).toBe(oldOrder?.order_id)

        const { data: transferRows } = await admin
          .from('ticket_transfers')
          .select('previous_first_name, previous_last_name, previous_tax_code, new_first_name, new_last_name, new_tax_code')
          .eq('ticket_id', oldTicketId)
        expect(transferRows?.length).toBe(1)
        expect(transferRows?.[0]?.previous_first_name).toBeNull()
        expect(transferRows?.[0]?.previous_last_name).toBeNull()
        expect(transferRows?.[0]?.previous_tax_code).toBeNull()
        expect(transferRows?.[0]?.new_first_name).toBeNull()
        expect(transferRows?.[0]?.new_last_name).toBeNull()
        expect(transferRows?.[0]?.new_tax_code).toBeNull()

        const { data: cardAudit } = await admin
          .from('audit_events')
          .select('metadata')
          .eq('action', 'club.fan_card.issue')
          .eq('entity_id', cardId)
          .single()
        expect(cardAudit?.metadata).not.toHaveProperty('card_number')

        const { data: invitesAfter } = await admin
          .from('club_invites')
          .select('id')
          .eq('id', inviteId)
        expect(invitesAfter).toEqual([])

        const { data: recentTicket } = await admin
          .from('tickets')
          .select('attendee_first_name, attendee_last_name')
          .eq('tournament_id', recentEvent)
          .single()
        expect(recentTicket?.attendee_first_name).toBe('Recent')
        expect(recentTicket?.attendee_last_name).toBe('Attendee')

        const { data: audit } = await admin
          .from('audit_events')
          .select('id')
          .eq('action', 'attendee.retention')
        expect((audit ?? []).length).toBeGreaterThanOrEqual(1)

        const denied = await fan.client.rpc('cleanup_expired_attendee_data', {
          p_older_than: '365 days'
        })
        expect(denied.error).not.toBeNull()
      } finally {
        await cleanupClub(clubId)
        await deleteUsers([owner, fan])
      }
    },
    TEST_TIMEOUT_MS
  )
})

describe('v3 security boundary', () => {
  test(
    'removed staff cannot read attendee tickets and legacy organizer direct registration reads are closed',
    async () => {
      const owner = await createUser()
      const staff = await createUser()
      const buyer = await createUser()
      const organizer = await createUser('ORGANIZER')
      let clubId: string | null = null
      let legacyTournamentId: string | null = null

      try {
        clubId = await createClub(owner, 'Security Boundary Club', 'PRO')
        await admin.from('club_members').insert({
          club_id: clubId,
          profile_id: staff.id,
          role: 'STAFF'
        })

        const eventId = await createEvent(staff, clubId)
        const ticketTypeId = await createTicketType(owner, eventId, { allocation: 5 })
        await publishEvent(owner, eventId)
        const order = await buy(buyer, ticketTypeId, [attendee('Secure', 'Attendee')])

        const staffView = await staff.client
          .from('tickets')
          .select('id')
          .eq('order_id', order?.order_id as string)
        expect(staffView.error).toBeNull()
        expect(staffView.data?.length).toBe(1)

        const removed = await owner.client.rpc('remove_club_member', {
          p_club_id: clubId,
          p_profile_id: staff.id
        })
        expect(removed.error).toBeNull()

        const staffAfterRemoval = await staff.client
          .from('tickets')
          .select('id')
          .eq('order_id', order?.order_id as string)
        expect(staffAfterRemoval.error).toBeNull()
        expect(staffAfterRemoval.data).toEqual([])

        const ownerView = await owner.client
          .from('tickets')
          .select('id')
          .eq('order_id', order?.order_id as string)
        expect(ownerView.error).toBeNull()
        expect(ownerView.data?.length).toBe(1)

        legacyTournamentId = await createTournament(20, organizer.id)
        await admin.from('registrations').insert({
          tournament_id: legacyTournamentId,
          user_id: buyer.id
        })

        const directRegistrations = await organizer.client
          .from('registrations')
          .select('id')
          .eq('tournament_id', legacyTournamentId)
        expect(directRegistrations.error).toBeNull()
        expect(directRegistrations.data).toEqual([])

        const organizerRpc = await organizer.client.rpc('organizer_tournament_registrations', {
          p_tournament_id: legacyTournamentId
        })
        expect(organizerRpc.error).toBeNull()
        expect((organizerRpc.data as Row[]).length).toBe(1)
      } finally {
        if (legacyTournamentId) await deleteTournament(legacyTournamentId)
        await cleanupClub(clubId)
        await deleteUsers([owner, staff, buyer, organizer])
      }
    },
    TEST_TIMEOUT_MS
  )

  test(
    'platform admin cannot directly read invitations or fan cards',
    async () => {
      const owner = await createUser()
      const platformAdmin = await createUser()
      let clubId: string | null = null

      try {
        clubId = await createClub(owner, 'Admin Boundary Club', 'PRO')
        await admin.from('platform_admins').insert({ profile_id: platformAdmin.id })

        const invite = await owner.client.rpc('invite_club_member', {
          p_club_id: clubId,
          p_email: `invite-${randomUUID()}@matchpulse.local`,
          p_role: 'STAFF'
        })
        expect(invite.error).toBeNull()

        const card = await owner.client.rpc('issue_club_fan_card', {
          p_club_id: clubId,
          p_card_number: `CARD-${randomUUID()}`
        })
        expect(card.error).toBeNull()

        const adminInvites = await platformAdmin.client
          .from('club_invites')
          .select('id')
          .eq('club_id', clubId)
        expect(adminInvites.error).toBeNull()
        expect(adminInvites.data).toEqual([])

        const adminCards = await platformAdmin.client
          .from('club_fan_cards')
          .select('id')
          .eq('club_id', clubId)
        expect(adminCards.error).toBeNull()
        expect(adminCards.data).toEqual([])

        const ownerInvites = await owner.client
          .from('club_invites')
          .select('id')
          .eq('club_id', clubId)
        expect(ownerInvites.error).toBeNull()
        expect(ownerInvites.data?.length).toBe(1)

        const ownerCards = await owner.client
          .from('club_fan_cards')
          .select('id')
          .eq('club_id', clubId)
        expect(ownerCards.error).toBeNull()
        expect(ownerCards.data?.length).toBe(1)
      } finally {
        await cleanupClub(clubId)
        await deleteUsers([owner, platformAdmin])
      }
    },
    TEST_TIMEOUT_MS
  )
})

describe('v3 ticket integrity', () => {
  test(
    'caps a buyer cumulatively and refuses legacy paths on v3 events',
    async () => {
      const owner = await createUser()
      const buyer = await createUser()
      let clubId: string | null = null

      try {
        clubId = await createClub(owner, 'Ticket Integrity Club', 'PRO')
        const eventId = await createEvent(owner, clubId, 20)
        const typeId = await createTicketType(owner, eventId, { allocation: 20 })
        await publishEvent(owner, eventId)

        const first = await buy(
          buyer,
          typeId,
          Array.from({ length: 4 }, (_, index) => attendee(`Fan${index}`, 'Limit'))
        )
        expect(first?.order_id).toBeTruthy()

        const fifth = await buy(buyer, typeId, [attendee('Fifth', 'Ticket')]).catch(
          (error: Error) => error
        )
        expect(fifth instanceof Error ? fifth.message : '').toContain('maximum per buyer')

        const oversized = await owner.client.rpc('create_club_event', {
          p_club_id: clubId,
          p_name: 'Too Big',
          p_max_capacity: 2,
          p_ticket_allocation: 3,
          p_ticket_points: 0
        })
        expect(oversized.error?.message).toContain('allocation cannot exceed')

        const claim = await buyer.client.rpc('claim_ticket', { p_tournament_id: eventId })
        expect(claim.error?.message).toContain('legacy claim is not available')

        const registration = await buyer.client.rpc('register_for_tournament', {
          p_tournament_id: eventId
        })
        expect(registration.error).toBeNull()
        expect(registration.data).toBe(false)
      } finally {
        await cleanupClub(clubId)
        await deleteUsers([owner, buyer])
      }
    },
    TEST_TIMEOUT_MS
  )

  test(
    'concurrent orders cannot exceed the cumulative buyer cap',
    async () => {
      const owner = await createUser()
      const buyer = await createUser()
      let clubId: string | null = null

      try {
        clubId = await createClub(owner, 'Concurrent Cap Club', 'PRO')
        const eventId = await createEvent(owner, clubId, 20)
        const typeId = await createTicketType(owner, eventId, { allocation: 20 })
        await publishEvent(owner, eventId)

        const results = await Promise.allSettled([
          buy(
            buyer,
            typeId,
            Array.from({ length: 3 }, (_, index) => attendee(`First${index}`, 'Order')),
            randomUUID()
          ),
          buy(
            buyer,
            typeId,
            Array.from({ length: 3 }, (_, index) => attendee(`Second${index}`, 'Order')),
            randomUUID()
          )
        ])

        expect(results.filter((result) => result.status === 'fulfilled').length).toBe(1)

        const { data: tickets } = await admin
          .from('tickets')
          .select('id')
          .eq('tournament_id', eventId)
        expect(tickets?.length).toBe(3)
      } finally {
        await cleanupClub(clubId)
        await deleteUsers([owner, buyer])
      }
    },
    TEST_TIMEOUT_MS
  )
})

describe('v3 ticket payload idempotency', () => {
  test(
    'replays an identical payload and refuses changed attendee data',
    async () => {
      const owner = await createUser()
      const buyer = await createUser()
      let clubId: string | null = null

      try {
        clubId = await createClub(owner, 'Payload Idempotency Club', 'PRO')
        const eventId = await createEvent(owner, clubId, 10)
        const typeId = await createTicketType(owner, eventId, { allocation: 10 })
        await publishEvent(owner, eventId)

        const requestId = randomUUID()
        const attendeeData = attendee('Same', 'Person')
        const first = await buy(buyer, typeId, [attendeeData], requestId)
        expect(first?.order_id).toBeTruthy()

        const replay = await buy(buyer, typeId, [attendeeData], requestId)
        expect(replay?.order_id).toBe(first?.order_id)

        const changed = await buy(
          buyer,
          typeId,
          [attendee('Changed', 'Person')],
          requestId
        ).catch((error: Error) => error)
        expect(changed instanceof Error ? changed.message : '').toContain(
          'request id reused with a different payload'
        )

        const { data: orders } = await admin
          .from('ticket_orders')
          .select('id')
          .eq('buyer_id', buyer.id)
        expect(orders?.length).toBe(1)
      } finally {
        await cleanupClub(clubId)
        await deleteUsers([owner, buyer])
      }
    },
    TEST_TIMEOUT_MS
  )
})

describe('v3 prediction cohort privacy', () => {
  test(
    'suppresses each outcome cohort below five even when the market has five traders',
    async () => {
      const owner = await createUser()
      const fans = await Promise.all(Array.from({ length: 9 }, () => createUser('FAN')))
      let clubId: string | null = null

      try {
        clubId = await createClub(owner, 'Cohort Privacy Club', 'PRO')
        const eventId = await createEvent(owner, clubId, 20)
        const match = await owner.client.rpc('create_club_match', {
          p_event_id: eventId,
          p_home_team: 'Cohort Home',
          p_away_team: 'Cohort Away',
          p_kickoff: new Date(Date.now() - 3_600_000).toISOString(),
          p_prediction_enabled: true
        })
        expect(match.error).toBeNull()
        const marketId = String(first(match.data)?.market_id)

        await Promise.all(fans.map((fan) => setPoints(fan.id, 200)))

        const outcomes = ['HOME', 'DRAW', 'DRAW', 'AWAY', 'AWAY']
        for (let index = 0; index < outcomes.length; index += 1) {
          const trade = await fans[index].client.rpc('open_trade', {
            p_market_id: marketId,
            p_outcome: outcomes[index],
            p_budget: 10,
            p_request_id: randomUUID()
          })
          expect(trade.error).toBeNull()
        }

        const firstInsights = await owner.client.rpc('club_prediction_insights', {
          p_club_id: clubId,
          p_event_id: eventId
        })
        expect(firstInsights.error).toBeNull()
        const firstRows = firstInsights.data as Row[]
        expect(firstRows.every((row) => row.suppressed === true)).toBe(true)
        expect(
          firstRows.every(
            (row) =>
              row.trades === null &&
              row.shares === null &&
              row.last_price === null &&
              row.unique_predictors === null
          )
        ).toBe(true)

        for (let index = 5; index < 9; index += 1) {
          const trade = await fans[index].client.rpc('open_trade', {
            p_market_id: marketId,
            p_outcome: 'HOME',
            p_budget: 10,
            p_request_id: randomUUID()
          })
          expect(trade.error).toBeNull()
        }

        const secondInsights = await owner.client.rpc('club_prediction_insights', {
          p_club_id: clubId,
          p_event_id: eventId
        })
        expect(secondInsights.error).toBeNull()
        const secondRows = secondInsights.data as Row[]
        const home = secondRows.find((row) => row.outcome === 'HOME')
        expect(home?.suppressed).toBe(false)
        expect(Number(home?.unique_predictors)).toBe(5)
        expect(home?.trades).not.toBeNull()
        expect(home?.shares).not.toBeNull()
        expect(home?.last_price).not.toBeNull()
        expect(
          secondRows
            .filter((row) => row.outcome !== 'HOME')
            .every(
              (row) =>
                row.suppressed === true &&
                row.trades === null &&
                row.shares === null &&
                row.last_price === null &&
                row.unique_predictors === null
            )
        ).toBe(true)
      } finally {
        await cleanupClub(clubId)
        await deleteUsers([owner, ...fans])
      }
    },
    TEST_TIMEOUT_MS
  )
})

describe('v3 subscription limits', () => {
  test(
    'an inactive subscription cannot create events or invite members',
    async () => {
      const owner = await createUser()
      let clubId: string | null = null

      try {
        clubId = await createClub(owner, 'Inactive Plan Club', 'PRO')
        await admin
          .from('club_subscriptions')
          .update({ status: 'CANCELED' })
          .eq('club_id', clubId)

        const event = await owner.client.rpc('create_club_event', {
          p_club_id: clubId,
          p_name: 'Blocked Event',
          p_max_capacity: 10,
          p_ticket_allocation: 10,
          p_ticket_points: 0
        })
        expect(event.error?.message).toContain('plan entitlement required: max_active_events')

        const invite = await owner.client.rpc('invite_club_member', {
          p_club_id: clubId,
          p_email: `blocked-${randomUUID()}@matchpulse.local`,
          p_role: 'STAFF'
        })
        expect(invite.error?.message).toContain('plan entitlement required: max_members')
      } finally {
        await cleanupClub(clubId)
        await deleteUsers([owner])
      }
    },
    TEST_TIMEOUT_MS
  )

  test(
    'concurrent event creation cannot exceed the active-event limit',
    async () => {
      const owner = await createUser()
      let clubId: string | null = null

      try {
        clubId = await createClub(owner, 'Concurrent Plan Club', 'STARTER')

        const results = await Promise.allSettled(
          Array.from({ length: 4 }, (_, index) =>
            owner.client.rpc('create_club_event', {
              p_club_id: clubId,
              p_name: `Concurrent ${index}`,
              p_max_capacity: 10,
              p_ticket_allocation: 10,
              p_ticket_points: 0
            })
          )
        )

        const successes = results.filter(
          (result) => result.status === 'fulfilled' && result.value.error === null
        ).length
        expect(successes).toBe(3)
        const { data: events } = await admin
          .from('tournaments')
          .select('id')
          .eq('club_id', clubId)
          .in('status', ['DRAFT', 'PUBLISHED'])
        expect(events?.length).toBe(3)
      } finally {
        await cleanupClub(clubId)
        await deleteUsers([owner])
      }
    },
    TEST_TIMEOUT_MS
  )
})

describe('v3 match update validation', () => {
  test(
    'refuses a NULL score instead of persisting a missing result',
    async () => {
      const owner = await createUser()
      let clubId: string | null = null

      try {
        clubId = await createClub(owner, 'Match Validation Club', 'PRO')
        const eventId = await createEvent(owner, clubId)
        const match = await owner.client.rpc('create_club_match', {
          p_event_id: eventId,
          p_home_team: 'Home',
          p_away_team: 'Away',
          p_kickoff: new Date(Date.now() + 3_600_000).toISOString(),
          p_prediction_enabled: false
        })
        expect(match.error).toBeNull()
        const matchId = String(first(match.data)?.match_id)

        const update = await owner.client.rpc('update_club_match', {
          p_match_id: matchId,
          p_home_score: null as unknown as number,
          p_away_score: 0,
          p_status: 'SCHEDULED'
        })
        expect(update.error?.message).toContain('scores must be non-negative')
      } finally {
        await cleanupClub(clubId)
        await deleteUsers([owner])
      }
    },
    TEST_TIMEOUT_MS
  )
})

describe('v3 ticket point caps', () => {
  test(
    'refuses more than 500 points per ticket or 10000 points per event',
    async () => {
      const owner = await createUser()
      let clubId: string | null = null

      try {
        clubId = await createClub(owner, 'Point Cap Club', 'PRO')

        const perTicket = await owner.client.rpc('create_club_event', {
          p_club_id: clubId,
          p_name: 'Too Many Points',
          p_max_capacity: 30,
          p_ticket_allocation: 20,
          p_ticket_points: 501
        })
        expect(perTicket.error?.message).toContain('cannot exceed 500 per ticket')

        const perEvent = await owner.client.rpc('create_club_event', {
          p_club_id: clubId,
          p_name: 'Too Many Event Points',
          p_max_capacity: 30,
          p_ticket_allocation: 21,
          p_ticket_points: 500
        })
        expect(perEvent.error?.message).toContain('cannot exceed 10000 per event')

        const allowed = await owner.client.rpc('create_club_event', {
          p_club_id: clubId,
          p_name: 'At The Cap',
          p_max_capacity: 30,
          p_ticket_allocation: 20,
          p_ticket_points: 500
        })
        expect(allowed.error).toBeNull()
        const eventId = String(allowed.data)

        const updateTicket = await owner.client.rpc('update_club_event', {
          p_event_id: eventId,
          p_name: 'At The Cap',
          p_max_capacity: 30,
          p_ticket_allocation: 20,
          p_ticket_points: 501
        })
        expect(updateTicket.error?.message).toContain('cannot exceed 500 per ticket')

        const updateEvent = await owner.client.rpc('update_club_event', {
          p_event_id: eventId,
          p_name: 'At The Cap',
          p_max_capacity: 30,
          p_ticket_allocation: 21,
          p_ticket_points: 500
        })
        expect(updateEvent.error?.message).toContain('cannot exceed 10000 per event')
      } finally {
        await cleanupClub(clubId)
        await deleteUsers([owner])
      }
    },
    TEST_TIMEOUT_MS
  )
})

describe('v3 ticket purchase burst', () => {
  test(
    '20 concurrent buyers each get one ticket and p95 stays under 1000 ms',
    async () => {
      const owner = await createUser()
      const buyers = await createUsers(20)
      let clubId: string | null = null

      try {
        clubId = await createClub(owner, 'Ticket Burst Club', 'PRO')
        const eventId = await createEvent(owner, clubId, 20)
        const typeId = await createTicketType(owner, eventId, { allocation: 20 })
        await publishEvent(owner, eventId)

        const started = performance.now()
        const results = await Promise.all(
          buyers.map(async (buyer, index) => {
            const callStarted = performance.now()
            const { data, error } = await buyer.client.rpc('purchase_ticket', {
              p_ticket_type_id: typeId,
              p_attendees: [attendee(`Burst${index}`, 'Buyer')],
              p_accept_terms: true,
              p_request_id: randomUUID(),
              p_channel: 'WEB',
              p_buyer_id: null
            })
            return {
              ok: !error,
              row: first(data),
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
            event: 'ticket.burst_latency',
            requests: buyers.length,
            wallClockMs: Number(wallClockMs.toFixed(2)),
            p95Ms: Number(p95.toFixed(2)),
            maxMs: Number(Math.max(...latencies).toFixed(2))
          })
        )

        expect(results.filter((result) => !result.ok).map((result) => result.message)).toEqual([])
        expect(results.every((result) => result.row?.order_id)).toBe(true)
        if (process.env.P95_STRICT !== 'false') {
          expect(p95).toBeLessThan(1000)
        }

        const { data: tickets } = await admin
          .from('tickets')
          .select('id')
          .eq('tournament_id', eventId)
        expect(tickets?.length).toBe(20)
      } finally {
        await cleanupClub(clubId)
        await deleteUsers([owner, ...buyers])
      }
    },
    TEST_TIMEOUT_MS
  )
})
describe('v3 subscription expiry', () => {
  test(
    'keeps entitlements during the 7-day grace then denies them',
    async () => {
      const owner = await createUser()
      let clubId: string | null = null

      try {
        clubId = await createClub(owner, 'Expiry Club', 'PRO')

        await admin
          .from('club_subscriptions')
          .update({
            status: 'ACTIVE',
            current_period_end: new Date(Date.now() - 86_400_000).toISOString()
          })
          .eq('club_id', clubId)

        const firstExpiry = await admin.rpc('expire_subscriptions')
        expect(firstExpiry.error).toBeNull()

        const { data: graceSubscription } = await admin
          .from('club_subscriptions')
          .select('status')
          .eq('club_id', clubId)
          .single()
        expect(graceSubscription?.status).toBe('PAST_DUE')

        const duringGrace = await owner.client.rpc('create_club_event', {
          p_club_id: clubId,
          p_name: 'Grace Event',
          p_max_capacity: 10,
          p_ticket_allocation: 10,
          p_ticket_points: 0
        })
        expect(duringGrace.error).toBeNull()

        await admin
          .from('club_subscriptions')
          .update({
            status: 'ACTIVE',
            current_period_end: new Date(Date.now() - 8 * 86_400_000).toISOString()
          })
          .eq('club_id', clubId)

        const secondExpiry = await admin.rpc('expire_subscriptions')
        expect(secondExpiry.error).toBeNull()

        const afterGrace = await owner.client.rpc('create_club_event', {
          p_club_id: clubId,
          p_name: 'Expired Event',
          p_max_capacity: 10,
          p_ticket_allocation: 10,
          p_ticket_points: 0
        })
        expect(afterGrace.error?.message).toContain(
          'plan entitlement required: max_active_events'
        )
      } finally {
        await cleanupClub(clubId)
        await deleteUsers([owner])
      }
    },
    TEST_TIMEOUT_MS
  )
})

