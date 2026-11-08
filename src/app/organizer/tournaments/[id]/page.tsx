import Link from 'next/link'
import { notFound } from 'next/navigation'
import AppShell from '@/components/AppShell'
import { CreateMatchForm, ResolveMarketForm, UpdateMatchForm } from '@/components/OrganizerForms'
import { requireRole } from '@/lib/session'
import { createSupabaseServerClient } from '@/lib/supabase/server'

// The page reads the session and the database; it must block, not prerender.
export const instant = false

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

type Match = {
  id: string
  home_team: string
  away_team: string
  status: string
  kickoff_time: string
  home_score: number
  away_score: number
  markets: Array<{ id: string; status: string; winning_outcome: string | null }> | null
}

export default async function OrganizerTournamentDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  if (!UUID_PATTERN.test(id)) notFound()

  const profile = await requireRole('ORGANIZER')
  const supabase = await createSupabaseServerClient()

  const { data: tournament } = await supabase
    .from('tournaments')
    .select('id, name, max_capacity, current_players, ticket_allocation, ticket_points')
    .eq('id', id)
    .eq('organizer_id', profile.id)
    .maybeSingle()

  if (!tournament) notFound()

  const [{ data: matches }, registrations, tickets] = await Promise.all([
    supabase
      .from('matches')
      .select('id, home_team, away_team, status, kickoff_time, home_score, away_score, markets(id, status, winning_outcome)')
      .eq('tournament_id', id)
      .order('kickoff_time'),
    supabase.rpc('organizer_tournament_registrations', { p_tournament_id: id }),
    supabase.rpc('organizer_tournament_tickets', { p_tournament_id: id })
  ])

  return (
    <AppShell profile={profile}>
      <Link href="/organizer" className="text-sm text-slate-400 underline hover:text-white">← Dashboard</Link>
      <h1 className="mt-2 text-3xl font-extrabold tracking-tight">{tournament.name}</h1>
      <p className="mt-1 text-slate-400">
        {tournament.current_players}/{tournament.max_capacity} places · {tournament.ticket_allocation} tickets · {tournament.ticket_points} pts per ticket
      </p>

      <section className="mt-8">
        <h2 className="mb-3 text-xl font-bold">Create match</h2>
        <CreateMatchForm tournamentId={id} />
      </section>

      <section className="mt-8">
        <h2 className="mb-3 text-xl font-bold">Matches</h2>
        <div className="grid gap-3">
          {(matches as Match[] | null)?.map((match) => {
            const market = match.markets?.[0]
            return (
              <article key={match.id} className="rounded border border-slate-800 bg-slate-900 p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h3 className="text-lg font-semibold">{match.home_team} vs {match.away_team}</h3>
                  <span className="text-xs text-slate-400">{match.status} · {match.home_score}–{match.away_score}</span>
                </div>
                <p className="mt-1 text-sm text-slate-400">{new Date(match.kickoff_time).toLocaleString()}</p>
                <div className="mt-3"><UpdateMatchForm matchId={match.id} homeScore={match.home_score} awayScore={match.away_score} status={match.status} /></div>
                {market && (
                  <div className="mt-4 border-t border-slate-800 pt-3">
                    <p className="mb-2 text-xs text-slate-400">Market {market.id.slice(0, 8)} · {market.status}{market.winning_outcome ? ` · ${market.winning_outcome}` : ''}</p>
                    {market.status === 'OPEN' && <ResolveMarketForm marketId={market.id} />}
                  </div>
                )}
              </article>
            )
          })}
          {(!matches || matches.length === 0) && <p className="text-slate-400">No matches yet.</p>}
        </div>
      </section>

      <section className="mt-8 grid gap-4 md:grid-cols-2">
        <div>
          <h2 className="mb-3 text-xl font-bold">Registrations</h2>
          <div className="overflow-x-auto rounded border border-slate-800">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-slate-900 text-slate-400"><tr><th className="px-3 py-2">User</th><th className="px-3 py-2">Registered</th></tr></thead>
              <tbody>
                {(registrations.data as Array<{ username: string; registered_at: string }> | null)?.map((row) => (
                  <tr key={`${row.username}-${row.registered_at}`} className="border-t border-slate-800">
                    <td className="px-3 py-2">{row.username}</td>
                    <td className="px-3 py-2">{new Date(row.registered_at).toLocaleString()}</td>
                  </tr>
                ))}
                {(!registrations.data || registrations.data.length === 0) && <tr><td colSpan={2} className="px-3 py-4 text-slate-400">No registrations.</td></tr>}
              </tbody>
            </table>
          </div>
        </div>
        <div>
          <h2 className="mb-3 text-xl font-bold">Tickets</h2>
          <div className="overflow-x-auto rounded border border-slate-800">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-slate-900 text-slate-400"><tr><th className="px-3 py-2">User</th><th className="px-3 py-2">Points</th><th className="px-3 py-2">Claimed</th></tr></thead>
              <tbody>
                {(tickets.data as Array<{ username: string; points_awarded: number; created_at: string }> | null)?.map((row) => (
                  <tr key={`${row.username}-${row.created_at}`} className="border-t border-slate-800">
                    <td className="px-3 py-2">{row.username}</td>
                    <td className="px-3 py-2">{row.points_awarded}</td>
                    <td className="px-3 py-2">{new Date(row.created_at).toLocaleString()}</td>
                  </tr>
                ))}
                {(!tickets.data || tickets.data.length === 0) && <tr><td colSpan={3} className="px-3 py-4 text-slate-400">No tickets.</td></tr>}
              </tbody>
            </table>
          </div>
        </div>
      </section>
    </AppShell>
  )
}
