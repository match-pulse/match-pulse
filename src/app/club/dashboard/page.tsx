import Link from 'next/link'
import { redirect } from 'next/navigation'
import Notice from '@/components/Notice'
import V3Shell from '@/components/V3Shell'
import {
  createClubAction,
  createEventAction,
  issueFanCardAction,
  requestPlanAction
} from '@/app/actions/v3'
import { getClubContext, listClubMembers } from '@/lib/domain/clubs'
import { listClubEvents } from '@/lib/domain/events'
import { salesSummary } from '@/lib/domain/analytics'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { getViewer } from '@/lib/viewer'

export const instant = false

type PageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}

export default async function ClubDashboardPage({ searchParams }: PageProps) {
  const params = await searchParams
  const message = typeof params.message === 'string' ? params.message : undefined
  const error = typeof params.error === 'string' ? params.error : undefined

  const viewer = await getViewer()
  if (!viewer) redirect('/login')

  if (viewer.clubs.length === 0) {
    return (
      <V3Shell
        profile={viewer.profile}
        clubs={viewer.clubs}
        isAdmin={viewer.isAdmin}
        context="club"
      >
        <div className="mx-auto max-w-xl">
          <h1 className="text-3xl font-extrabold tracking-tight">Create your club</h1>
          <p className="mt-1 mb-6 text-slate-400">
            Your club is the tenant. You become its owner and can invite staff, create
            events and sell nominal tickets.
          </p>
          <Notice message={message} error={error} />
          <form action={createClubAction} className="flex flex-col gap-3">
            <label htmlFor="club-name" className="text-sm text-slate-400">
              Club name
            </label>
            <input
              id="club-name"
              name="name"
              required
              className="rounded p-2 font-semibold text-black"
            />
            <label htmlFor="club-plan" className="text-sm text-slate-400">
              Plan
            </label>
            <select
              id="club-plan"
              name="plan"
              defaultValue="STARTER"
              className="rounded p-2 font-semibold text-black"
            >
              <option value="STARTER">STARTER — ticketing and basic analytics</option>
              <option value="PRO">PRO — predictions, insights and rewards</option>
              <option value="ELITE">ELITE — export and advanced analytics</option>
            </select>
            <label htmlFor="club-slug" className="text-sm text-slate-400">
              Slug (optional)
            </label>
            <input
              id="club-slug"
              name="slug"
              pattern="[a-z0-9]+(-[a-z0-9]+)*"
              className="rounded p-2 font-semibold text-black"
            />
            <button
              type="submit"
              className="rounded bg-blue-600 px-3 py-2 font-semibold text-white hover:bg-blue-700"
            >
              Create club
            </button>
          </form>
        </div>
      </V3Shell>
    )
  }

  const selectedClub =
    viewer.clubs.find((club) => club.club_id === params.club) ?? viewer.clubs[0]

  const supabase = await createSupabaseServerClient()
  const [context, events, sales, members] = await Promise.all([
    getClubContext(supabase, selectedClub.club_id),
    listClubEvents(supabase, selectedClub.club_id),
    salesSummary(supabase, selectedClub.club_id),
    listClubMembers(supabase, selectedClub.club_id)
  ])

  return (
    <V3Shell
      profile={viewer.profile}
      clubs={viewer.clubs}
      isAdmin={viewer.isAdmin}
      context="club"
      clubId={selectedClub.club_id}
    >
      <div className="mb-8 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight">{context.club.name}</h1>
          <p className="mt-1 text-slate-400">
            {context.role} · {context.plan ?? 'No plan'} ·{' '}
            {context.subscription_status ?? 'No subscription'}
          </p>
        </div>
        {viewer.clubs.length > 1 && (
          <div className="flex flex-wrap gap-2 text-sm">
            {viewer.clubs.map((club) => (
              <Link
                key={club.club_id}
                href={`/club/dashboard?club=${club.club_id}`}
                className={`rounded border px-2 py-1 ${
                  club.club_id === selectedClub.club_id
                    ? 'border-blue-500 text-blue-200'
                    : 'border-slate-700 text-slate-300 hover:bg-slate-800'
                }`}
              >
                {club.name}
              </Link>
            ))}
          </div>
        )}
      </div>

      <Notice message={message} error={error} />

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="rounded border border-slate-800 bg-slate-900 p-5">
          <h2 className="text-xl font-bold">Plan and entitlements</h2>
          <ul className="mt-3 grid gap-1 text-sm text-slate-300">
            {Object.entries(context.entitlements).map(([feature, value]) => (
              <li key={feature} className="flex justify-between gap-3">
                <span>{feature.replaceAll('_', ' ')}</span>
                <span className="font-semibold text-slate-100">
                  {value.enabled ? (value.limit === null ? 'Yes' : `Limit ${value.limit}`) : 'No'}
                </span>
              </li>
            ))}
          </ul>
          <form action={requestPlanAction} className="mt-4 flex flex-wrap items-end gap-2">
            <input type="hidden" name="clubId" value={selectedClub.club_id} />
            <div>
              <label htmlFor="request-plan" className="mb-1 block text-sm text-slate-400">
                Request a plan
              </label>
              <select
                id="request-plan"
                name="plan"
                defaultValue={context.plan ?? 'STARTER'}
                className="rounded p-2 font-semibold text-black"
              >
                <option value="STARTER">STARTER</option>
                <option value="PRO">PRO</option>
                <option value="ELITE">ELITE</option>
              </select>
            </div>
            <button
              type="submit"
              className="rounded bg-slate-700 px-3 py-2 text-sm font-semibold text-white hover:bg-slate-600"
            >
              Request
            </button>
          </form>
        </section>

        <section className="rounded border border-slate-800 bg-slate-900 p-5">
          <h2 className="text-xl font-bold">Create an event</h2>
          <form action={createEventAction} className="mt-3 grid gap-3">
            <input type="hidden" name="clubId" value={selectedClub.club_id} />
            <div>
              <label htmlFor="event-name" className="mb-1 block text-sm text-slate-400">
                Name
              </label>
              <input id="event-name" name="name" required className="w-full rounded p-2 font-semibold text-black" />
            </div>
            <div className="grid gap-3 md:grid-cols-3">
              <div>
                <label htmlFor="event-capacity" className="mb-1 block text-sm text-slate-400">
                  Capacity
                </label>
                <input
                  id="event-capacity"
                  name="capacity"
                  type="number"
                  min="1"
                  required
                  className="w-full rounded p-2 font-semibold text-black"
                />
              </div>
              <div>
                <label htmlFor="event-allocation" className="mb-1 block text-sm text-slate-400">
                  Ticket allocation
                </label>
                <input
                  id="event-allocation"
                  name="allocation"
                  type="number"
                  min="0"
                  defaultValue="100"
                  className="w-full rounded p-2 font-semibold text-black"
                />
              </div>
              <div>
                <label htmlFor="event-points" className="mb-1 block text-sm text-slate-400">
                  Points per ticket
                </label>
                <input
                  id="event-points"
                  name="points"
                  type="number"
                  min="0"
                  defaultValue="0"
                  className="w-full rounded p-2 font-semibold text-black"
                />
              </div>
            </div>
            <button
              type="submit"
              className="rounded bg-blue-600 px-3 py-2 font-semibold text-white hover:bg-blue-700"
            >
              Create event
            </button>
          </form>
        </section>
      </div>

      <section className="mt-6 rounded border border-slate-800 bg-slate-900 p-5">
        <h2 className="text-xl font-bold">Events</h2>
        <div className="mt-3 overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="text-slate-400">
              <tr>
                <th className="px-3 py-2">Name</th>
                <th className="px-3 py-2">Status</th>
                <th className="px-3 py-2">Capacity</th>
                <th className="px-3 py-2">Tickets</th>
                <th className="px-3 py-2">Manage</th>
              </tr>
            </thead>
            <tbody>
              {events.map((event) => (
                <tr key={event.id} className="border-t border-slate-800">
                  <td className="px-3 py-2 font-semibold">{event.name}</td>
                  <td className="px-3 py-2">{event.status}</td>
                  <td className="px-3 py-2">{event.max_capacity}</td>
                  <td className="px-3 py-2">{event.ticket_allocation}</td>
                  <td className="px-3 py-2">
                    <Link className="text-blue-300 underline" href={`/club/events/${event.id}`}>
                      Manage
                    </Link>
                  </td>
                </tr>
              ))}
              {events.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-3 py-4 text-slate-400">
                    No events yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <section className="rounded border border-slate-800 bg-slate-900 p-5">
          <h2 className="text-xl font-bold">Sales and attendance</h2>
          <div className="mt-3 overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="text-slate-400">
                <tr>
                  <th className="px-3 py-2">Event</th>
                  <th className="px-3 py-2">Orders</th>
                  <th className="px-3 py-2">Tickets</th>
                  <th className="px-3 py-2">Checked in</th>
                  <th className="px-3 py-2">Simulated revenue</th>
                </tr>
              </thead>
              <tbody>
                {sales.map((row) => (
                  <tr key={row.event_id} className="border-t border-slate-800">
                    <td className="px-3 py-2">{row.event_name}</td>
                    <td className="px-3 py-2">{row.orders}</td>
                    <td className="px-3 py-2">{row.tickets_sold}</td>
                    <td className="px-3 py-2">{row.checked_in}</td>
                    <td className="px-3 py-2">€{(row.simulated_revenue_cents / 100).toFixed(2)}</td>
                  </tr>
                ))}
                {sales.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-3 py-4 text-slate-400">
                      No sales yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>

        <section className="rounded border border-slate-800 bg-slate-900 p-5">
          <h2 className="text-xl font-bold">Members</h2>
          <ul className="mt-3 grid gap-2 text-sm">
            {members.map((member) => (
              <li key={member.profile_id} className="flex justify-between gap-3">
                <span>{member.username}</span>
                <span className="font-semibold text-slate-300">{member.role}</span>
              </li>
            ))}
          </ul>
          <form action={issueFanCardAction} className="mt-4 flex flex-wrap items-end gap-2">
            <input type="hidden" name="clubId" value={selectedClub.club_id} />
            <div>
              <label htmlFor="fan-card" className="mb-1 block text-sm text-slate-400">
                Issue a fan card
              </label>
              <input
                id="fan-card"
                name="cardNumber"
                required
                className="rounded p-2 font-semibold text-black"
              />
            </div>
            <button
              type="submit"
              className="rounded bg-slate-700 px-3 py-2 text-sm font-semibold text-white hover:bg-slate-600"
            >
              Issue
            </button>
          </form>
        </section>
      </div>
    </V3Shell>
  )
}
