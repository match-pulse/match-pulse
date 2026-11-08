import Link from 'next/link'
import AppShell from '@/components/AppShell'
import { CreateTournamentForm } from '@/components/OrganizerForms'
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

export default async function OrganizerHome() {
  const profile = await requireRole('ORGANIZER')
  const supabase = await createSupabaseServerClient()
  const { data: tournaments } = await supabase
    .from('tournaments')
    .select('id, name, max_capacity, current_players, ticket_allocation, ticket_points')
    .eq('organizer_id', profile.id)
    .order('name')

  return (
    <AppShell profile={profile}>
      <h1 className="text-3xl font-extrabold tracking-tight">Organizer dashboard</h1>
      <p className="mt-1 mb-6 text-slate-400">Create a tournament, add matches and finalize results.</p>

      <section className="mb-8">
        <h2 className="mb-3 text-xl font-bold">Create tournament</h2>
        <CreateTournamentForm />
      </section>

      <section>
        <h2 className="mb-3 text-xl font-bold">Your tournaments</h2>
        <div className="grid gap-3 md:grid-cols-2">
          {(tournaments as Tournament[] | null)?.map((tournament) => (
            <article key={tournament.id} className="rounded border border-slate-800 bg-slate-900 p-4">
              <h3 className="text-lg font-semibold">{tournament.name}</h3>
              <p className="mt-1 text-sm text-slate-400">
                {tournament.current_players}/{tournament.max_capacity} places · {tournament.ticket_allocation} tickets · {tournament.ticket_points} pts per ticket
              </p>
              <Link href={`/organizer/tournaments/${tournament.id}`} className="mt-3 inline-block rounded bg-blue-600 px-3 py-2 text-sm font-semibold text-white hover:bg-blue-700">
                Manage
              </Link>
            </article>
          ))}
          {(!tournaments || tournaments.length === 0) && <p className="text-slate-400">No tournaments yet. Create one above.</p>}
        </div>
      </section>
    </AppShell>
  )
}
