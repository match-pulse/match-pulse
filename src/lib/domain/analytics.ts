import type { SupabaseClient } from '@supabase/supabase-js'
import { callRpc, first, selectRows } from './rpc'
import type { PredictionInsight, Reward, SalesSummary } from './types'

export async function salesSummary(
  client: SupabaseClient,
  clubId: string,
  eventId?: string
): Promise<SalesSummary[]> {
  return callRpc<SalesSummary[]>(client, 'club_sales_summary', {
    p_club_id: clubId,
    p_event_id: eventId ?? null
  })
}

export async function predictionInsights(
  client: SupabaseClient,
  clubId: string,
  eventId?: string,
  matchId?: string
): Promise<PredictionInsight[]> {
  return callRpc<PredictionInsight[]>(client, 'club_prediction_insights', {
    p_club_id: clubId,
    p_event_id: eventId ?? null,
    p_match_id: matchId ?? null
  })
}

export async function predictionTimeseries(
  client: SupabaseClient,
  clubId: string,
  marketId: string,
  bucketMinutes = 5
) {
  return callRpc<
    Array<{
      bucket_start: string
      outcome: string
      trades: number
      shares: number
      avg_price: number
      last_price: number
      suppressed: boolean
    }>
  >(client, 'club_prediction_timeseries', {
    p_club_id: clubId,
    p_market_id: marketId,
    p_bucket_minutes: bucketMinutes
  })
}

export async function recordClubExport(
  client: SupabaseClient,
  clubId: string,
  resource: string,
  metadata: Record<string, unknown> = {}
): Promise<void> {
  await callRpc<void>(client, 'record_club_export', {
    p_club_id: clubId,
    p_resource: resource,
    p_metadata: metadata
  })
}

export async function createClubReward(
  client: SupabaseClient,
  clubId: string,
  name: string,
  costPoints: number,
  discountPercent: number
): Promise<string> {
  return callRpc<string>(client, 'create_club_reward', {
    p_club_id: clubId,
    p_name: name,
    p_cost_points: costPoints,
    p_discount_percent: discountPercent
  })
}

export async function listClubRewards(
  client: SupabaseClient,
  clubId: string
): Promise<Reward[]> {
  return selectRows<Reward>(
    client
      .from('rewards')
      .select('id, club_id, name, cost_points, discount_percent')
      .eq('club_id', clubId)
      .eq('active', true)
      .order('cost_points')
  )
}

export async function listFanRewards(client: SupabaseClient): Promise<Reward[]> {
  return selectRows<Reward>(
    client
      .from('public_club_rewards')
      .select('id, club_id, club_name, name, cost_points, discount_percent')
      .order('cost_points')
  )
}

export async function redeemReward(
  client: SupabaseClient,
  rewardId: string
): Promise<{ code: string; points_after: number }> {
  const rows = await callRpc<Array<{ code: string; points_after: number }>>(
    client,
    'redeem_reward',
    { p_reward_id: rewardId }
  )
  const result = first(rows)
  if (!result) throw new Error('Reward redemption returned no code.')
  return result
}
