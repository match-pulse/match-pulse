import { NextResponse } from 'next/server'
import { getClubContext } from '@/lib/domain/clubs'
import { predictionInsights, recordClubExport, salesSummary } from '@/lib/domain/analytics'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { getViewer } from '@/lib/viewer'

function csvValue(value: unknown): string {
  const text = value === null || value === undefined ? '' : String(value)
  return `"${text.replaceAll('"', '""')}"`
}

export async function GET(request: Request) {
  const clubId = new URL(request.url).searchParams.get('club')
  if (!clubId) {
    return NextResponse.json({ error: 'club is required' }, { status: 400 })
  }

  const viewer = await getViewer()
  if (!viewer) {
    return NextResponse.json({ error: 'authentication required' }, { status: 401 })
  }

  const membership = viewer.clubs.find((club) => club.club_id === clubId)
  if (!membership) {
    return NextResponse.json({ error: 'club authorization required' }, { status: 403 })
  }

  const supabase = await createSupabaseServerClient()
  const context = await getClubContext(supabase, clubId)

  if (!context.entitlements.data_export?.enabled) {
    return NextResponse.json({ error: 'data export requires ELITE' }, { status: 403 })
  }
  if (membership.role === 'STAFF') {
    return NextResponse.json({ error: 'staff cannot export attendee analytics' }, { status: 403 })
  }

  const [sales, insights] = await Promise.all([
    salesSummary(supabase, clubId),
    context.entitlements.prediction_insights?.enabled
      ? predictionInsights(supabase, clubId)
      : Promise.resolve([])
  ])

  const header = [
    'section',
    'event_id',
    'event_name',
    'match_id',
    'home_team',
    'away_team',
    'market_id',
    'outcome',
    'orders',
    'tickets_sold',
    'checked_in',
    'simulated_revenue_cents',
    'unique_buyers',
    'unique_predictors',
    'trades',
    'shares',
    'last_price',
    'suppressed'
  ]

  const rows: string[] = [header.map(csvValue).join(',')]

  for (const sale of sales) {
    rows.push(
      [
        'sales',
        sale.event_id,
        sale.event_name,
        '',
        '',
        '',
        '',
        '',
        sale.orders,
        sale.tickets_sold,
        sale.checked_in,
        sale.simulated_revenue_cents,
        sale.unique_buyers,
        '',
        '',
        '',
        '',
        ''
      ]
        .map(csvValue)
        .join(',')
    )
  }

  for (const insight of insights) {
    rows.push(
      [
        'predictions',
        '',
        '',
        insight.match_id,
        insight.home_team,
        insight.away_team,
        insight.market_id,
        insight.outcome,
        '',
        '',
        '',
        '',
        '',
        insight.unique_predictors,
        insight.trades,
        insight.shares,
        insight.last_price,
        insight.suppressed
      ]
        .map(csvValue)
        .join(',')
    )
  }

  await recordClubExport(supabase, clubId, 'analytics-v3', {
    sales_rows: sales.length,
    prediction_rows: insights.length
  })

  return new NextResponse(rows.join('\n'), {
    headers: {
      'content-type': 'text/csv; charset=utf-8',
      'content-disposition': `attachment; filename="matchpulse-${clubId}.csv"`
    }
  })
}
