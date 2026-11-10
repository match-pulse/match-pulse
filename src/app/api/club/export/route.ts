import { getProfile } from '@/lib/session'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { csvValue } from '@/lib/csv'

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

export async function GET() {
  const profile = await getProfile()
  if (!profile || profile.role !== 'CLUB') {
    return new Response('Club access required.', { status: 403 })
  }

  const supabase = await createSupabaseServerClient()
  const { data, error } = await supabase.rpc('club_analytics_summary', {
    p_tournament_id: null,
    p_match_id: null
  })

  if (error) {
    return new Response(`Could not export analytics: ${error.message}`, { status: 500 })
  }

  const rows = (data as Aggregate[] | null) ?? []
  const header = ['match_id', 'home_team', 'away_team', 'market_id', 'outcome', 'traders', 'trades', 'shares', 'last_price', 'suppressed']
  const lines = [header.map(csvValue).join(',')]
  for (const row of rows) {
    lines.push(
      [
        row.match_id,
        row.home_team,
        row.away_team,
        row.market_id,
        row.outcome,
        row.unique_traders,
        row.trades,
        row.shares,
        row.last_price,
        row.suppressed
      ].map(csvValue).join(',')
    )
  }

  await supabase.rpc('record_club_export', {
    p_resource: 'analytics.csv',
    p_metadata: { rows: rows.length }
  })

  return new Response(lines.join('\n'), {
    headers: {
      'content-type': 'text/csv; charset=utf-8',
      'content-disposition': 'attachment; filename="matchpulse-club-analytics.csv"',
      'cache-control': 'no-store'
    }
  })
}
