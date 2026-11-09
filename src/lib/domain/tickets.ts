import type { SupabaseClient } from '@supabase/supabase-js'
import { DomainError } from './errors'
import { callRpc, first } from './rpc'
import type {
  AttendeeInput,
  CheckInResult,
  ClubAttendee,
  ClubOrder,
  FanCard,
  MyTicket,
  PurchaseResult
} from './types'

export function validateAttendees(attendees: AttendeeInput[]): void {
  if (attendees.length < 1 || attendees.length > 4) {
    throw new DomainError('VALIDATION', 'Between one and four tickets are allowed.')
  }

  for (const attendee of attendees) {
    if (
      !attendee.first_name?.trim() ||
      !attendee.last_name?.trim() ||
      !attendee.date_of_birth ||
      !attendee.place_of_birth?.trim() ||
      (!attendee.tax_code?.trim() && !attendee.document?.trim())
    ) {
      throw new DomainError(
        'VALIDATION',
        'Each attendee requires first name, last name, date of birth, place of birth and a tax code or document.'
      )
    }
  }
}

export async function purchaseTickets(
  client: SupabaseClient,
  ticketTypeId: string,
  attendees: AttendeeInput[],
  requestId: string,
  options: { channel?: 'WEB' | 'BOX_OFFICE'; buyerId?: string | null; acceptTerms?: boolean } = {}
): Promise<PurchaseResult> {
  validateAttendees(attendees)

  if (options.acceptTerms !== true) {
    throw new DomainError('VALIDATION', 'Ticket terms must be accepted with --accept-terms.')
  }

  const rows = await callRpc<PurchaseResult[]>(client, 'purchase_ticket', {
    p_ticket_type_id: ticketTypeId,
    p_attendees: attendees,
    p_accept_terms: true,
    p_request_id: requestId,
    p_channel: options.channel ?? 'WEB',
    p_buyer_id: options.buyerId ?? null
  })

  const result = first(rows)
  if (!result) throw new Error('Ticket purchase returned no order.')
  return result
}

export async function boxOfficeSell(
  client: SupabaseClient,
  ticketTypeId: string,
  buyerId: string,
  attendees: AttendeeInput[],
  requestId: string,
  acceptTerms = false
): Promise<PurchaseResult> {
  validateAttendees(attendees)

  if (!acceptTerms) {
    throw new DomainError('VALIDATION', 'Ticket terms must be accepted with --accept-terms.')
  }

  const rows = await callRpc<PurchaseResult[]>(client, 'box_office_sell', {
    p_ticket_type_id: ticketTypeId,
    p_buyer_id: buyerId,
    p_attendees: attendees,
    p_accept_terms: true,
    p_request_id: requestId
  })

  const result = first(rows)
  if (!result) throw new Error('Box-office sale returned no order.')
  return result
}

export async function listMyTickets(client: SupabaseClient): Promise<MyTicket[]> {
  return callRpc<MyTicket[]>(client, 'list_my_tickets')
}

export async function transferTicket(
  client: SupabaseClient,
  ticketId: string,
  attendee: AttendeeInput
): Promise<void> {
  validateAttendees([attendee])
  await callRpc<void>(client, 'transfer_ticket', {
    p_ticket_id: ticketId,
    p_new_attendee: attendee
  })
}

export async function checkInTicket(
  client: SupabaseClient,
  ticketCode: string
): Promise<CheckInResult> {
  const rows = await callRpc<CheckInResult[]>(client, 'check_in_ticket', {
    p_ticket_code: ticketCode
  })
  const result = first(rows)
  if (!result) throw new Error('Check-in returned no ticket.')
  return result
}

export async function listClubAttendees(
  client: SupabaseClient,
  eventId: string
): Promise<ClubAttendee[]> {
  return callRpc<ClubAttendee[]>(client, 'list_club_attendees', { p_event_id: eventId })
}

export async function listClubOrders(
  client: SupabaseClient,
  eventId: string
): Promise<ClubOrder[]> {
  return callRpc<ClubOrder[]>(client, 'list_club_orders', { p_event_id: eventId })
}

export async function issueFanCard(
  client: SupabaseClient,
  clubId: string,
  cardNumber: string,
  profileId?: string | null
): Promise<string> {
  return callRpc<string>(client, 'issue_club_fan_card', {
    p_club_id: clubId,
    p_card_number: cardNumber,
    p_profile_id: profileId ?? null
  })
}

export async function listFanCards(
  client: SupabaseClient,
  clubId: string
): Promise<FanCard[]> {
  return callRpc<FanCard[]>(client, 'list_club_fan_cards', { p_club_id: clubId })
}
