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

export default async function FanTournaments() {
  const profile = await requireRole('FAN')
  const supabase = await createSupabaseServerClient()
  const { data: tournaments } = await supabase
    .from('tournaments')
    .select('id, name, max_capacity, current_players, ticket_allocation, ticket_points')
    .is('club_id', null)
    .order('name')

  return (
    <AppShell profile={profile}>
      <h1 className="mb-2 text-3xl font-extrabold tracking-tight">Tournaments</h1>
      <p className="mb-6 text-slate-400">Claim a ticket and register while places remain.</p>
      <div className="grid gap-3 md:grid-cols-2">
        {(tournaments as Tournament[] | null)?.map((tournament) => (
          <article key={tournament.id} className="rounded border border-slate-800 bg-slate-900 p-4">
            <h2 className="text-lg font-semibold">{tournament.name}</h2>
            <p className="mt-1 text-sm text-slate-400">
              {tournament.current_players}/{tournament.max_capacity} places · {tournament.ticket_allocation} tickets · {tournament.ticket_points} pts per ticket
            </p>
            <Link href={`/fan/tournaments/${tournament.id}`} className="mt-3 inline-block rounded bg-blue-600 px-3 py-2 text-sm font-semibold text-white hover:bg-blue-700">
              Open
            </Link>
          </article>
        ))}
      </div>
    </AppShell>
  )
}
