'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  createMatch,
  createTournament,
  resolveMarket,
  updateMatch
} from '@/app/actions/organizer'

function Result({ message, error }: { message: string | null; error: boolean }) {
  if (!message) return null
  return (
    <p className={`text-sm font-semibold ${error ? 'text-red-400' : 'text-emerald-400'}`} role="status">
      {message}
    </p>
  )
}

const input =
  'rounded border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white placeholder:text-slate-500'
const button =
  'rounded bg-blue-600 px-3 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:bg-slate-600'

export function CreateTournamentForm() {
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState(false)
  const router = useRouter()

  async function submit(formData: FormData) {
    setBusy(true)
    setError(false)
    setMessage(null)
    const result = await createTournament(formData)
    setMessage(result.message)
    setError(!result.success)
    setBusy(false)
    if (result.success) router.refresh()
  }

  return (
    <form action={submit} className="grid gap-3 rounded border border-slate-800 bg-slate-900 p-4 md:grid-cols-2">
      <label className="flex flex-col gap-1 text-sm text-slate-300">
        Name
        <input className={input} name="name" required placeholder="Summer Cup" />
      </label>
      <label className="flex flex-col gap-1 text-sm text-slate-300">
        Participant capacity
        <input className={input} name="capacity" type="number" min="1" defaultValue="32" required />
      </label>
      <label className="flex flex-col gap-1 text-sm text-slate-300">
        Ticket allocation
        <input className={input} name="ticketAllocation" type="number" min="0" defaultValue="200" required />
      </label>
      <label className="flex flex-col gap-1 text-sm text-slate-300">
        Points per ticket
        <input className={input} name="ticketPoints" type="number" min="0" defaultValue="100" required />
      </label>
      <div className="md:col-span-2">
        <button type="submit" disabled={busy} className={button}>
          {busy ? 'Creating...' : 'Create tournament'}
        </button>
        <Result message={message} error={error} />
      </div>
    </form>
  )
}

export function CreateMatchForm({ tournamentId }: { tournamentId: string }) {
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState(false)
  const router = useRouter()

  async function submit(formData: FormData) {
    setBusy(true)
    setError(false)
    setMessage(null)
    const result = await createMatch(formData)
    setMessage(result.message)
    setError(!result.success)
    setBusy(false)
    if (result.success) router.refresh()
  }

  return (
    <form action={submit} className="grid gap-3 rounded border border-slate-800 bg-slate-900 p-4 md:grid-cols-2">
      <input type="hidden" name="tournamentId" value={tournamentId} />
      <label className="flex flex-col gap-1 text-sm text-slate-300">
        Home team
        <input className={input} name="homeTeam" required placeholder="Home" />
      </label>
      <label className="flex flex-col gap-1 text-sm text-slate-300">
        Away team
        <input className={input} name="awayTeam" required placeholder="Away" />
      </label>
      <label className="flex flex-col gap-1 text-sm text-slate-300 md:col-span-2">
        Kickoff
        <input className={input} name="kickoff" type="datetime-local" required />
      </label>
      <div className="md:col-span-2">
        <button type="submit" disabled={busy} className={button}>
          {busy ? 'Creating...' : 'Create match and market'}
        </button>
        <Result message={message} error={error} />
      </div>
    </form>
  )
}

export function UpdateMatchForm({
  matchId,
  homeScore,
  awayScore,
  status
}: {
  matchId: string
  homeScore: number
  awayScore: number
  status: string
}) {
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState(false)
  const router = useRouter()

  async function submit(formData: FormData) {
    setBusy(true)
    setError(false)
    setMessage(null)
    const result = await updateMatch(formData)
    setMessage(result.message)
    setError(!result.success)
    setBusy(false)
    if (result.success) router.refresh()
  }

  return (
    <form action={submit} className="grid gap-2 md:grid-cols-4">
      <input type="hidden" name="matchId" value={matchId} />
      <label className="flex flex-col gap-1 text-xs text-slate-400">
        Home
        <input className={input} name="homeScore" type="number" min="0" defaultValue={homeScore} />
      </label>
      <label className="flex flex-col gap-1 text-xs text-slate-400">
        Away
        <input className={input} name="awayScore" type="number" min="0" defaultValue={awayScore} />
      </label>
      <label className="flex flex-col gap-1 text-xs text-slate-400">
        Status
        <select className={input} name="status" defaultValue={status}>
          <option value="SCHEDULED">SCHEDULED</option>
          <option value="LIVE">LIVE</option>
          <option value="FINISHED">FINISHED</option>
        </select>
      </label>
      <div className="flex flex-col justify-end gap-1">
        <button type="submit" disabled={busy} className={button}>
          {busy ? 'Saving...' : 'Save match'}
        </button>
        <Result message={message} error={error} />
      </div>
    </form>
  )
}

export function ResolveMarketForm({ marketId }: { marketId: string }) {
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState(false)
  const router = useRouter()

  async function submit(formData: FormData) {
    setBusy(true)
    setError(false)
    setMessage(null)
    const result = await resolveMarket(formData)
    setMessage(result.message)
    setError(!result.success)
    setBusy(false)
    if (result.success) router.refresh()
  }

  return (
    <form action={submit} className="flex flex-wrap items-end gap-2">
      <input type="hidden" name="marketId" value={marketId} />
      <label className="flex flex-col gap-1 text-xs text-slate-400">
        Winner
        <select className={input} name="winner" defaultValue="HOME">
          <option value="HOME">HOME</option>
          <option value="DRAW">DRAW</option>
          <option value="AWAY">AWAY</option>
        </select>
      </label>
      <button type="submit" disabled={busy} className={button}>
        {busy ? 'Resolving...' : 'Resolve market'}
      </button>
      <Result message={message} error={error} />
    </form>
  )
}
