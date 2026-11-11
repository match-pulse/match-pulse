'use server'

import { revalidatePath } from 'next/cache'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { attempt, back, requiredText, text } from './form'
import {
  acceptClubInvite,
  createClub,
  inviteClubMember,
  removeClubMember,
  requestPlanChange,
  setClubMemberRole
} from '@/lib/domain/clubs'

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
