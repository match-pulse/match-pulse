'use server'

import { supabase } from '@/lib/supabase'
import { getCurrentUserId } from '@/lib/session'

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const SHARES_PATTERN = /^\d{1,30}(\.\d{1,8})?$/

const OUTCOMES = ['HOME', 'DRAW', 'AWAY'] as const
export type Outcome = (typeof OUTCOMES)[number]

type EntryRow = {
  shares: string | number
  cost: number
  points_after: number
}

type ExitRow = {
  proceeds: number
  points_after: number
}

function isOutcome(value: FormDataEntryValue | null): value is Outcome {
  return typeof value === 'string' && (OUTCOMES as readonly string[]).includes(value)
}

function formatShares(shares: string | number): string {
  return Number(shares).toFixed(2)
}

function describeTradeError(message: string): string {
  if (message.includes('entry cooldown active')) {
    return 'Cooling down. Try a smaller wait before entering again.'
  }
  if (message.includes('insufficient points')) {
    return 'Not enough points for that budget.'
  }
  if (message.includes('market has not opened')) {
    return 'The market opens at kickoff.'
  }
  if (message.includes('market is not open')) {
    return 'This market is no longer open.'
  }
  if (message.includes('market quantity limit reached')) {
    return 'The market has reached its size limit for this outcome.'
  }
  if (message.includes('budget too small')) {
    return 'That budget is too small to buy a readable number of shares.'
  }
  if (message.includes('insufficient shares')) {
    return 'You do not hold that many shares.'
  }
  return 'The trade was refused. Please try again.'
}

/**
 * Enter a position. Identity comes from the server session, never the form.
 * Pricing, cooldown, balance and the market window are decided by `open_trade`
 * inside the database transaction; this action only validates and translates.
 */
export async function enterPosition(formData: FormData) {
  const marketId = formData.get('marketId')
  const outcome = formData.get('outcome')
  const budgetRaw = formData.get('budget')

  if (typeof marketId !== 'string' || !UUID_PATTERN.test(marketId)) {
    return { success: false, message: 'Invalid market.' }
  }
  if (!isOutcome(outcome)) {
    return { success: false, message: 'Choose an outcome.' }
  }

  const budget = typeof budgetRaw === 'string' ? Number.parseInt(budgetRaw, 10) : Number.NaN
  if (!Number.isInteger(budget) || budget < 1) {
    return { success: false, message: 'Enter a whole number of points (1 or more).' }
  }

  const userId = await getCurrentUserId()

  const { data, error } = await supabase.rpc('open_trade', {
    p_market_id: marketId,
    p_user_id: userId,
    p_outcome: outcome,
    p_budget: budget
  })

  if (error) {
    return { success: false, message: describeTradeError(error.message) }
  }

  const trade = (data as EntryRow[] | null)?.[0]
  if (!trade) {
    return { success: false, message: 'The trade was refused. Please try again.' }
  }

  return {
    success: true,
    message: `Bought ${formatShares(trade.shares)} ${outcome} shares for ${trade.cost} points.`
  }
}

/**
 * Exit a position at the current curve price. Exits are never limited by the
 * entry cooldown; partial exits are accepted as long as shares are held.
 */
export async function exitPosition(formData: FormData) {
  const marketId = formData.get('marketId')
  const outcome = formData.get('outcome')
  const sharesRaw = formData.get('shares')

  if (typeof marketId !== 'string' || !UUID_PATTERN.test(marketId)) {
    return { success: false, message: 'Invalid market.' }
  }
  if (!isOutcome(outcome)) {
    return { success: false, message: 'Choose an outcome to exit.' }
  }
  if (typeof sharesRaw !== 'string' || !SHARES_PATTERN.test(sharesRaw) || Number(sharesRaw) <= 0) {
    return { success: false, message: 'Invalid share quantity.' }
  }

  const userId = await getCurrentUserId()

  const { data, error } = await supabase.rpc('close_trade', {
    p_market_id: marketId,
    p_user_id: userId,
    p_outcome: outcome,
    p_shares: sharesRaw
  })

  if (error) {
    return { success: false, message: describeTradeError(error.message) }
  }

  const exit = (data as ExitRow[] | null)?.[0]
  if (!exit) {
    return { success: false, message: 'The exit was refused. Please try again.' }
  }

  return {
    success: true,
    message: `Sold ${Number(sharesRaw).toFixed(2)} ${outcome} shares for ${exit.proceeds} points.`
  }
}
