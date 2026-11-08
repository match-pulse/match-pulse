import AppShell from '@/components/AppShell'
import { requireRole } from '@/lib/session'
import { createSupabaseServerClient } from '@/lib/supabase/server'

// The page reads the session and the database; it must block, not prerender.
export const instant = false

type Aggregate = {
  match_id: string
  home_team: string
  away_team: string
  market_id: string
  outcome: string
  unique_traders: number | null
  trades: number | null
  shares: number | null
  last_price: number | null
  suppressed: boolean
}

export default async function ClubDashboard() {
  const profile = await requireRole('CLUB')
  const supabase = await createSupabaseServerClient()
  const { data, error } = await supabase.rpc('club_analytics_summary', {
    p_tournament_id: null,
    p_match_id: null
  })

  if (error) {
    throw new Error(`Failed to load club analytics: ${error.message}`)
  }

  const rows = (data as Aggregate[] | null) ?? []

  return (
    <AppShell profile={profile}>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight">Club analytics</h1>
          <p className="mt-1 text-slate-400">Aggregated crowd view. Cohorts below 5 traders are suppressed.</p>
        </div>
        <a href="/api/club/export" className="rounded bg-emerald-700 px-3 py-2 text-sm font-semibold text-white hover:bg-emerald-800">
          Export CSV
        </a>
      </div>

      <div className="mt-6 overflow-x-auto rounded border border-slate-800">
        <table className="min-w-full text-left text-sm">
          <thead className="bg-slate-900 text-slate-400">
            <tr>
              <th className="px-3 py-2">Match</th>
              <th className="px-3 py-2">Outcome</th>
              <th className="px-3 py-2">Traders</th>
              <th className="px-3 py-2">Trades</th>
              <th className="px-3 py-2">Shares</th>
              <th className="px-3 py-2">Last price</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={`${row.match_id}-${row.outcome}`} className="border-t border-slate-800">
                <td className="px-3 py-2">{row.home_team} vs {row.away_team}</td>
                <td className="px-3 py-2">{row.outcome}</td>
                {row.suppressed ? (
                  <td className="px-3 py-2 text-amber-300" colSpan={4}>Suppressed — fewer than 5 traders</td>
                ) : (
                  <>
                    <td className="px-3 py-2">{row.unique_traders}</td>
                    <td className="px-3 py-2">{row.trades}</td>
                    <td className="px-3 py-2">{Number(row.shares).toFixed(2)}</td>
                    <td className="px-3 py-2">{row.last_price === null ? '—' : Number(row.last_price).toFixed(4)}</td>
                  </>
                )}
              </tr>
            ))}
            {rows.length === 0 && <tr><td colSpan={6} className="px-3 py-4 text-slate-400">No aggregate data yet.</td></tr>}
          </tbody>
        </table>
      </div>
    </AppShell>
  )
}
