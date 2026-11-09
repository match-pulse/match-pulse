import type { SupabaseClient } from '@supabase/supabase-js'
import { callRpc, first, selectRows } from './rpc'
import type { ClubContext, ClubMember, ClubSummary } from './types'

export async function createClub(
  client: SupabaseClient,
  name: string,
  plan = 'STARTER',
  slug?: string
): Promise<string> {
  return callRpc<string>(client, 'create_club', {
    p_name: name,
    p_plan_code: plan,
    p_slug: slug ?? null
  })
}

export async function updateClub(
  client: SupabaseClient,
  clubId: string,
  name: string,
  slug?: string
): Promise<void> {
  await callRpc<void>(client, 'update_club', {
    p_club_id: clubId,
    p_name: name,
    p_slug: slug ?? null
  })
}

export async function listMyClubs(client: SupabaseClient): Promise<ClubSummary[]> {
  return callRpc<ClubSummary[]>(client, 'list_my_clubs')
}

export async function getClubContext(
  client: SupabaseClient,
  clubId: string
): Promise<ClubContext> {
  return callRpc<ClubContext>(client, 'get_club_context', { p_club_id: clubId })
}

export async function requestPlanChange(
  client: SupabaseClient,
  clubId: string,
  plan: string
): Promise<string> {
  return callRpc<string>(client, 'request_plan_change', {
    p_club_id: clubId,
    p_plan_code: plan
  })
}

export async function inviteClubMember(
  client: SupabaseClient,
  clubId: string,
  email: string,
  role: string
): Promise<{ invite_id: string; token: string }> {
  const rows = await callRpc<Array<{ invite_id: string; token: string }>>(
    client,
    'invite_club_member',
    { p_club_id: clubId, p_email: email, p_role: role }
  )
  const invite = first(rows)
  if (!invite) throw new Error('Invitation was not created.')
  return invite
}

export async function acceptClubInvite(
  client: SupabaseClient,
  token: string
): Promise<string> {
  return callRpc<string>(client, 'accept_club_invite', { p_token: token })
}

export async function listClubMembers(
  client: SupabaseClient,
  clubId: string
): Promise<ClubMember[]> {
  return callRpc<ClubMember[]>(client, 'list_club_members', { p_club_id: clubId })
}

export async function setClubMemberRole(
  client: SupabaseClient,
  clubId: string,
  profileId: string,
  role: string
): Promise<void> {
  await callRpc<void>(client, 'set_club_member_role', {
    p_club_id: clubId,
    p_profile_id: profileId,
    p_role: role
  })
}

export async function removeClubMember(
  client: SupabaseClient,
  clubId: string,
  profileId: string
): Promise<void> {
  await callRpc<void>(client, 'remove_club_member', {
    p_club_id: clubId,
    p_profile_id: profileId
  })
}

export async function listPlans(client: SupabaseClient) {
  const [plans, entitlements] = await Promise.all([
    selectRows<{
      code: string
      name: string
      description: string
      active: boolean
    }>(client.from('plans').select('code, name, description, active').eq('active', true).order('code')),
    selectRows<{
      plan_code: string
      feature: string
      enabled: boolean
      limit_value: number | null
    }>(client.from('plan_entitlements').select('plan_code, feature, enabled, limit_value'))
  ])

  return plans.map((plan) => ({
    ...plan,
    entitlements: entitlements.filter((entry) => entry.plan_code === plan.code)
  }))
}
