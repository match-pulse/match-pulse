import type { SupabaseClient } from '@supabase/supabase-js'
import { callRpc, first, selectRows } from './rpc'

export type PositionRow = {
  market_id: string
  outcome: 'HOME' | 'DRAW' | 'AWAY'
  shares: number
  cost_basis: number
  updated_at: string
}

export type TradeRow = {
  market_id: string
  outcome: 'HOME' | 'DRAW' | 'AWAY'
  kind: 'BUY' | 'SELL'
  shares: number
  cost_points: number
  proceeds_points: number
  points_after: number
  created_at: string
}

export type PayoutRow = {
  market_id: string
  shares: number
  points: number
  created_at: string
}

export async function enterPosition(
  client: SupabaseClient,
  marketId: string,
  outcome: 'HOME' | 'DRAW' | 'AWAY',
  budget: number,
  requestId: string
) {
  const rows = await callRpc<
    Array<{
      shares: number
      cost: number
      price_before: number
      price_after: number
      points_after: number
    }>
  >(client, 'open_trade', {
    p_market_id: marketId,
    p_outcome: outcome,
    p_budget: budget,
    p_request_id: requestId
  })
  const result = first(rows)
  if (!result) throw new Error('Prediction entry returned no position.')
  return result
}

export async function exitPosition(
  client: SupabaseClient,
  marketId: string,
  outcome: 'HOME' | 'DRAW' | 'AWAY',
  shares: string,
  requestId: string
) {
  const rows = await callRpc<
    Array<{
      proceeds: number
      price_before: number
      price_after: number
      points_after: number
    }>
  >(client, 'close_trade', {
    p_market_id: marketId,
    p_outcome: outcome,
    p_shares: shares,
    p_request_id: requestId
  })
  const result = first(rows)
  if (!result) throw new Error('Prediction exit returned no result.')
  return result
}

export async function myPortfolio(client: SupabaseClient) {
  const [positions, trades, payouts] = await Promise.all([
    selectRows<PositionRow>(
      client
        .from('market_positions')
        .select('market_id, outcome, shares, cost_basis, updated_at')
        .gt('shares', 0)
        .order('updated_at', { ascending: false })
    ),
    selectRows<TradeRow>(
      client
        .from('market_trades')
        .select('market_id, outcome, kind, shares, cost_points, proceeds_points, points_after, created_at')
        .order('created_at', { ascending: false })
        .limit(50)
    ),
    selectRows<PayoutRow>(
      client
        .from('market_payouts')
        .select('market_id, shares, points, created_at')
        .order('created_at', { ascending: false })
        .limit(50)
    )
  ])

  return { positions, trades, payouts }
}
