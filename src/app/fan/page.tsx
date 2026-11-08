import Link from 'next/link'
import AppShell from '@/components/AppShell'
import { requireRole } from '@/lib/session'
import { createSupabaseServerClient } from '@/lib/supabase/server'

// The page reads the session and the database; it must block, not prerender.
export const instant = false

type Tournament = {
  id: string
  name: string
  max_capacity: number
  current_players: number
  ticket_allocation: number
  ticket_points: number
}

type Match = {
  id: string
  home_team: string
  away_team: string
  status: string
  kickoff_time: string
  home_score: number
  away_score: number
  markets: Array<{ id: string; status: string }> | null
}

export default async function FanHome() {
  const profile = await requireRole('FAN')
  const supabase = await createSupabaseServerClient()

  const [{ data: tournaments }, { data: matches }] = await Promise.all([
    supabase.from('tournaments').select('id, name, max_capacity, current_players, ticket_allocation, ticket_points').order('name'),
    supabase.from('matches').select('id, home_team, away_team, status, kickoff_time, home_score, away_score, markets(id, status)').order('kickoff_time')
  ])

  return (
    <AppShell profile={profile}>
      <div className="mb-8 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight">Fan home</h1>
          <p className="mt-1 text-slate-400">Claim a ticket, register, follow the match and trade points.</p>
        </div>
        <Link href="/fan/rewards" className="rounded bg-emerald-600 px-3 py-2 text-sm font-semibold text-white hover:bg-emerald-700">
          Rewards
        </Link>
      </div>

      <section aria-labelledby="tournaments-heading" className="mb-10">
        <h2 id="tournaments-heading" className="mb-3 text-xl font-bold">Tournaments</h2>
        <div className="grid gap-3 md:grid-cols-2">
          {(tournaments as Tournament[] | null)?.map((tournament) => (
            <article key={tournament.id} className="rounded border border-slate-800 bg-slate-900 p-4">
              <h3 className="text-lg font-semibold">{tournament.name}</h3>
              <p className="mt-1 text-sm text-slate-400">
                {tournament.current_players}/{tournament.max_capacity} places · {tournament.ticket_allocation} tickets · {tournament.ticket_points} pts per ticket
              </p>
              <Link href={`/fan/tournaments/${tournament.id}`} className="mt-3 inline-block rounded bg-blue-600 px-3 py-2 text-sm font-semibold text-white hover:bg-blue-700">
                Open tournament
              </Link>
            </article>
          ))}
          {(!tournaments || tournaments.length === 0) && <p className="text-slate-400">No tournaments yet.</p>}
        </div>
      </section>

      <section aria-labelledby="matches-heading">
        <h2 id="matches-heading" className="mb-3 text-xl font-bold">Matches</h2>
        <div className="grid gap-3 md:grid-cols-2">
          {(matches as Match[] | null)?.map((match) => {
            const market = match.markets?.[0]
            return (
              <article key={match.id} className="rounded border border-slate-800 bg-slate-900 p-4">
                <div className="flex items-center justify-between gap-2">
                  <h3 className="text-lg font-semibold">{match.home_team} vs {match.away_team}</h3>
                  <span className="rounded bg-slate-800 px-2 py-1 text-xs text-slate-300">{match.status}</span>
                </div>
                <p className="mt-1 text-sm text-slate-400">
                  Score {match.home_score}–{match.away_score} · {new Date(match.kickoff_time).toLocaleString()}
                </p>
                {market ? (
                  <Link href={`/market/${market.id}`} className="mt-3 inline-block rounded bg-blue-600 px-3 py-2 text-sm font-semibold text-white hover:bg-blue-700">
                    Open market
                  </Link>
                ) : (
                  <p className="mt-3 text-sm text-amber-300">Market not created yet.</p>
                )}
              </article>
            )
          })}
          {(!matches || matches.length === 0) && <p className="text-slate-400">No matches yet.</p>}
        </div>
      </section>
    </AppShell>
  )
}
