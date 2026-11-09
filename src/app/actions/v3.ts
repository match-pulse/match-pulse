'use server'

import { randomUUID } from 'node:crypto'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { getCurrentUser } from '@/lib/session'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { DomainError, fromUnknownError } from '@/lib/domain/errors'
import { createClub, requestPlanChange } from '@/lib/domain/clubs'
import {
  createClubEvent,
  createClubMatch,
  createTicketType,
  publishClubEvent,
  setPredictionEnabled,
  updateClubMatch
} from '@/lib/domain/events'
import {
  checkInTicket,
  issueFanCard,
  purchaseTickets,
  transferTicket,
  validateAttendees
} from '@/lib/domain/tickets'
import { adminAssignPlan } from '@/lib/domain/admin'
import type { AttendeeInput } from '@/lib/domain/types'

function text(formData: FormData, key: string): string | null {
  const value = formData.get(key)
  return typeof value === 'string' && value.trim().length > 0 ? value.trim() : null
}

function requiredText(formData: FormData, key: string): string {
  const value = text(formData, key)
  if (!value) throw new DomainError('VALIDATION', `${key} is required.`)
  return value
}

function requiredNumber(formData: FormData, key: string): number {
  const value = Number(text(formData, key))
  if (!Number.isFinite(value)) throw new DomainError('VALIDATION', `${key} must be a number.`)
  return value
}

function optionalNumber(formData: FormData, key: string): number | undefined {
  const value = text(formData, key)
  if (value === null) return undefined
  const number = Number(value)
  if (!Number.isFinite(number)) throw new DomainError('VALIDATION', `${key} must be a number.`)
  return number
}

function checked(formData: FormData, key: string): boolean {
  const value = formData.get(key)
  return value === 'on' || value === 'true' || value === '1'
}

function back(path: string, key: 'message' | 'error', value: string): never {
  const separator = path.includes('?') ? '&' : '?'
  redirect(`${path}${separator}${key}=${encodeURIComponent(value)}`)
}

function messageFor(error: unknown): string {
  return fromUnknownError(error).message
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

export async function createClubAction(formData: FormData): Promise<never> {
  const path = '/club/dashboard'

  try {
    const supabase = await createSupabaseServerClient()
    const clubId = await createClub(
      supabase,
      requiredText(formData, 'name'),
      (text(formData, 'plan') ?? 'STARTER').toUpperCase(),
      text(formData, 'slug') ?? undefined
    )
    revalidatePath(path)
    back(`${path}?club=${clubId}`, 'message', 'Club created.')
  } catch (error) {
    back(path, 'error', messageFor(error))
  }
}

export async function requestPlanAction(formData: FormData): Promise<never> {
  const clubId = requiredText(formData, 'clubId')
  const path = `/club/dashboard?club=${clubId}`

  try {
    const supabase = await createSupabaseServerClient()
    await requestPlanChange(supabase, clubId, requiredText(formData, 'plan').toUpperCase())
    revalidatePath(path)
    back(path, 'message', 'Plan change requested.')
  } catch (error) {
    back(path, 'error', messageFor(error))
  }
}

export async function createEventAction(formData: FormData): Promise<never> {
  const clubId = requiredText(formData, 'clubId')
  const path = `/club/dashboard?club=${clubId}`

  try {
    const supabase = await createSupabaseServerClient()
    const eventId = await createClubEvent(
      supabase,
      clubId,
      requiredText(formData, 'name'),
      requiredNumber(formData, 'capacity'),
      optionalNumber(formData, 'allocation') ?? 100,
      optionalNumber(formData, 'points') ?? 0
    )
    revalidatePath(path)
    revalidatePath(`/club/events/${eventId}`)
    back(`/club/events/${eventId}`, 'message', 'Event created.')
  } catch (error) {
    back(path, 'error', messageFor(error))
  }
}

export async function createTicketTypeAction(formData: FormData): Promise<never> {
  const eventId = requiredText(formData, 'eventId')
  const path = `/club/events/${eventId}`

  try {
    const supabase = await createSupabaseServerClient()
    await createTicketType(supabase, {
      eventId,
      name: requiredText(formData, 'name'),
      priceCents: optionalNumber(formData, 'priceCents') ?? 0,
      allocation: optionalNumber(formData, 'allocation') ?? 0,
      transferDeadline: text(formData, 'transferDeadline') ?? null,
      maxPerBuyer: optionalNumber(formData, 'maxPerBuyer') ?? 4,
      requiresFanCard: checked(formData, 'requiresFanCard'),
      transferable: !checked(formData, 'nonTransferable'),
      awaySector: checked(formData, 'awaySector')
    })
    revalidatePath(path)
    back(path, 'message', 'Ticket type created.')
  } catch (error) {
    back(path, 'error', messageFor(error))
  }
}

export async function publishEventAction(formData: FormData): Promise<never> {
  const eventId = requiredText(formData, 'eventId')
  const path = `/club/events/${eventId}`

  try {
    const supabase = await createSupabaseServerClient()
    await publishClubEvent(supabase, eventId)
    revalidatePath(path)
    revalidatePath('/events')
    back(path, 'message', 'Event published.')
  } catch (error) {
    back(path, 'error', messageFor(error))
  }
}

export async function createMatchAction(formData: FormData): Promise<never> {
  const eventId = requiredText(formData, 'eventId')
  const path = `/club/events/${eventId}`

  try {
    const supabase = await createSupabaseServerClient()
    await createClubMatch(
      supabase,
      eventId,
      requiredText(formData, 'homeTeam'),
      requiredText(formData, 'awayTeam'),
      requiredText(formData, 'kickoff'),
      checked(formData, 'predictions')
    )
    revalidatePath(path)
    back(path, 'message', 'Match created.')
  } catch (error) {
    back(path, 'error', messageFor(error))
  }
}

export async function updateMatchAction(formData: FormData): Promise<never> {
  const eventId = requiredText(formData, 'eventId')
  const path = `/club/events/${eventId}`
  const status = requiredText(formData, 'status').toUpperCase()

  if (status !== 'SCHEDULED' && status !== 'LIVE' && status !== 'FINISHED') {
    back(path, 'error', 'Invalid match status.')
  }

  try {
    const supabase = await createSupabaseServerClient()
    await updateClubMatch(
      supabase,
      requiredText(formData, 'matchId'),
      requiredNumber(formData, 'homeScore'),
      requiredNumber(formData, 'awayScore'),
      status
    )
    revalidatePath(path)
    back(path, 'message', 'Match updated.')
  } catch (error) {
    back(path, 'error', messageFor(error))
  }
}

export async function setPredictionAction(formData: FormData): Promise<never> {
  const eventId = requiredText(formData, 'eventId')
  const path = `/club/events/${eventId}`

  try {
    const supabase = await createSupabaseServerClient()
    await setPredictionEnabled(
      supabase,
      requiredText(formData, 'matchId'),
      checked(formData, 'enabled')
    )
    revalidatePath(path)
    back(path, 'message', 'Prediction setting updated.')
  } catch (error) {
    back(path, 'error', messageFor(error))
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

  try {
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

    revalidatePath('/fan/tickets')
    back('/fan/tickets', 'message', 'Tickets purchased.')
  } catch (error) {
    back(path, 'error', messageFor(error))
  }
}

export async function transferTicketAction(formData: FormData): Promise<never> {
  const path = '/fan/tickets'

  try {
    const supabase = await createSupabaseServerClient()
    await transferTicket(supabase, requiredText(formData, 'ticketId'), attendeeFrom(formData, 0))
    revalidatePath(path)
    back(path, 'message', 'Ticket transferred.')
  } catch (error) {
    back(path, 'error', messageFor(error))
  }
}

export async function checkInAction(formData: FormData): Promise<never> {
  const eventId = requiredText(formData, 'eventId')
  const path = `/club/events/${eventId}`

  try {
    const supabase = await createSupabaseServerClient()
    const result = await checkInTicket(supabase, requiredText(formData, 'code'))
    revalidatePath(path)
    back(
      path,
      'message',
      result.already_checked_in
        ? `Already checked in at ${result.checked_in_at}.`
        : `Checked in ${result.attendee_name}.`
    )
  } catch (error) {
    back(path, 'error', messageFor(error))
  }
}

export async function assignPlanAction(formData: FormData): Promise<never> {
  const path = '/admin'

  try {
    const supabase = await createSupabaseServerClient()
    const status = (text(formData, 'status') ?? 'ACTIVE').toUpperCase()
    if (status !== 'ACTIVE' && status !== 'PAST_DUE' && status !== 'CANCELED') {
      back(path, 'error', 'Invalid subscription status.')
    }

    await adminAssignPlan(
      supabase,
      requiredText(formData, 'clubId'),
      requiredText(formData, 'plan').toUpperCase(),
      status
    )
    revalidatePath(path)
    back(path, 'message', 'Plan assigned.')
  } catch (error) {
    back(path, 'error', messageFor(error))
  }
}

export async function issueFanCardAction(formData: FormData): Promise<never> {
  const clubId = requiredText(formData, 'clubId')
  const path = `/club/dashboard?club=${clubId}`

  try {
    const supabase = await createSupabaseServerClient()
    await issueFanCard(
      supabase,
      clubId,
      requiredText(formData, 'cardNumber'),
      text(formData, 'profileId') ?? undefined
    )
    revalidatePath(path)
    back(path, 'message', 'Fan card issued.')
  } catch (error) {
    back(path, 'error', messageFor(error))
  }
}
