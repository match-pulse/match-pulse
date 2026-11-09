import Link from 'next/link'
import { notFound } from 'next/navigation'
import EventCheckout from '@/components/EventCheckout'
import Notice from '@/components/Notice'
import V3Shell from '@/components/V3Shell'
import { getPublicEvent } from '@/lib/domain/events'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { getViewer } from '@/lib/viewer'

export const instant = false

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

type PageProps = {
  params: Promise<{ id: string }>
  searchParams: Promise<Record<string, string | string[] | undefined>>
}

export default async function EventPage({ params, searchParams }: PageProps) {
  const { id } = await params
  if (!UUID_PATTERN.test(id)) notFound()

  const query = await searchParams
  const message = typeof query.message === 'string' ? query.message : undefined
  const error = typeof query.error === 'string' ? query.error : undefined

  const supabase = await createSupabaseServerClient()
  const { event, ticketTypes, matches } = await getPublicEvent(supabase, id)
  if (!event) notFound()

  const viewer = await getViewer()

  const content = (
    <>
      <div className="mb-8">
        <p className="text-xs font-semibold uppercase tracking-wide text-blue-300">
          {event.club_name}
        </p>
        <h1 className="mt-1 text-3xl font-extrabold tracking-tight">{event.name}</h1>
        <p className="mt-1 text-slate-400">
          {event.ticket_allocation} tickets · capacity {event.max_capacity} ·{' '}
          {event.ticket_points} points per ticket
        </p>
      </div>

      <Notice message={message} error={error} />

      <div className="grid gap-8 lg:grid-cols-[1.2fr_0.8fr]">
        <section aria-labelledby="tickets-heading">
          <h2 id="tickets-heading" className="mb-3 text-xl font-bold">
            Tickets
          </h2>
          {viewer ? (
            <EventCheckout eventId={event.id} ticketTypes={ticketTypes} />
          ) : (
            <div className="rounded border border-slate-800 bg-slate-900 p-4">
              <p className="text-slate-300">Sign in to buy a nominal ticket.</p>
              <Link
                href={`/login?next=${encodeURIComponent(`/events/${event.id}`)}`}
                className="mt-3 inline-block rounded bg-blue-600 px-3 py-2 text-sm font-semibold text-white hover:bg-blue-700"
              >
                Sign in
              </Link>
            </div>
          )}
        </section>

        <section aria-labelledby="matches-heading">
          <h2 id="matches-heading" className="mb-3 text-xl font-bold">
            Matches
          </h2>
          <div className="flex flex-col gap-3">
            {matches.map((match) => (
              <article key={match.id} className="rounded border border-slate-800 bg-slate-900 p-4">
                <div className="flex items-center justify-between gap-2">
                  <h3 className="font-semibold">
                    {match.home_team} vs {match.away_team}
                  </h3>
                  <span className="rounded bg-slate-800 px-2 py-1 text-xs text-slate-300">
                    {match.status}
                  </span>
                </div>
                <p className="mt-1 text-sm text-slate-400">
                  Score {match.home_score}–{match.away_score} ·{' '}
                  {new Date(match.kickoff_time).toLocaleString()}
                </p>
                {match.market_id ? (
                  <Link
                    href={`/market/${match.market_id}`}
                    className="mt-3 inline-block rounded bg-blue-600 px-3 py-2 text-sm font-semibold text-white hover:bg-blue-700"
                  >
                    Open prediction market
                  </Link>
                ) : (
                  <p className="mt-3 text-sm text-slate-400">Predictions are not enabled.</p>
                )}
              </article>
            ))}
            {matches.length === 0 && <p className="text-slate-400">No matches announced yet.</p>}
          </div>
        </section>
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
