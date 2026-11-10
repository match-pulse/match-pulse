'use server'

import { randomUUID } from 'node:crypto'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { getCurrentUser } from '@/lib/session'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { DomainError, fromUnknownError } from '@/lib/domain/errors'
import { createClub, requestPlanChange, acceptClubInvite, inviteClubMember, removeClubMember, setClubMemberRole } from '@/lib/domain/clubs'
import {
  createClubEvent,
  createClubMatch,
  createTicketType,
  publishClubEvent,
  resolveMarket,
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
import { createClubReward, recordClubExport, redeemReward } from '@/lib/domain/analytics'
import type { AttendeeInput } from '@/lib/domain/types'

type Attempt<T> = { ok: true; data: T } | { ok: false; error: string }

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

async function attempt<T>(operation: () => Promise<T>): Promise<Attempt<T>> {
  try {
    return { ok: true, data: await operation() }
  } catch (error) {
    return { ok: false, error: messageFor(error) }
  }
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
  const result = await attempt(async () => {
    const supabase = await createSupabaseServerClient()
    return createClub(
      supabase,
      requiredText(formData, 'name'),
      (text(formData, 'plan') ?? 'STARTER').toUpperCase(),
      text(formData, 'slug') ?? undefined
    )
  })

  if (!result.ok) back(path, 'error', result.error)

  revalidatePath(path)
  back(`/club/dashboard?club=${result.data}`, 'message', 'Club created.')
}

export async function requestPlanAction(formData: FormData): Promise<never> {
  const clubId = requiredText(formData, 'clubId')
  const path = `/club/dashboard?club=${clubId}`
  const result = await attempt(async () => {
    const supabase = await createSupabaseServerClient()
    await requestPlanChange(supabase, clubId, requiredText(formData, 'plan').toUpperCase())
  })

  if (!result.ok) back(path, 'error', result.error)

  revalidatePath(path)
  back(path, 'message', 'Plan change requested.')
}

export async function createEventAction(formData: FormData): Promise<never> {
  const clubId = requiredText(formData, 'clubId')
  const path = `/club/dashboard?club=${clubId}`
  const result = await attempt(async () => {
    const supabase = await createSupabaseServerClient()
    const capacity = requiredNumber(formData, 'capacity')
    return createClubEvent(
      supabase,
      clubId,
      requiredText(formData, 'name'),
      capacity,
      optionalNumber(formData, 'allocation') ?? capacity,
      optionalNumber(formData, 'points') ?? 0
    )
  })

  if (!result.ok) back(path, 'error', result.error)

  revalidatePath(path)
  revalidatePath(`/club/events/${result.data}`)
  back(`/club/events/${result.data}`, 'message', 'Event created.')
}

export async function createTicketTypeAction(formData: FormData): Promise<never> {
  const eventId = requiredText(formData, 'eventId')
  const path = `/club/events/${eventId}`
  const result = await attempt(async () => {
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
  })

  if (!result.ok) back(path, 'error', result.error)

  revalidatePath(path)
  back(path, 'message', 'Ticket type created.')
}

export async function publishEventAction(formData: FormData): Promise<never> {
  const eventId = requiredText(formData, 'eventId')
  const path = `/club/events/${eventId}`
  const result = await attempt(async () => {
    const supabase = await createSupabaseServerClient()
    await publishClubEvent(supabase, eventId)
  })

  if (!result.ok) back(path, 'error', result.error)

  revalidatePath(path)
  revalidatePath('/events')
  back(path, 'message', 'Event published.')
}

export async function createMatchAction(formData: FormData): Promise<never> {
  const eventId = requiredText(formData, 'eventId')
  const path = `/club/events/${eventId}`
  const result = await attempt(async () => {
    const supabase = await createSupabaseServerClient()
    await createClubMatch(
      supabase,
      eventId,
      requiredText(formData, 'homeTeam'),
      requiredText(formData, 'awayTeam'),
      requiredText(formData, 'kickoff'),
      checked(formData, 'predictions')
    )
  })

  if (!result.ok) back(path, 'error', result.error)

  revalidatePath(path)
  back(path, 'message', 'Match created.')
}

export async function updateMatchAction(formData: FormData): Promise<never> {
  const eventId = requiredText(formData, 'eventId')
  const path = `/club/events/${eventId}`
  const status = requiredText(formData, 'status').toUpperCase()

  if (status !== 'SCHEDULED' && status !== 'LIVE' && status !== 'FINISHED') {
    back(path, 'error', 'Invalid match status.')
  }

  const result = await attempt(async () => {
    const supabase = await createSupabaseServerClient()
    await updateClubMatch(
      supabase,
      requiredText(formData, 'matchId'),
      requiredNumber(formData, 'homeScore'),
      requiredNumber(formData, 'awayScore'),
      status
    )
  })

  if (!result.ok) back(path, 'error', result.error)

  revalidatePath(path)
  back(path, 'message', 'Match updated.')
}

export async function setPredictionAction(formData: FormData): Promise<never> {
  const eventId = requiredText(formData, 'eventId')
  const path = `/club/events/${eventId}`
  const result = await attempt(async () => {
    const supabase = await createSupabaseServerClient()
    await setPredictionEnabled(
      supabase,
      requiredText(formData, 'matchId'),
      checked(formData, 'enabled')
    )
  })

  if (!result.ok) back(path, 'error', result.error)

  revalidatePath(path)
  back(path, 'message', 'Prediction setting updated.')
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

export async function assignPlanAction(formData: FormData): Promise<never> {
  const path = '/admin'
  const status = (text(formData, 'status') ?? 'ACTIVE').toUpperCase()
  if (status !== 'ACTIVE' && status !== 'PAST_DUE' && status !== 'CANCELED') {
    back(path, 'error', 'Invalid subscription status.')
  }

  const result = await attempt(async () => {
    const supabase = await createSupabaseServerClient()
    await adminAssignPlan(
      supabase,
      requiredText(formData, 'clubId'),
      requiredText(formData, 'plan').toUpperCase(),
      status
    )
  })

  if (!result.ok) back(path, 'error', result.error)

  revalidatePath(path)
  back(path, 'message', 'Plan assigned.')
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

export async function inviteMemberAction(formData: FormData): Promise<never> {
  const clubId = requiredText(formData, 'clubId')
  const path = `/club/dashboard?club=${clubId}`
  const result = await attempt(async () => {
    const supabase = await createSupabaseServerClient()
    return inviteClubMember(
      supabase,
      clubId,
      requiredText(formData, 'email'),
      requiredText(formData, 'role').toUpperCase()
    )
  })

  if (!result.ok) back(path, 'error', result.error)

  revalidatePath(path)
  back(
    `${path}&invite=${encodeURIComponent(result.data.token)}`,
    'message',
    'Invitation created. Share the accept link with the invitee.'
  )
}

export async function acceptInviteAction(formData: FormData): Promise<never> {
  const token = requiredText(formData, 'token')
  const result = await attempt(async () => {
    const supabase = await createSupabaseServerClient()
    return acceptClubInvite(supabase, token)
  })

  if (!result.ok) back(`/club/invite/${token}`, 'error', result.error)

  revalidatePath('/club/dashboard')
  back(`/club/dashboard?club=${result.data}`, 'message', 'Invitation accepted.')
}

export async function setMemberRoleAction(formData: FormData): Promise<never> {
  const clubId = requiredText(formData, 'clubId')
  const path = `/club/dashboard?club=${clubId}`
  const result = await attempt(async () => {
    const supabase = await createSupabaseServerClient()
    await setClubMemberRole(
      supabase,
      clubId,
      requiredText(formData, 'profileId'),
      requiredText(formData, 'role').toUpperCase()
    )
  })

  if (!result.ok) back(path, 'error', result.error)

  revalidatePath(path)
  back(path, 'message', 'Member role updated.')
}

export async function removeMemberAction(formData: FormData): Promise<never> {
  const clubId = requiredText(formData, 'clubId')
  const path = `/club/dashboard?club=${clubId}`
  const result = await attempt(async () => {
    const supabase = await createSupabaseServerClient()
    await removeClubMember(supabase, clubId, requiredText(formData, 'profileId'))
  })

  if (!result.ok) back(path, 'error', result.error)

  revalidatePath(path)
  back(path, 'message', 'Member removed.')
}

export async function createRewardAction(formData: FormData): Promise<never> {
  const clubId = requiredText(formData, 'clubId')
  const path = `/club/dashboard?club=${clubId}`
  const result = await attempt(async () => {
    const supabase = await createSupabaseServerClient()
    await createClubReward(
      supabase,
      clubId,
      requiredText(formData, 'name'),
      requiredNumber(formData, 'cost'),
      requiredNumber(formData, 'discount')
    )
  })

  if (!result.ok) back(path, 'error', result.error)

  revalidatePath(path)
  back(path, 'message', 'Reward created.')
}

export async function redeemRewardAction(formData: FormData): Promise<never> {
  const result = await attempt(async () => {
    const supabase = await createSupabaseServerClient()
    return redeemReward(supabase, requiredText(formData, 'rewardId'))
  })

  if (!result.ok) back('/fan/rewards', 'error', result.error)

  revalidatePath('/fan/rewards')
  back('/fan/rewards', 'message', `Reward redeemed. Code: ${result.data.code}`)
}

export async function recordExportAction(formData: FormData): Promise<never> {
  const clubId = requiredText(formData, 'clubId')
  const path = `/club/dashboard?club=${clubId}`
  const result = await attempt(async () => {
    const supabase = await createSupabaseServerClient()
    await recordClubExport(supabase, clubId, requiredText(formData, 'resource'))
  })

  if (!result.ok) back(path, 'error', result.error)

  revalidatePath(path)
  back(path, 'message', 'Export recorded.')
}

export async function resolveMarketAction(formData: FormData): Promise<never> {
  const eventId = requiredText(formData, 'eventId')
  const path = `/club/events/${eventId}`
  const winner = requiredText(formData, 'winner').toUpperCase()

  if (winner !== 'HOME' && winner !== 'DRAW' && winner !== 'AWAY') {
    back(path, 'error', 'Choose HOME, DRAW or AWAY.')
  }

  const result = await attempt(async () => {
    const supabase = await createSupabaseServerClient()
    return resolveMarket(supabase, requiredText(formData, 'marketId'), winner)
  })

  if (!result.ok) back(path, 'error', result.error)

  revalidatePath(path)
  back(
    path,
    'message',
    `Market resolved: ${result.data.holders} holders paid ${result.data.total_points} points.`
  )
}
