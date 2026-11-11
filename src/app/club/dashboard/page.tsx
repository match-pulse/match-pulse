import Link from 'next/link'
import { redirect } from 'next/navigation'
import Notice from '@/components/Notice'
import V3Shell from '@/components/V3Shell'
import {
  createClubAction,
  inviteMemberAction,
  removeMemberAction,
  requestPlanAction,
  setMemberRoleAction
} from '@/app/actions/clubs'
import { createEventAction } from '@/app/actions/events'
import { createRewardAction } from '@/app/actions/analytics'
import { issueFanCardAction } from '@/app/actions/tickets'
import { getClubContext, listClubMembers } from '@/lib/domain/clubs'
import { listClubEvents } from '@/lib/domain/events'
import { listClubRewards, predictionInsights, salesSummary } from '@/lib/domain/analytics'
import { listFanCards } from '@/lib/domain/tickets'
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
  const inviteToken = typeof params.invite === 'string' ? params.invite : undefined

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
              className="rounded p-2 bg-white font-semibold text-black"
            />
            <label htmlFor="club-plan" className="text-sm text-slate-400">
              Plan
            </label>
            <select
              id="club-plan"
              name="plan"
              defaultValue="STARTER"
              className="rounded p-2 bg-white font-semibold text-black"
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
              className="rounded p-2 bg-white font-semibold text-black"
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

  const requestedClubId = typeof params.club === 'string' ? params.club : undefined
  const selectedClub =
    viewer.clubs.find((club) => club.club_id === requestedClubId) ?? viewer.clubs[0]

  const supabase = await createSupabaseServerClient()
  const context = await getClubContext(supabase, selectedClub.club_id)
  const canSeeAttendees = context.role !== 'ANALYST'

  const [events, sales, members, fanCards, rewards, insights] = await Promise.all([
    listClubEvents(supabase, selectedClub.club_id),
    salesSummary(supabase, selectedClub.club_id),
    listClubMembers(supabase, selectedClub.club_id),
    canSeeAttendees ? listFanCards(supabase, selectedClub.club_id) : Promise.resolve([]),
    listClubRewards(supabase, selectedClub.club_id),
    context.entitlements.prediction_insights?.enabled
      ? predictionInsights(supabase, selectedClub.club_id)
      : Promise.resolve([])
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
                className="rounded p-2 bg-white font-semibold text-black"
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
              <input id="event-name" name="name" required className="w-full rounded p-2 bg-white font-semibold text-black" />
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
                  className="w-full rounded p-2 bg-white font-semibold text-black"
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
                  className="w-full rounded p-2 bg-white font-semibold text-black"
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
                  className="w-full rounded p-2 bg-white font-semibold text-black"
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
          <ul className="mt-3 grid gap-3 text-sm">
            {members.map((member) => {
              const canManage =
                member.role !== 'OWNER' &&
                (context.role === 'OWNER' ||
                  (context.role === 'ADMIN' && member.role !== 'ADMIN'))

              return (
                <li key={member.profile_id} className="rounded border border-slate-800 p-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span>{member.username}</span>
                    <span className="font-semibold text-slate-300">{member.role}</span>
                  </div>
                  {canManage && (
                    <div className="mt-2 flex flex-wrap items-end gap-2">
                      <form action={setMemberRoleAction} className="flex items-end gap-2">
                        <input type="hidden" name="clubId" value={selectedClub.club_id} />
                        <input type="hidden" name="profileId" value={member.profile_id} />
                        <select
                          name="role"
                          defaultValue={member.role}
                          aria-label={`Role for ${member.username}`}
                          className="rounded bg-white p-1 text-black"
                        >
                          <option value="ADMIN">ADMIN</option>
                          <option value="STAFF">STAFF</option>
                          <option value="ANALYST">ANALYST</option>
                        </select>
                        <button
                          type="submit"
                          className="rounded border border-slate-700 px-2 py-1 text-xs font-semibold hover:bg-slate-800"
                        >
                          Save role
                        </button>
                      </form>
                      <form action={removeMemberAction}>
                        <input type="hidden" name="clubId" value={selectedClub.club_id} />
                        <input type="hidden" name="profileId" value={member.profile_id} />
                        <button
                          type="submit"
                          className="rounded border border-red-800 px-2 py-1 text-xs font-semibold text-red-200 hover:bg-red-950"
                        >
                          Remove
                        </button>
                      </form>
                    </div>
                  )}
                </li>
              )
            })}
          </ul>

          <form action={inviteMemberAction} className="mt-4 grid gap-2">
            <input type="hidden" name="clubId" value={selectedClub.club_id} />
            <label htmlFor="invite-email" className="text-sm text-slate-400">
              Invite a member
            </label>
            <input
              id="invite-email"
              name="email"
              type="email"
              required
              className="rounded bg-white p-2 font-semibold text-black"
            />
            <select
              name="role"
              defaultValue="STAFF"
              aria-label="Invitation role"
              className="rounded bg-white p-2 font-semibold text-black"
            >
              <option value="ADMIN">ADMIN</option>
              <option value="STAFF">STAFF</option>
              <option value="ANALYST">ANALYST</option>
            </select>
            <button
              type="submit"
              className="rounded bg-blue-600 px-3 py-2 text-sm font-semibold text-white hover:bg-blue-700"
            >
              Create invitation
            </button>
          </form>

          {inviteToken && (
            <div className="mt-3 rounded bg-slate-950 p-3 text-sm">
              <p className="text-slate-300">Invitation link:</p>
              <Link
                href={`/club/invite/${inviteToken}`}
                className="break-all text-blue-300 underline"
              >
                /club/invite/{inviteToken}
              </Link>
            </div>
          )}

          {canSeeAttendees && (
            <>
              <h3 className="mt-5 text-lg font-semibold">Fan cards</h3>
              <div className="mt-2 overflow-x-auto">
                <table className="min-w-full text-left text-sm">
                  <thead className="text-slate-400">
                    <tr>
                      <th className="px-2 py-1">Card</th>
                      <th className="px-2 py-1">Fan</th>
                      <th className="px-2 py-1">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {fanCards.map((card) => (
                      <tr key={card.card_id} className="border-t border-slate-800">
                        <td className="px-2 py-1 font-mono text-xs">{card.card_number}</td>
                        <td className="px-2 py-1">{card.username ?? '—'}</td>
                        <td className="px-2 py-1">{card.status}</td>
                      </tr>
                    ))}
                    {fanCards.length === 0 && (
                      <tr>
                        <td colSpan={3} className="px-2 py-3 text-slate-400">
                          No fan cards yet.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              <form action={issueFanCardAction} className="mt-3 flex flex-wrap items-end gap-2">
                <input type="hidden" name="clubId" value={selectedClub.club_id} />
                <div>
                  <label htmlFor="fan-card" className="mb-1 block text-sm text-slate-400">
                    Issue a fan card
                  </label>
                  <input
                    id="fan-card"
                    name="cardNumber"
                    required
                    className="rounded bg-white p-2 font-semibold text-black"
                  />
                </div>
                <button
                  type="submit"
                  className="rounded bg-slate-700 px-3 py-2 text-sm font-semibold text-white hover:bg-slate-600"
                >
                  Issue
                </button>
              </form>
            </>
          )}
        </section>
      </div>

      {context.entitlements.club_rewards?.enabled && (
        <section className="mt-6 rounded border border-slate-800 bg-slate-900 p-5">
          <h2 className="text-xl font-bold">Club rewards</h2>
          <div className="mt-3 overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="text-slate-400">
                <tr>
                  <th className="px-3 py-2">Name</th>
                  <th className="px-3 py-2">Cost</th>
                  <th className="px-3 py-2">Discount</th>
                </tr>
              </thead>
              <tbody>
                {rewards.map((reward) => (
                  <tr key={reward.id} className="border-t border-slate-800">
                    <td className="px-3 py-2">{reward.name}</td>
                    <td className="px-3 py-2">{reward.cost_points} pts</td>
                    <td className="px-3 py-2">{reward.discount_percent}%</td>
                  </tr>
                ))}
                {rewards.length === 0 && (
                  <tr>
                    <td colSpan={3} className="px-3 py-4 text-slate-400">
                      No rewards yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          <form action={createRewardAction} className="mt-4 grid gap-2 md:grid-cols-4">
            <input type="hidden" name="clubId" value={selectedClub.club_id} />
            <input
              name="name"
              required
              placeholder="Reward name"
              aria-label="Reward name"
              className="rounded bg-white p-2 font-semibold text-black"
            />
            <input
              name="cost"
              type="number"
              min="1"
              required
              placeholder="Cost points"
              aria-label="Reward cost points"
              className="rounded bg-white p-2 font-semibold text-black"
            />
            <input
              name="discount"
              type="number"
              min="1"
              max="100"
              required
              placeholder="Discount %"
              aria-label="Reward discount percent"
              className="rounded bg-white p-2 font-semibold text-black"
            />
            <button
              type="submit"
              className="rounded bg-blue-600 px-3 py-2 text-sm font-semibold text-white hover:bg-blue-700"
            >
              Create reward
            </button>
          </form>
        </section>
      )}

      {context.entitlements.prediction_insights?.enabled && (
        <section className="mt-6 rounded border border-slate-800 bg-slate-900 p-5">
          <h2 className="text-xl font-bold">Aggregate prediction insights</h2>
          <p className="mt-1 text-sm text-slate-400">
            Aggregate only. Cohorts below 5 predictors are suppressed. No attendee identity is included.
          </p>
          <div className="mt-3 overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="text-slate-400">
                <tr>
                  <th className="px-3 py-2">Match</th>
                  <th className="px-3 py-2">Outcome</th>
                  <th className="px-3 py-2">Predictors</th>
                  <th className="px-3 py-2">Trades</th>
                  <th className="px-3 py-2">Last price</th>
                  <th className="px-3 py-2">Status</th>
                </tr>
              </thead>
              <tbody>
                {insights.map((row) => (
                  <tr key={`${row.market_id}-${row.outcome}`} className="border-t border-slate-800">
                    <td className="px-3 py-2">
                      {row.home_team} vs {row.away_team}
                    </td>
                    <td className="px-3 py-2">{row.outcome}</td>
                    <td className="px-3 py-2">{row.unique_predictors ?? '—'}</td>
                    <td className="px-3 py-2">{row.trades ?? '—'}</td>
                    <td className="px-3 py-2">
                      {row.last_price === null ? '—' : `${(Number(row.last_price) * 100).toFixed(1)}%`}
                    </td>
                    <td className="px-3 py-2">{row.suppressed ? 'Suppressed' : 'Aggregate'}</td>
                  </tr>
                ))}
                {insights.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-3 py-4 text-slate-400">
                      No prediction data yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {context.entitlements.data_export?.enabled && context.role !== 'STAFF' && (
        <section className="mt-6 rounded border border-slate-800 bg-slate-900 p-5">
          <h2 className="text-xl font-bold">Analytics export</h2>
          <p className="mt-1 text-sm text-slate-400">
            Download the aggregate sales and prediction CSV. The export is audited.
          </p>
          <Link
            href={`/api/club/export-v3?club=${selectedClub.club_id}`}
            className="mt-3 inline-block rounded bg-emerald-700 px-3 py-2 text-sm font-semibold text-white hover:bg-emerald-800"
          >
            Download CSV
          </Link>
        </section>
      )}
    </V3Shell>
  )
}
