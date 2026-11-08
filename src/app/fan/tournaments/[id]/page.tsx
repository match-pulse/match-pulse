import Link from 'next/link'
import { notFound } from 'next/navigation'
import AppShell from '@/components/AppShell'
import RegistrationForm from '@/components/RegistrationForm'
import { TicketClaimForm } from '@/components/FanActions'
import { requireRole } from '@/lib/session'
import { createSupabaseServerClient } from '@/lib/supabase/server'

// The page reads the session and the database; it must block, not prerender.
export const instant = false

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export default async function FanTournamentDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  if (!UUID_PATTERN.test(id)) notFound()

  const profile = await requireRole('FAN')
  const supabase = await createSupabaseServerClient()

  const { data: tournament } = await supabase
    .from('tournaments')
    .select('id, name, max_capacity, current_players, ticket_allocation, ticket_points')
    .eq('id', id)
    .maybeSingle()

  if (!tournament) notFound()

  const { data: registration } = await supabase
    .from('registrations')
    .select('id')
    .eq('tournament_id', id)
    .eq('user_id', profile.id)
    .maybeSingle()

  const { data: ticket } = await supabase
    .from('tickets')
    .select('id, points_awarded')
    .eq('tournament_id', id)
    .eq('user_id', profile.id)
    .maybeSingle()

  const { data: matches } = await supabase
    .from('matches')
    .select('id, home_team, away_team, status, kickoff_time, home_score, away_score, markets(id)')
    .eq('tournament_id', id)
    .order('kickoff_time')

  const isFull = tournament.current_players >= tournament.max_capacity

  return (
    <AppShell profile={profile}>
      <Link href="/fan/tournaments" className="text-sm text-slate-400 underline hover:text-white">← All tournaments</Link>
      <h1 className="mt-2 text-3xl font-extrabold tracking-tight">{tournament.name}</h1>
      <p className="mt-1 text-slate-400">
        {tournament.current_players}/{tournament.max_capacity} places · {tournament.ticket_allocation} tickets · {tournament.ticket_points} pts per ticket
      </p>

      <div className="mt-6 grid gap-4 md:grid-cols-2">
        <section className="rounded border border-slate-800 bg-slate-900 p-4">
          <h2 className="text-lg font-semibold">Ticket</h2>
          {ticket ? (
            <p className="mt-2 text-sm text-emerald-400">Ticket claimed. +{ticket.points_awarded} points.</p>
          ) : (
            <div className="mt-2"><TicketClaimForm tournamentId={id} /></div>
          )}
        </section>
        <section className="rounded border border-slate-800 bg-slate-900 p-4">
          <h2 className="text-lg font-semibold">Registration</h2>
          <div className="mt-2">
            <RegistrationForm tournamentId={id} isRegistered={Boolean(registration)} isFull={isFull} />
          </div>
        </section>
      </div>

      <section className="mt-8">
        <h2 className="mb-3 text-xl font-bold">Matches</h2>
        <div className="grid gap-3">
          {(matches as Array<{ id: string; home_team: string; away_team: string; status: string; kickoff_time: string; home_score: number; away_score: number; markets: { id: string } | Array<{ id: string }> | null }> | null)?.map((match) => {
            const market = Array.isArray(match.markets) ? match.markets[0] : match.markets
            return (
              <article key={match.id} className="rounded border border-slate-800 bg-slate-900 p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="font-semibold">{match.home_team} vs {match.away_team}</span>
                  <span className="text-xs text-slate-400">{match.status} · {match.home_score}–{match.away_score}</span>
                </div>
                <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
                  <span className="text-sm text-slate-400">{new Date(match.kickoff_time).toLocaleString()}</span>
                  {market && <Link href={`/market/${market.id}`} className="rounded bg-blue-600 px-3 py-2 text-sm font-semibold text-white hover:bg-blue-700">Open market</Link>}
                </div>
              </article>
            )
          })}
          {(!matches || matches.length === 0) && <p className="text-slate-400">No matches yet.</p>}
        </div>
      </section>
    </AppShell>
  )
}
