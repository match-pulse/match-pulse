'use client'

import { useState } from 'react'
import { signInAnonymously, signInClub, signInOrganizer } from '@/app/actions/auth'

type Mode = 'FAN' | 'ORGANIZER' | 'CLUB'

export default function LoginForms() {
  const [mode, setMode] = useState<Mode>('FAN')
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState<string | null>(null)

  async function handleFan() {
    setBusy(true)
    setMessage(null)
    const result = await signInAnonymously()
    if (result) setMessage(result.message)
    setBusy(false)
  }

  async function handlePassword(formData: FormData, action: typeof signInOrganizer) {
    setBusy(true)
    setMessage(null)
    const result = await action(formData)
    if (result) setMessage(result.message)
    setBusy(false)
  }

  return (
    <div className="w-full max-w-md">
      <div role="group" aria-label="Sign-in role" className="mb-5 grid grid-cols-3 gap-2 rounded bg-slate-800 p-1 text-sm">
        {(['FAN', 'ORGANIZER', 'CLUB'] as const).map((option) => (
          <button
            key={option}
            type="button"
            aria-pressed={mode === option}
            onClick={() => {
              setMode(option)
              setMessage(null)
            }}
            className={`rounded px-2 py-2 font-semibold ${
              mode === option ? 'bg-blue-600 text-white' : 'text-slate-300 hover:bg-slate-700'
            }`}
          >
            {option === 'FAN' ? 'Fan' : option === 'ORGANIZER' ? 'Organizer' : 'Club'}
          </button>
        ))}
      </div>

      {mode === 'FAN' && (
        <div className="flex flex-col gap-4">
          <p className="text-sm text-slate-400">
            Start an anonymous fan session. You receive 200 starting points.
          </p>
          <button
            type="button"
            onClick={handleFan}
            disabled={busy}
            className="rounded bg-blue-600 py-3 font-bold text-white hover:bg-blue-700 disabled:bg-slate-600"
          >
            Continue as fan
          </button>
        </div>
      )}

      {mode !== 'FAN' && (
        <form
          action={(formData) => handlePassword(formData, mode === 'ORGANIZER' ? signInOrganizer : signInClub)}
          className="flex flex-col gap-3"
        >
          <label className="text-sm text-slate-400" htmlFor={`${mode}-email`}>
            {mode === 'ORGANIZER' ? 'Organizer email' : 'Club email'}
          </label>
          <input
            id={`${mode}-email`}
            name="email"
            type="email"
            autoComplete="email"
            required
            className="rounded p-2 font-semibold text-black"
          />
          <label className="text-sm text-slate-400" htmlFor={`${mode}-password`}>
            Password
          </label>
          <input
            id={`${mode}-password`}
            name="password"
            type="password"
            autoComplete="current-password"
            required
            className="rounded p-2 font-semibold text-black"
          />
          <button
            type="submit"
            disabled={busy}
            className="rounded bg-slate-700 py-2 font-semibold text-white hover:bg-slate-600 disabled:opacity-50"
          >
            Sign in as {mode === 'ORGANIZER' ? 'organizer' : 'club'}
          </button>
        </form>
      )}

      {message && <p className="mt-4 text-center text-sm font-semibold text-red-400">{message}</p>}
    </div>
  )
}
