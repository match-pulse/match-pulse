import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import Notice from '@/components/Notice'
import V3Shell from '@/components/V3Shell'
import {
  checkInAction,
  createMatchAction,
  createTicketTypeAction,
  publishEventAction,
  setPredictionAction,
  updateMatchAction
} from '@/app/actions/v3'
import { getClubContext } from '@/lib/domain/clubs'
import {
  getClubEvent,
  listClubMatches,
  listClubTicketTypes
} from '@/lib/domain/events'
import { listClubAttendees, listClubOrders } from '@/lib/domain/tickets'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { getViewer } from '@/lib/viewer'

export const instant = false

type PageProps = {
  params: Promise<{ id: string }>
  searchParams: Promise<Record<string, string | string[] | undefined>>
}

export default async function ClubEventPage({ params, searchParams }: PageProps) {
  const { id } = await params
  const query = await searchParams
  const message = typeof query.message === 'string' ? query.message : undefined
  const error = typeof query.error === 'string' ? query.error : undefined

  const viewer = await getViewer()
  if (!viewer) redirect('/login')

  const supabase = await createSupabaseServerClient()
  const event = await getClubEvent(supabase, id)
  if (!event || !event.club_id) notFound()

  const membership = viewer.clubs.find((club) => club.club_id === event.club_id)
  if (!membership) {
    redirect('/club/dashboard?error=You+do+not+have+access+to+this+event.')
  }

  const [context, ticketTypes, matches] = await Promise.all([
    getClubContext(supabase, event.club_id),
    listClubTicketTypes(supabase, id),
    listClubMatches(supabase, id)
  ])

  const canSeeAttendees = membership.role !== 'ANALYST'
  const [attendees, orders] = canSeeAttendees
    ? await Promise.all([
        listClubAttendees(supabase, id),
        listClubOrders(supabase, id)
      ])
    : [[], []]

  return (
    <V3Shell
      profile={viewer.profile}
      clubs={viewer.clubs}
      isAdmin={viewer.isAdmin}
      context="club"
      clubId={event.club_id}
    >
      <div className="mb-8">
        <Link href={`/club/dashboard?club=${event.club_id}`} className="text-sm text-blue-300 underline">
          ← {context.club.name}
        </Link>
        <div className="mt-2 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="text-3xl font-extrabold tracking-tight">{event.name}</h1>
            <p className="mt-1 text-slate-400">
              {event.status} · capacity {event.max_capacity} · {event.ticket_allocation} tickets ·{' '}
              {event.ticket_points} points per ticket
            </p>
          </div>
          {event.status === 'DRAFT' && (
            <form action={publishEventAction}>
              <input type="hidden" name="eventId" value={id} />
              <button
                type="submit"
                className="rounded bg-emerald-700 px-3 py-2 text-sm font-semibold text-white hover:bg-emerald-800"
              >
                Publish event
              </button>
            </form>
          )}
        </div>
      </div>

      <Notice message={message} error={error} />

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="rounded border border-slate-800 bg-slate-900 p-5">
          <h2 className="text-xl font-bold">Ticket types</h2>
          <div className="mt-3 overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="text-slate-400">
                <tr>
                  <th className="px-3 py-2">Name</th>
                  <th className="px-3 py-2">Price</th>
                  <th className="px-3 py-2">Sold</th>
                  <th className="px-3 py-2">Rules</th>
                </tr>
              </thead>
              <tbody>
                {ticketTypes.map((type) => (
                  <tr key={type.ticket_type_id} className="border-t border-slate-800">
                    <td className="px-3 py-2 font-semibold">{type.name}</td>
                    <td className="px-3 py-2">€{(type.price_cents / 100).toFixed(2)}</td>
                    <td className="px-3 py-2">
                      {type.sold_count}/{type.allocation}
                    </td>
                    <td className="px-3 py-2 text-xs text-slate-400">
                      max {type.max_per_buyer}
                      {type.requires_fan_card ? ' · fan card' : ''}
                      {!type.transferable ? ' · no transfer' : ''}
                      {type.away_sector ? ' · away' : ''}
                    </td>
                  </tr>
                ))}
                {ticketTypes.length === 0 && (
                  <tr>
                    <td colSpan={4} className="px-3 py-4 text-slate-400">
                      No ticket types yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <form action={createTicketTypeAction} className="mt-4 grid gap-3">
            <input type="hidden" name="eventId" value={id} />
            <div>
              <label htmlFor="type-name" className="mb-1 block text-sm text-slate-400">
                Name
              </label>
              <input id="type-name" name="name" required className="w-full rounded p-2 font-semibold text-black" />
            </div>
            <div className="grid gap-3 md:grid-cols-3">
              <div>
                <label htmlFor="type-price" className="mb-1 block text-sm text-slate-400">
                  Price (cents)
                </label>
                <input
                  id="type-price"
                  name="priceCents"
                  type="number"
                  min="0"
                  defaultValue="1500"
                  className="w-full rounded p-2 font-semibold text-black"
                />
              </div>
              <div>
                <label htmlFor="type-allocation" className="mb-1 block text-sm text-slate-400">
                  Allocation
                </label>
                <input
                  id="type-allocation"
                  name="allocation"
                  type="number"
                  min="0"
                  defaultValue="100"
                  className="w-full rounded p-2 font-semibold text-black"
                />
              </div>
              <div>
                <label htmlFor="type-max" className="mb-1 block text-sm text-slate-400">
                  Max per buyer
                </label>
                <input
                  id="type-max"
                  name="maxPerBuyer"
                  type="number"
                  min="1"
                  max="4"
                  defaultValue="4"
                  className="w-full rounded p-2 font-semibold text-black"
                />
              </div>
            </div>
            <div>
              <label htmlFor="type-deadline" className="mb-1 block text-sm text-slate-400">
                Transfer deadline (optional)
              </label>
              <input
                id="type-deadline"
                name="transferDeadline"
                type="datetime-local"
                className="w-full rounded p-2 font-semibold text-black"
              />
            </div>
            <div className="flex flex-wrap gap-4 text-sm text-slate-300">
              <label className="flex items-center gap-2">
                <input type="checkbox" name="requiresFanCard" /> Requires fan card
              </label>
              <label className="flex items-center gap-2">
                <input type="checkbox" name="nonTransferable" /> Non-transferable
              </label>
              <label className="flex items-center gap-2">
                <input type="checkbox" name="awaySector" /> Away sector
              </label>
            </div>
            <button
              type="submit"
              className="rounded bg-blue-600 px-3 py-2 font-semibold text-white hover:bg-blue-700"
            >
              Add ticket type
            </button>
          </form>
        </section>

        <section className="rounded border border-slate-800 bg-slate-900 p-5">
          <h2 className="text-xl font-bold">Create a match</h2>
          <form action={createMatchAction} className="mt-3 grid gap-3">
            <input type="hidden" name="eventId" value={id} />
            <div className="grid gap-3 md:grid-cols-2">
              <div>
                <label htmlFor="home-team" className="mb-1 block text-sm text-slate-400">
                  Home team
                </label>
                <input id="home-team" name="homeTeam" required className="w-full rounded p-2 font-semibold text-black" />
              </div>
              <div>
                <label htmlFor="away-team" className="mb-1 block text-sm text-slate-400">
                  Away team
                </label>
                <input id="away-team" name="awayTeam" required className="w-full rounded p-2 font-semibold text-black" />
              </div>
            </div>
            <div>
              <label htmlFor="kickoff" className="mb-1 block text-sm text-slate-400">
                Kickoff
              </label>
              <input
                id="kickoff"
                name="kickoff"
                type="datetime-local"
                required
                className="w-full rounded p-2 font-semibold text-black"
              />
            </div>
            <label className="flex items-center gap-2 text-sm text-slate-300">
              <input type="checkbox" name="predictions" /> Enable prediction market
            </label>
            <button
              type="submit"
              className="rounded bg-blue-600 px-3 py-2 font-semibold text-white hover:bg-blue-700"
            >
              Create match
            </button>
          </form>
        </section>
      </div>

      <section className="mt-6 rounded border border-slate-800 bg-slate-900 p-5">
        <h2 className="text-xl font-bold">Matches</h2>
        <div className="mt-3 grid gap-4">
          {matches.map((match) => (
            <article key={match.match_id} className="rounded border border-slate-800 p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h3 className="font-semibold">
                  {match.home_team} vs {match.away_team}
                </h3>
                <span className="rounded bg-slate-800 px-2 py-1 text-xs text-slate-300">
                  {match.status}
                </span>
              </div>
              <p className="mt-1 text-sm text-slate-400">
                Score {match.home_score}–{match.away_score} ·{' '}
                {new Date(match.kickoff_time).toLocaleString()} · market{' '}
                {match.market_status ?? 'none'}
              </p>

              <form action={updateMatchAction} className="mt-3 flex flex-wrap items-end gap-2">
                <input type="hidden" name="eventId" value={id} />
                <input type="hidden" name="matchId" value={match.match_id} />
                <div>
                  <label htmlFor={`home-${match.match_id}`} className="mb-1 block text-sm text-slate-400">
                    Home
                  </label>
                  <input
                    id={`home-${match.match_id}`}
                    name="homeScore"
                    type="number"
                    min="0"
                    defaultValue={match.home_score}
                    className="w-20 rounded p-2 font-semibold text-black"
                  />
                </div>
                <div>
                  <label htmlFor={`away-${match.match_id}`} className="mb-1 block text-sm text-slate-400">
                    Away
                  </label>
                  <input
                    id={`away-${match.match_id}`}
                    name="awayScore"
                    type="number"
                    min="0"
                    defaultValue={match.away_score}
                    className="w-20 rounded p-2 font-semibold text-black"
                  />
                </div>
                <div>
                  <label htmlFor={`status-${match.match_id}`} className="mb-1 block text-sm text-slate-400">
                    Status
                  </label>
                  <select
                    id={`status-${match.match_id}`}
                    name="status"
                    defaultValue={match.status}
                    className="rounded p-2 font-semibold text-black"
                  >
                    <option value="SCHEDULED">SCHEDULED</option>
                    <option value="LIVE">LIVE</option>
                    <option value="FINISHED">FINISHED</option>
                  </select>
                </div>
                <button
                  type="submit"
                  className="rounded bg-slate-700 px-3 py-2 text-sm font-semibold text-white hover:bg-slate-600"
                >
                  Save match
                </button>
              </form>

              <form action={setPredictionAction} className="mt-3 flex items-center gap-2 text-sm text-slate-300">
                <input type="hidden" name="eventId" value={id} />
                <input type="hidden" name="matchId" value={match.match_id} />
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    name="enabled"
                    defaultChecked={match.prediction_enabled}
                  />
                  Predictions enabled
                </label>
                <button
                  type="submit"
                  className="rounded border border-slate-700 px-2 py-1 text-xs font-semibold hover:bg-slate-800"
                >
                  Update
                </button>
              </form>
            </article>
          ))}
          {matches.length === 0 && <p className="text-slate-400">No matches yet.</p>}
        </div>
      </section>

      {canSeeAttendees ? (
        <div className="mt-6 grid gap-6 lg:grid-cols-2">
          <section className="rounded border border-slate-800 bg-slate-900 p-5">
            <h2 className="text-xl font-bold">Attendees</h2>
            <form action={checkInAction} className="mt-3 flex flex-wrap items-end gap-2">
              <input type="hidden" name="eventId" value={id} />
              <div>
                <label htmlFor="ticket-code" className="mb-1 block text-sm text-slate-400">
                  Check in by code
                </label>
                <input id="ticket-code" name="code" required className="rounded p-2 font-mono font-semibold text-black" />
              </div>
              <button
                type="submit"
                className="rounded bg-emerald-700 px-3 py-2 text-sm font-semibold text-white hover:bg-emerald-800"
              >
                Check in
              </button>
            </form>
            <div className="mt-3 overflow-x-auto">
              <table className="min-w-full text-left text-sm">
                <thead className="text-slate-400">
                  <tr>
                    <th className="px-3 py-2">Attendee</th>
                    <th className="px-3 py-2">Type</th>
                    <th className="px-3 py-2">Code</th>
                    <th className="px-3 py-2">Checked in</th>
                  </tr>
                </thead>
                <tbody>
                  {attendees.map((attendee) => (
                    <tr key={attendee.ticket_id} className="border-t border-slate-800">
                      <td className="px-3 py-2">
                        {attendee.attendee_first_name} {attendee.attendee_last_name}
                      </td>
                      <td className="px-3 py-2">{attendee.ticket_type ?? 'Ticket'}</td>
                      <td className="px-3 py-2 font-mono text-xs">{attendee.ticket_code}</td>
                      <td className="px-3 py-2">
                        {attendee.checked_in_at
                          ? new Date(attendee.checked_in_at).toLocaleString()
                          : 'No'}
                      </td>
                    </tr>
                  ))}
                  {attendees.length === 0 && (
                    <tr>
                      <td colSpan={4} className="px-3 py-4 text-slate-400">
                        No attendees yet.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>

          <section className="rounded border border-slate-800 bg-slate-900 p-5">
            <h2 className="text-xl font-bold">Orders</h2>
            <div className="mt-3 overflow-x-auto">
              <table className="min-w-full text-left text-sm">
                <thead className="text-slate-400">
                  <tr>
                    <th className="px-3 py-2">Buyer</th>
                    <th className="px-3 py-2">Type</th>
                    <th className="px-3 py-2">Qty</th>
                    <th className="px-3 py-2">Channel</th>
                  </tr>
                </thead>
                <tbody>
                  {orders.map((order) => (
                    <tr key={order.order_id} className="border-t border-slate-800">
                      <td className="px-3 py-2">{order.buyer_username}</td>
                      <td className="px-3 py-2">{order.ticket_type}</td>
                      <td className="px-3 py-2">{order.quantity}</td>
                      <td className="px-3 py-2">{order.channel}</td>
                    </tr>
                  ))}
                  {orders.length === 0 && (
                    <tr>
                      <td colSpan={4} className="px-3 py-4 text-slate-400">
                        No orders yet.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>
        </div>
      ) : (
        <p className="mt-6 rounded border border-slate-800 bg-slate-900 p-4 text-sm text-slate-400">
          Analyst view: attendee identity and orders are hidden.
        </p>
      )}
    </V3Shell>
  )
}
