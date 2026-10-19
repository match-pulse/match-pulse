import { Suspense } from 'react'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import MarketTrader from '@/components/MarketTrader'
import TopBar from '@/components/TopBar'
import { supabase } from '@/lib/supabase'
import { getCurrentUserId } from '@/lib/session'
import type { Outcome } from '@/app/actions/market'

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

function hasStarted(kickoffTime: string): boolean {
  return Date.now() >= new Date(kickoffTime).getTime()
}

const LABELS: Record<Outcome, string> = {
  HOME: 'Home win',
  DRAW: 'Draw',
  AWAY: 'Away win'
}

type MarketRow = {
  id: string
  status: 'OPEN' | 'RESOLVED'
  winning_outcome: Outcome | null
  b: string | number
  q_home: string | number
  q_draw: string | number
  q_away: string | number
  matches: {
    home_team: string
    away_team: string
    status: string
    kickoff_time: string
  } | null
}

type PositionRow = {
  outcome: Outcome
  shares: string | number
  cost_basis: string | number
}

type TradeRow = {
  id: string
  outcome: Outcome
  kind: 'BUY' | 'SELL'
  shares: string | number
  cost_points: number
  proceeds_points: number
  created_at: string
}

async function marketPrice(outcome: Outcome, b: number, qh: number, qd: number, qa: number) {
  const q = outcome === 'HOME' ? qh : outcome === 'DRAW' ? qd : qa
  const { data } = await supabase.rpc('market_price', {
    p_q: q,
    p_b: b,
    p_q_home: qh,
    p_q_draw: qd,
    p_q_away: qa
  })
  return Number(data)
}

async function marketCost(b: number, qh: number, qd: number, qa: number) {
  const { data } = await supabase.rpc('market_cost', {
    p_b: b,
    p_q_home: qh,
    p_q_draw: qd,
    p_q_away: qa
  })
  return Number(data)
}

async function MarketContent({ params }: { params: Promise<{ id: string }> }) {
  const { id: marketId } = await params

  if (!UUID_PATTERN.test(marketId)) {
    notFound()
  }

  const userId = await getCurrentUserId()

  const { data: marketData, error: marketError } = await supabase
    .from('markets')
    .select('*, matches(home_team, away_team, status, kickoff_time)')
    .eq('id', marketId)
    .maybeSingle()

  if (marketError) {
    throw new Error(`Failed to load market: ${marketError.message}`)
  }

  if (!marketData || !marketData.matches) {
    notFound()
  }

  const market = marketData as MarketRow
  const match = market.matches
  if (!match) {
    notFound()
  }

  const [profileResult, positionsResult, tradesResult] = await Promise.all([
    supabase.from('profiles').select('username, points').eq('id', userId).maybeSingle(),
    supabase
      .from('market_positions')
      .select('outcome, shares, cost_basis')
      .eq('market_id', marketId)
      .eq('user_id', userId),
    supabase
      .from('market_trades')
      .select('id, outcome, kind, shares, cost_points, proceeds_points, created_at')
      .eq('market_id', marketId)
      .order('created_at', { ascending: false })
      .limit(10)
  ])

  if (profileResult.error || positionsResult.error || tradesResult.error) {
    throw new Error('Failed to load market data.')
  }

  const points = profileResult.data?.points ?? 0
  const heldOutcomes = (positionsResult.data ?? []).filter(
    (position) => Number(position.shares) > 0
  ) as PositionRow[]
  const trades = (tradesResult.data ?? []) as TradeRow[]

  const b = Number(market.b)
  const qh = Number(market.q_home)
  const qd = Number(market.q_draw)
  const qa = Number(market.q_away)

  const resolvedWinner = market.status === 'RESOLVED' ? market.winning_outcome : null
  const started = hasStarted(match.kickoff_time)
  const open = resolvedWinner === null && started

  const homePrice = await marketPrice('HOME', b, qh, qd, qa)
  const drawPrice = await marketPrice('DRAW', b, qh, qd, qa)
  const awayPrice = await marketPrice('AWAY', b, qh, qd, qa)
  const prices: Record<Outcome, number> = {
    HOME: homePrice,
    DRAW: drawPrice,
    AWAY: awayPrice
  }

  const baseCost = open ? await marketCost(b, qh, qd, qa) : 0

  const positions = await Promise.all(
    heldOutcomes.map(async (position) => {
      const shares = Number(position.shares)

      let exitValue: number
      if (resolvedWinner !== null) {
        exitValue = position.outcome === resolvedWinner ? Math.floor(shares) : 0
      } else {
        const costAfter = await marketCost(
          b,
          qh - (position.outcome === 'HOME' ? shares : 0),
          qd - (position.outcome === 'DRAW' ? shares : 0),
          qa - (position.outcome === 'AWAY' ? shares : 0)
        )
        exitValue = Math.max(0, Math.floor(baseCost - costAfter))
      }

      return {
        outcome: position.outcome,
        shares: String(position.shares),
        costBasis: Number(position.cost_basis),
        exitValue
      }
    })
  )

  return (
    <>
      <TopBar username={profileResult.data?.username ?? 'Guest'} points={points} />

      <div className="px-8 pt-4">
        <Link
          href="/tournaments/22222222-2222-2222-2222-222222222222"
          className="text-sm text-blue-400 hover:text-blue-300 underline"
        >
          Summer Cup 2026 — tournament registration
        </Link>
      </div>

      <div className="flex-1 flex flex-col max-w-6xl mx-auto w-full p-8 gap-8">
        <div className="text-center">
          <h1 className="text-4xl text-white font-extrabold mb-2 tracking-tight">
            {match.home_team} <span className="text-slate-500">vs</span> {match.away_team}
          </h1>
          <p className="text-slate-400 font-medium">
            {resolvedWinner
              ? `Resolved — ${LABELS[resolvedWinner]}`
              : open
                ? 'Live — the market is open'
                : `Opens at kickoff (${new Date(match.kickoff_time).toISOString().slice(0, 16).replace('T', ' ')} UTC)`}
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-start">
          <div className="bg-slate-800 p-6 rounded-lg shadow-xl border border-slate-700 text-white">
            <h2 className="text-xl font-bold mb-4">Recent trades</h2>
            {trades.length === 0 ? (
              <p className="text-slate-500 italic text-center py-6">
                No trades yet. Be the first to take a side.
              </p>
            ) : (
              <table className="min-w-full text-sm text-left text-slate-300">
                <thead className="bg-slate-900 text-xs uppercase text-slate-400">
                  <tr>
                    <th className="px-3 py-2">Time</th>
                    <th className="px-3 py-2">Side</th>
                    <th className="px-3 py-2">Shares</th>
                    <th className="px-3 py-2">Points</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-700">
                  {trades.map((trade) => (
                    <tr key={trade.id}>
                      <td className="px-3 py-2 text-xs text-slate-500">
                        {new Date(trade.created_at).toISOString().slice(11, 19)} UTC
                      </td>
                      <td className="px-3 py-2">
                        {trade.kind} {LABELS[trade.outcome]}
                      </td>
                      <td className="px-3 py-2 font-mono text-xs">
                        {Number(trade.shares).toFixed(2)}
                      </td>
                      <td className="px-3 py-2 font-semibold text-blue-400">
                        {trade.kind === 'BUY'
                          ? `-${trade.cost_points}`
                          : `+${trade.proceeds_points}`}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          <MarketTrader
            marketId={marketId}
            open={open}
            resolvedWinner={resolvedWinner}
            points={points}
            prices={prices}
            positions={positions}
          />
        </div>
      </div>
    </>
  )
}

export default function MarketPage({ params }: { params: Promise<{ id: string }> }) {
  return (
    <main className="min-h-screen bg-slate-900 flex flex-col">
      <Suspense fallback={<p className="text-center text-white mt-10">Loading market...</p>}>
        <MarketContent params={params} />
      </Suspense>
    </main>
  )
}
