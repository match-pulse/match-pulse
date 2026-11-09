import type { SupabaseClient } from '@supabase/supabase-js'
import { callRpc } from './rpc'
import type { AdminAudit, AdminClub } from './types'

export async function adminListClubs(client: SupabaseClient): Promise<AdminClub[]> {
  return callRpc<AdminClub[]>(client, 'admin_list_clubs')
}

export async function adminAssignPlan(
  client: SupabaseClient,
  clubId: string,
  plan: string,
  status: 'ACTIVE' | 'PAST_DUE' | 'CANCELED' = 'ACTIVE'
): Promise<void> {
  await callRpc<void>(client, 'admin_assign_plan', {
    p_club_id: clubId,
    p_plan_code: plan,
    p_status: status
  })
}

export async function adminSetSubscriptionStatus(
  client: SupabaseClient,
  clubId: string,
  status: 'ACTIVE' | 'PAST_DUE' | 'CANCELED'
): Promise<void> {
  await callRpc<void>(client, 'admin_set_subscription_status', {
    p_club_id: clubId,
    p_status: status
  })
}

export async function adminListAudit(
  client: SupabaseClient,
  limit = 100
): Promise<AdminAudit[]> {
  return callRpc<AdminAudit[]>(client, 'admin_list_audit', { p_limit: limit })
}
