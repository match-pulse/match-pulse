import Link from 'next/link'
import Image from 'next/image'
import { redirect } from 'next/navigation'
import QRCode from 'qrcode'
import Notice from '@/components/Notice'
import V3Shell from '@/components/V3Shell'
import { transferTicketAction } from '@/app/actions/tickets'
import { listMyTickets } from '@/lib/domain/tickets'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { getViewer } from '@/lib/viewer'

export const instant = false

type PageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}

export default async function MyTicketsPage({ searchParams }: PageProps) {
  const params = await searchParams
  const message = typeof params.message === 'string' ? params.message : undefined
  const error = typeof params.error === 'string' ? params.error : undefined

  const viewer = await getViewer()
  if (!viewer) redirect('/login')

  const supabase = await createSupabaseServerClient()
  const tickets = await listMyTickets(supabase)
  const qrCodes = new Map<string, string>()
  await Promise.all(
    tickets.map(async (ticket) => {
      qrCodes.set(
        ticket.ticket_id,
        await QRCode.toDataURL(ticket.ticket_code, { margin: 1, width: 180 })
      )
    })
  )

  return (
    <V3Shell
      profile={viewer.profile}
      clubs={viewer.clubs}
      isAdmin={viewer.isAdmin}
      context="fan"
      clubId={viewer.clubs[0]?.club_id}
    >
      <div className="mb-8 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight">My tickets</h1>
          <p className="mt-1 text-slate-400">Your nominal tickets and entry codes.</p>
        </div>
        <Link
          href="/events"
          className="rounded bg-blue-600 px-3 py-2 text-sm font-semibold text-white hover:bg-blue-700"
        >
          Browse events
        </Link>
      </div>

      <Notice message={message} error={error} />

      <div className="grid gap-4">
        {tickets.map((ticket) => (
          <article key={ticket.ticket_id} className="rounded border border-slate-800 bg-slate-900 p-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-blue-300">
                  {ticket.club_name}
                </p>
                <h2 className="mt-1 text-xl font-bold">{ticket.event_name}</h2>
                <p className="mt-1 text-sm text-slate-400">
                  {ticket.attendee_first_name} {ticket.attendee_last_name} ·{' '}
                  {ticket.ticket_type ?? 'Ticket'}
                </p>
              </div>
              <span
                className={`rounded px-2 py-1 text-xs font-semibold ${
                  ticket.checked_in_at
                    ? 'bg-emerald-900 text-emerald-200'
                    : 'bg-slate-800 text-slate-300'
                }`}
              >
                {ticket.checked_in_at ? 'Checked in' : 'Valid'}
              </span>
            </div>

            <div className="mt-4 flex flex-wrap items-center gap-4 rounded bg-slate-950 p-3">
              <Image
                src={qrCodes.get(ticket.ticket_id) ?? ''}
                alt={`QR code for ticket ${ticket.ticket_code}`}
                width={160}
                height={160}
                unoptimized
                className="rounded bg-white p-2"
              />
              <div>
                <p className="text-xs uppercase tracking-wide text-slate-400">Entry code</p>
                <p className="mt-1 font-mono text-lg font-bold text-slate-100">{ticket.ticket_code}</p>
              </div>
            </div>

            {!ticket.checked_in_at && (
              <details className="mt-4 rounded border border-slate-800 p-3">
                <summary className="cursor-pointer text-sm font-semibold text-slate-200">
                  Transfer this ticket
                </summary>
                <form action={transferTicketAction} className="mt-3 grid gap-3 md:grid-cols-2">
                  <input type="hidden" name="ticketId" value={ticket.ticket_id} />
                  <div>
                    <label htmlFor={`${ticket.ticket_id}-first`} className="mb-1 block text-sm text-slate-400">
                      New attendee first name
                    </label>
                    <input
                      id={`${ticket.ticket_id}-first`}
                      name="attendee-0-first_name"
                      required
                      className="w-full rounded p-2 bg-white font-semibold text-black"
                    />
                  </div>
                  <div>
                    <label htmlFor={`${ticket.ticket_id}-last`} className="mb-1 block text-sm text-slate-400">
                      New attendee last name
                    </label>
                    <input
                      id={`${ticket.ticket_id}-last`}
                      name="attendee-0-last_name"
                      required
                      className="w-full rounded p-2 bg-white font-semibold text-black"
                    />
                  </div>
                  <div>
                    <label htmlFor={`${ticket.ticket_id}-dob`} className="mb-1 block text-sm text-slate-400">
                      Date of birth
                    </label>
                    <input
                      id={`${ticket.ticket_id}-dob`}
                      name="attendee-0-date_of_birth"
                      type="date"
                      required
                      className="w-full rounded p-2 bg-white font-semibold text-black"
                    />
                  </div>
                  <div>
                    <label htmlFor={`${ticket.ticket_id}-place`} className="mb-1 block text-sm text-slate-400">
                      Place of birth
                    </label>
                    <input
                      id={`${ticket.ticket_id}-place`}
                      name="attendee-0-place_of_birth"
                      required
                      className="w-full rounded p-2 bg-white font-semibold text-black"
                    />
                  </div>
                  <div>
                    <label htmlFor={`${ticket.ticket_id}-tax`} className="mb-1 block text-sm text-slate-400">
                      Tax code
                    </label>
                    <input
                      id={`${ticket.ticket_id}-tax`}
                      name="attendee-0-tax_code"
                      required
                      className="w-full rounded p-2 bg-white font-semibold text-black"
                    />
                  </div>
                  <div className="flex items-end">
                    <button
                      type="submit"
                      className="rounded bg-slate-700 px-3 py-2 text-sm font-semibold text-white hover:bg-slate-600"
                    >
                      Transfer ticket
                    </button>
                  </div>
                </form>
              </details>
            )}
          </article>
        ))}
        {tickets.length === 0 && (
          <p className="text-slate-400">
            No tickets yet. <Link className="text-blue-300 underline" href="/events">Browse events</Link>.
          </p>
        )}
      </div>
    </V3Shell>
  )
}
