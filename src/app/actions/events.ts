'use server'

import { revalidatePath } from 'next/cache'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { attempt, back, checked, optionalNumber, requiredNumber, requiredText, text } from './form'
import {
  createClubEvent,
  createClubMatch,
  createTicketType,
  publishClubEvent,
  resolveMarket,
  setPredictionEnabled,
  updateClubMatch
} from '@/lib/domain/events'

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
