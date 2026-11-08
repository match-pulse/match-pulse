import Link from 'next/link'
import AppShell from '@/components/AppShell'
import { requireRole } from '@/lib/session'
import { createSupabaseServerClient } from '@/lib/supabase/server'

// The page reads the session and the database; it must block, not prerender.
export const instant = false

type Position = { market_id: string; outcome: string; shares: number; cost_basis: number }
type Trade = { market_id: string; kind: string; outcome: string; shares: number; cost_points: number; proceeds_points: number; created_at: string }
type Payout = { market_id: string; shares: number; points: number; created_at: string }

export default async function PortfolioPage() {
  const profile = await requireRole('FAN')
  const supabase = await createSupabaseServerClient()

  const [{ data: positions }, { data: trades }, { data: payouts }] = await Promise.all([
    supabase.from('market_positions').select('market_id, outcome, shares, cost_basis').gt('shares', 0),
    supabase.from('market_trades').select('market_id, kind, outcome, shares, cost_points, proceeds_points, created_at').order('created_at', { ascending: false }).limit(20),
    supabase.from('market_payouts').select('market_id, shares, points, created_at').order('created_at', { ascending: false }).limit(20)
  ])

  return (
    <AppShell profile={profile}>
      <h1 className="text-3xl font-extrabold tracking-tight">Portfolio</h1>
      <p className="mt-1 mb-6 text-slate-400">Your open positions, recent trades and payouts.</p>

      <section className="mb-8">
        <h2 className="mb-3 text-xl font-bold">Open positions</h2>
        <div className="overflow-x-auto rounded border border-slate-800">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-slate-900 text-slate-400"><tr><th className="px-3 py-2">Market</th><th className="px-3 py-2">Outcome</th><th className="px-3 py-2">Shares</th><th className="px-3 py-2">Cost basis</th></tr></thead>
            <tbody>
              {(positions as Position[] | null)?.map((position) => (
                <tr key={`${position.market_id}-${position.outcome}`} className="border-t border-slate-800">
                  <td className="px-3 py-2"><Link className="text-blue-300 underline" href={`/market/${position.market_id}`}>{position.market_id.slice(0, 8)}</Link></td>
                  <td className="px-3 py-2">{position.outcome}</td>
                  <td className="px-3 py-2">{Number(position.shares).toFixed(2)}</td>
                  <td className="px-3 py-2">{position.cost_basis} pts</td>
                </tr>
              ))}
              {(!positions || positions.length === 0) && <tr><td colSpan={4} className="px-3 py-4 text-slate-400">No open positions.</td></tr>}
            </tbody>
          </table>
        </div>
      </section>

      <section className="mb-8">
        <h2 className="mb-3 text-xl font-bold">Recent trades</h2>
        <div className="overflow-x-auto rounded border border-slate-800">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-slate-900 text-slate-400"><tr><th className="px-3 py-2">When</th><th className="px-3 py-2">Kind</th><th className="px-3 py-2">Outcome</th><th className="px-3 py-2">Shares</th><th className="px-3 py-2">Points</th></tr></thead>
            <tbody>
              {(trades as Trade[] | null)?.map((trade, index) => (
                <tr key={`${trade.market_id}-${trade.created_at}-${index}`} className="border-t border-slate-800">
                  <td className="px-3 py-2">{new Date(trade.created_at).toLocaleString()}</td>
                  <td className="px-3 py-2">{trade.kind}</td>
                  <td className="px-3 py-2">{trade.outcome}</td>
                  <td className="px-3 py-2">{Number(trade.shares).toFixed(2)}</td>
                  <td className="px-3 py-2">{trade.kind === 'BUY' ? `-${trade.cost_points}` : `+${trade.proceeds_points}`}</td>
                </tr>
              ))}
              {(!trades || trades.length === 0) && <tr><td colSpan={5} className="px-3 py-4 text-slate-400">No trades yet.</td></tr>}
            </tbody>
          </table>
        </div>
      </section>

      <section>
        <h2 className="mb-3 text-xl font-bold">Payouts</h2>
        <div className="overflow-x-auto rounded border border-slate-800">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-slate-900 text-slate-400"><tr><th className="px-3 py-2">When</th><th className="px-3 py-2">Market</th><th className="px-3 py-2">Shares</th><th className="px-3 py-2">Points</th></tr></thead>
            <tbody>
              {(payouts as Payout[] | null)?.map((payout, index) => (
                <tr key={`${payout.market_id}-${payout.created_at}-${index}`} className="border-t border-slate-800">
                  <td className="px-3 py-2">{new Date(payout.created_at).toLocaleString()}</td>
                  <td className="px-3 py-2">{payout.market_id.slice(0, 8)}</td>
                  <td className="px-3 py-2">{Number(payout.shares).toFixed(2)}</td>
                  <td className="px-3 py-2">{payout.points} pts</td>
                </tr>
              ))}
              {(!payouts || payouts.length === 0) && <tr><td colSpan={4} className="px-3 py-4 text-slate-400">No payouts yet.</td></tr>}
            </tbody>
          </table>
        </div>
      </section>
    </AppShell>
  )
}
