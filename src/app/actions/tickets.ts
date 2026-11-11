'use server'

import { randomUUID } from 'node:crypto'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { getCurrentUser } from '@/lib/session'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { attempt, back, checked, requiredNumber, requiredText, text } from './form'
import {
  checkInTicket,
  issueFanCard,
  purchaseTickets,
  transferTicket,
  validateAttendees
} from '@/lib/domain/tickets'
import type { AttendeeInput } from '@/lib/domain/types'

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export type ActionResult = { success: boolean; message: string; code?: string }

function describe(error: string): string {
  if (error.includes('authentication required')) return 'Sign in required.'
  if (error.includes('ticket already claimed')) return 'You already claimed a ticket for this tournament.'
  if (error.includes('tickets sold out')) return 'Tickets are sold out.'
  if (error.includes('tournament not found')) return 'Tournament not found.'
  return 'The action could not be completed. Please try again.'
}

function attendeeFrom(formData: FormData, index: number): AttendeeInput {
  return {
    first_name: text(formData, `attendee-${index}-first_name`) ?? '',
    last_name: text(formData, `attendee-${index}-last_name`) ?? '',
    date_of_birth: text(formData, `attendee-${index}-date_of_birth`) ?? '',
    place_of_birth: text(formData, `attendee-${index}-place_of_birth`) ?? '',
    tax_code: text(formData, `attendee-${index}-tax_code`) ?? undefined,
    document: text(formData, `attendee-${index}-document`) ?? undefined,
    fan_card_number: text(formData, `attendee-${index}-fan_card_number`) ?? undefined
  }
}

export async function claimTicket(formData: FormData): Promise<ActionResult> {
  const tournamentId = formData.get('tournamentId')
  if (typeof tournamentId !== 'string' || !UUID_PATTERN.test(tournamentId)) {
    return { success: false, message: 'Invalid tournament.' }
  }

  const user = await getCurrentUser()
  if (!user) return { success: false, message: 'Sign in required.' }

  const supabase = await createSupabaseServerClient()
  const { data, error } = await supabase.rpc('claim_ticket', { p_tournament_id: tournamentId })

  if (error) return { success: false, message: describe(error.message) }

  const row = Array.isArray(data) ? data[0] : data
  revalidatePath('/fan')
  revalidatePath('/fan/tournaments')
  return {
    success: true,
    message: `Ticket claimed. +${row?.points_awarded ?? 0} points.`,
    code: String(row?.ticket_id ?? '')
  }
}

export async function purchaseTicketAction(formData: FormData): Promise<never> {
  const eventId = requiredText(formData, 'eventId')
  const path = `/events/${eventId}`
  const user = await getCurrentUser()

  if (!user) {
    redirect(`/login?next=${encodeURIComponent(path)}`)
  }

  const quantity = requiredNumber(formData, 'quantity')
  if (quantity < 1 || quantity > 4) {
    back(path, 'error', 'Choose between one and four tickets.')
  }

  const result = await attempt(async () => {
    const attendees = Array.from({ length: quantity }, (_, index) =>
      attendeeFrom(formData, index)
    )
    validateAttendees(attendees)

    const supabase = await createSupabaseServerClient()
    await purchaseTickets(
      supabase,
      requiredText(formData, 'ticketTypeId'),
      attendees,
      text(formData, 'requestId') ?? randomUUID(),
      { acceptTerms: checked(formData, 'acceptTerms') }
    )
  })

  if (!result.ok) back(path, 'error', result.error)

  revalidatePath('/fan/tickets')
  back('/fan/tickets', 'message', 'Tickets purchased.')
}

export async function transferTicketAction(formData: FormData): Promise<never> {
  const path = '/fan/tickets'
  const result = await attempt(async () => {
    const supabase = await createSupabaseServerClient()
    await transferTicket(supabase, requiredText(formData, 'ticketId'), attendeeFrom(formData, 0))
  })

  if (!result.ok) back(path, 'error', result.error)

  revalidatePath(path)
  back(path, 'message', 'Ticket transferred.')
}

export async function checkInAction(formData: FormData): Promise<never> {
  const eventId = requiredText(formData, 'eventId')
  const path = `/club/events/${eventId}`
  const result = await attempt(async () => {
    const supabase = await createSupabaseServerClient()
    return checkInTicket(supabase, requiredText(formData, 'code'))
  })

  if (!result.ok) back(path, 'error', result.error)

  revalidatePath(path)
  back(
    path,
    'message',
    result.data.already_checked_in
      ? `Already checked in at ${result.data.checked_in_at}.`
      : `Checked in ${result.data.attendee_name}.`
  )
}

export async function issueFanCardAction(formData: FormData): Promise<never> {
  const clubId = requiredText(formData, 'clubId')
  const path = `/club/dashboard?club=${clubId}`
  const result = await attempt(async () => {
    const supabase = await createSupabaseServerClient()
    await issueFanCard(
      supabase,
      clubId,
      requiredText(formData, 'cardNumber'),
      text(formData, 'profileId') ?? undefined
    )
  })

  if (!result.ok) back(path, 'error', result.error)

  revalidatePath(path)
  back(path, 'message', 'Fan card issued.')
}
