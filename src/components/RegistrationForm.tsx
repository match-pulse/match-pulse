'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { registerForTournament } from '@/app/actions/register'

export default function RegistrationForm({
  tournamentId,
  isRegistered,
  isFull
}: {
  tournamentId: string
  isRegistered: boolean
  isFull: boolean
}) {
  const [message, setMessage] = useState<string | null>(null)
  const [isError, setIsError] = useState(false)
  const router = useRouter()

  async function handleSubmit(formData: FormData) {
    setMessage('Registering...')
    setIsError(false)
    const result = await registerForTournament(formData)
    setMessage(result.message)
    setIsError(!result.success)
    router.refresh()
  }

  return (
    <div className="p-6 bg-slate-800 rounded-lg max-w-sm mx-auto text-white shadow-xl border border-slate-700 w-full">
      <h2 className="text-xl font-bold mb-4 text-center">Take a place</h2>

      {isRegistered ? (
        <p className="text-center text-green-400 font-semibold py-4">
          Your place is confirmed.
        </p>
      ) : (
        <>
          <p className="text-sm text-slate-400 text-center mb-4">
            Registration is confirmed by the database, so the number of places
            shown is the number actually held.
          </p>

          <form action={handleSubmit} className="flex flex-col gap-4">
            <input type="hidden" name="tournamentId" value={tournamentId} />

            <button
              type="submit"
              disabled={isFull}
              className="bg-blue-600 hover:bg-blue-700 py-2 rounded font-bold transition-colors disabled:bg-slate-600 disabled:cursor-not-allowed disabled:text-slate-400"
            >
              {isFull ? 'Tournament full' : 'Register'}
            </button>
          </form>
        </>
      )}

      {message && (
        <p
          className={`mt-4 text-center font-semibold text-sm ${isError ? 'text-red-400' : 'text-green-400'}`}
        >
          {message}
        </p>
      )}
    </div>
  )
}