'use client'

import { useState } from 'react'
import { signInClub, signInFan, signInOrganizer, signUpFan } from '@/app/actions/auth'

type Mode = 'FAN' | 'ORGANIZER' | 'CLUB'
type AuthAction = (formData: FormData) => Promise<{ success: false; message: string }>

export default function LoginForms({ next }: { next?: string }) {
  const [mode, setMode] = useState<Mode>('FAN')
  const [fanSignup, setFanSignup] = useState(false)
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState<string | null>(null)

  async function handlePassword(formData: FormData, action: AuthAction) {
    setBusy(true)
    setMessage(null)
    const result = await action(formData)
    if (result) setMessage(result.message)
    setBusy(false)
  }

  function selectMode(nextMode: Mode) {
    setMode(nextMode)
    setMessage(null)
    if (nextMode !== 'FAN') setFanSignup(false)
  }

  return (
    <div className="w-full max-w-md">
      <div role="group" aria-label="Sign-in role" className="mb-5 grid grid-cols-3 gap-2 rounded bg-slate-800 p-1 text-sm">
        {(['FAN', 'ORGANIZER', 'CLUB'] as const).map((option) => (
          <button
            key={option}
            type="button"
            aria-pressed={mode === option}
            onClick={() => selectMode(option)}
            className={`rounded px-2 py-2 font-semibold ${
              mode === option ? 'bg-blue-600 text-white' : 'text-slate-300 hover:bg-slate-700'
            }`}
          >
            {option === 'FAN' ? 'Fan' : option === 'ORGANIZER' ? 'Organizer' : 'Club'}
          </button>
        ))}
      </div>

      {mode === 'FAN' && (
        <form
          action={(formData) =>
            handlePassword(formData, fanSignup ? signUpFan : signInFan)
          }
          className="flex flex-col gap-3"
        >
          {next && <input type="hidden" name="next" value={next} />}
          <p className="text-sm text-slate-400">
            {fanSignup
              ? 'Create a fan account with email and password. You receive 200 starting points.'
              : 'Sign in with your fan email and password to buy tickets and predict across clubs.'}
          </p>
          <label className="text-sm text-slate-400" htmlFor="fan-email">
            Fan email
          </label>
          <input
            id="fan-email"
            name="email"
            type="email"
            autoComplete="email"
            required
            className="rounded p-2 font-semibold text-black"
          />
          {fanSignup && (
            <>
              <label className="text-sm text-slate-400" htmlFor="fan-username">
                Username
              </label>
              <input
                id="fan-username"
                name="username"
                type="text"
                autoComplete="nickname"
                required
                className="rounded p-2 font-semibold text-black"
              />
            </>
          )}
          <label className="text-sm text-slate-400" htmlFor="fan-password">
            Password
          </label>
          <input
            id="fan-password"
            name="password"
            type="password"
            autoComplete={fanSignup ? 'new-password' : 'current-password'}
            minLength={6}
            required
            className="rounded p-2 font-semibold text-black"
          />
          {fanSignup && (
            <>
              <label className="text-sm text-slate-400" htmlFor="fan-confirm-password">
                Confirm password
              </label>
              <input
                id="fan-confirm-password"
                name="confirmPassword"
                type="password"
                autoComplete="new-password"
                minLength={6}
                required
                className="rounded p-2 font-semibold text-black"
              />
            </>
          )}
          <button
            type="submit"
            disabled={busy}
            className="rounded bg-blue-600 py-3 font-bold text-white hover:bg-blue-700 disabled:bg-slate-600"
          >
            {fanSignup ? 'Create fan account' : 'Sign in as fan'}
          </button>
          <button
            type="button"
            onClick={() => {
              setFanSignup((value) => !value)
              setMessage(null)
            }}
            className="text-sm text-slate-300 underline hover:text-white"
          >
            {fanSignup ? 'Already have an account? Sign in' : 'New fan? Create an account'}
          </button>
        </form>
      )}

      {mode !== 'FAN' && (
        <form
          action={(formData) =>
            handlePassword(
              formData,
              mode === 'ORGANIZER' ? signInOrganizer : signInClub
            )
          }
          className="flex flex-col gap-3"
        >
          {next && <input type="hidden" name="next" value={next} />}
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
