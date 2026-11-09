import Link from 'next/link'
import Notice from '@/components/Notice'
import V3Shell from '@/components/V3Shell'
import { listPublicEvents } from '@/lib/domain/events'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { getViewer } from '@/lib/viewer'

export const instant = false

type PageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}

export default async function EventsPage({ searchParams }: PageProps) {
  const params = await searchParams
  const message = typeof params.message === 'string' ? params.message : undefined
  const error = typeof params.error === 'string' ? params.error : undefined
  const viewer = await getViewer()
  const supabase = await createSupabaseServerClient()
  const events = await listPublicEvents(supabase)

  const content = (
    <>
      <div className="mb-8">
        <h1 className="text-3xl font-extrabold tracking-tight">Events</h1>
        <p className="mt-1 text-slate-400">
          Buy a nominal ticket from the club, then make your prediction.
        </p>
      </div>

      <Notice message={message} error={error} />

      <div className="grid gap-4 md:grid-cols-2">
        {events.map((event) => (
          <article key={event.id} className="rounded border border-slate-800 bg-slate-900 p-5">
            <p className="text-xs font-semibold uppercase tracking-wide text-blue-300">
              {event.club_name}
            </p>
            <h2 className="mt-1 text-xl font-bold">{event.name}</h2>
            <p className="mt-2 text-sm text-slate-400">
              {event.ticket_allocation} tickets · capacity {event.max_capacity} ·{' '}
              {event.ticket_points} points per ticket
            </p>
            <Link
              href={`/events/${event.id}`}
              className="mt-4 inline-block rounded bg-blue-600 px-3 py-2 text-sm font-semibold text-white hover:bg-blue-700"
            >
              Open event
            </Link>
          </article>
        ))}
        {events.length === 0 && (
          <p className="text-slate-400">No published events yet. Check back soon.</p>
        )}
      </div>
    </>
  )

  if (viewer) {
    return (
      <V3Shell
        profile={viewer.profile}
        clubs={viewer.clubs}
        isAdmin={viewer.isAdmin}
        context="fan"
        clubId={viewer.clubs[0]?.club_id}
      >
        {content}
      </V3Shell>
    )
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <header className="border-b border-slate-800 bg-slate-900/80">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
          <Link href="/events" className="text-lg font-extrabold tracking-tight">
            Match<span className="text-blue-400">Pulse</span>
          </Link>
          <Link
            href="/login"
            className="rounded border border-slate-700 px-3 py-1 text-sm text-slate-300 hover:bg-slate-800"
          >
            Sign in
          </Link>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-8">{content}</main>
    </div>
  )
}
