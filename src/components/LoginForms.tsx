'use client'

import { useState } from 'react'
import { signInAnonymously, signInOrganizer } from '@/app/actions/auth'

export default function LoginForms() {
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState<string | null>(null)

  async function handleFan() {
    setBusy(true)
    setMessage(null)
    const result = await signInAnonymously()
    if (result) setMessage(result.message)
    setBusy(false)
  }

  async function handleOrganizer(formData: FormData) {
    setBusy(true)
    setMessage(null)
    const result = await signInOrganizer(formData)
    if (result) setMessage(result.message)
    setBusy(false)
  }

  return (
    <div className="w-full max-w-md flex flex-col gap-6">
      <button
        type="button"
        onClick={handleFan}
        disabled={busy}
        className="bg-blue-600 hover:bg-blue-700 py-3 rounded font-bold text-white transition-colors disabled:bg-slate-600 disabled:cursor-not-allowed"
      >
        Continue as fan
      </button>

      <div className="flex items-center gap-3 text-slate-500 text-sm">
        <span className="h-px flex-1 bg-slate-700" />
        or
        <span className="h-px flex-1 bg-slate-700" />
      </div>

      <form action={handleOrganizer} className="flex flex-col gap-3">
        <label className="text-sm text-slate-400" htmlFor="email">
          Organizer email
        </label>
        <input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          required
          className="p-2 rounded text-black font-semibold"
        />
        <label className="text-sm text-slate-400" htmlFor="password">
          Password
        </label>
        <input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
          className="p-2 rounded text-black font-semibold"
        />
        <button
          type="submit"
          disabled={busy}
          className="bg-slate-700 hover:bg-slate-600 py-2 rounded font-semibold text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Sign in as organizer
        </button>
      </form>

      {message && (
        <p className="text-center text-sm font-semibold text-red-400">{message}</p>
      )}

      <p className="text-xs text-slate-500 text-center leading-relaxed">
        Fans get a real session with 200 starting points. Organizers use the
        local account created by <code className="text-slate-400">bun run auth:organizer</code>.
      </p>
    </div>
  )
}
