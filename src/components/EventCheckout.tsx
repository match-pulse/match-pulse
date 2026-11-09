'use client'

import { useState } from 'react'
import { purchaseTicketAction } from '@/app/actions/v3'
import type { PublicTicketType } from '@/lib/domain/types'

export default function EventCheckout({
  eventId,
  ticketTypes
}: {
  eventId: string
  ticketTypes: PublicTicketType[]
}) {
  const [ticketTypeId, setTicketTypeId] = useState(ticketTypes[0]?.id ?? '')
  const [quantity, setQuantity] = useState(1)
  const [requestId] = useState(() => crypto.randomUUID())

  const selected = ticketTypes.find((type) => type.id === ticketTypeId) ?? ticketTypes[0]
  const maxQuantity = Math.max(1, Math.min(selected?.max_per_buyer ?? 1, 4))
  const total = (selected?.price_cents ?? 0) * quantity

  if (ticketTypes.length === 0) {
    return (
      <p className="rounded border border-slate-800 bg-slate-900 p-4 text-slate-400">
        Ticket sales are not open yet.
      </p>
    )
  }

  return (
    <form action={purchaseTicketAction} className="flex flex-col gap-5">
      <input type="hidden" name="eventId" value={eventId} />
      <input type="hidden" name="requestId" value={requestId} />

      <div className="grid gap-4 md:grid-cols-2">
        <div>
          <label htmlFor="ticketTypeId" className="mb-1 block text-sm text-slate-400">
            Ticket type
          </label>
          <select
            id="ticketTypeId"
            name="ticketTypeId"
            value={ticketTypeId}
            onChange={(event) => {
              setTicketTypeId(event.target.value)
              setQuantity(1)
            }}
            className="w-full rounded p-2 bg-white font-semibold text-black"
          >
            {ticketTypes.map((type) => (
              <option key={type.id} value={type.id}>
                {type.name} · €{(type.price_cents / 100).toFixed(2)} ·{' '}
                {type.allocation - type.sold_count} left
              </option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="quantity" className="mb-1 block text-sm text-slate-400">
            Tickets
          </label>
          <select
            id="quantity"
            name="quantity"
            value={quantity}
            onChange={(event) => setQuantity(Number(event.target.value))}
            className="w-full rounded p-2 bg-white font-semibold text-black"
          >
            {Array.from({ length: maxQuantity }, (_, index) => index + 1).map((value) => (
              <option key={value} value={value}>
                {value}
              </option>
            ))}
          </select>
        </div>
      </div>

      <p className="text-sm text-slate-400">
        Simulated payment. No money is charged. Each ticket is nominative.
      </p>

      {Array.from({ length: quantity }, (_, index) => (
        <fieldset key={index} className="rounded border border-slate-800 bg-slate-900 p-4">
          <legend className="px-1 text-sm font-semibold text-slate-200">
            Attendee {index + 1}
          </legend>
          <div className="grid gap-3 md:grid-cols-2">
            <div>
              <label htmlFor={`attendee-${index}-first_name`} className="mb-1 block text-sm text-slate-400">
                First name
              </label>
              <input
                id={`attendee-${index}-first_name`}
                name={`attendee-${index}-first_name`}
                required
                className="w-full rounded p-2 bg-white font-semibold text-black"
              />
            </div>
            <div>
              <label htmlFor={`attendee-${index}-last_name`} className="mb-1 block text-sm text-slate-400">
                Last name
              </label>
              <input
                id={`attendee-${index}-last_name`}
                name={`attendee-${index}-last_name`}
                required
                className="w-full rounded p-2 bg-white font-semibold text-black"
              />
            </div>
            <div>
              <label htmlFor={`attendee-${index}-date_of_birth`} className="mb-1 block text-sm text-slate-400">
                Date of birth
              </label>
              <input
                id={`attendee-${index}-date_of_birth`}
                name={`attendee-${index}-date_of_birth`}
                type="date"
                required
                className="w-full rounded p-2 bg-white font-semibold text-black"
              />
            </div>
            <div>
              <label htmlFor={`attendee-${index}-place_of_birth`} className="mb-1 block text-sm text-slate-400">
                Place of birth
              </label>
              <input
                id={`attendee-${index}-place_of_birth`}
                name={`attendee-${index}-place_of_birth`}
                required
                className="w-full rounded p-2 bg-white font-semibold text-black"
              />
            </div>
            <div>
              <label htmlFor={`attendee-${index}-tax_code`} className="mb-1 block text-sm text-slate-400">
                Tax code
              </label>
              <input
                id={`attendee-${index}-tax_code`}
                name={`attendee-${index}-tax_code`}
                required
                className="w-full rounded p-2 bg-white font-semibold text-black"
              />
            </div>
            <div>
              <label htmlFor={`attendee-${index}-fan_card_number`} className="mb-1 block text-sm text-slate-400">
                Fan card {selected?.requires_fan_card ? '(required)' : '(optional)'}
              </label>
              <input
                id={`attendee-${index}-fan_card_number`}
                name={`attendee-${index}-fan_card_number`}
                required={selected?.requires_fan_card}
                className="w-full rounded p-2 bg-white font-semibold text-black"
              />
            </div>
          </div>
        </fieldset>
      ))}

      <label className="flex items-start gap-2 text-sm text-slate-300">
        <input type="checkbox" name="acceptTerms" required className="mt-1" />
        <span>
          I accept the club ticket terms and privacy notice. I understand the payment is
          simulated and the ticket is nominative.
        </span>
      </label>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-lg font-bold text-blue-300">
          Total: €{(total / 100).toFixed(2)} (simulated)
        </p>
        <button
          type="submit"
          className="rounded bg-emerald-700 px-4 py-2 font-semibold text-white hover:bg-emerald-800"
        >
          Buy tickets
        </button>
      </div>
    </form>
  )
}
