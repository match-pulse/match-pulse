'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { claimTicket, redeemReward } from '@/app/actions/tickets'

function Message({ message, error }: { message: string | null; error: boolean }) {
  if (!message) return null
  return (
    <p className={`text-sm font-semibold ${error ? 'text-red-400' : 'text-emerald-400'}`} role="status">
      {message}
    </p>
  )
}

export function TicketClaimForm({ tournamentId }: { tournamentId: string }) {
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState(false)
  const router = useRouter()

  async function submit(formData: FormData) {
    setBusy(true)
    setError(false)
    setMessage(null)
    const result = await claimTicket(formData)
    setMessage(result.message)
    setError(!result.success)
    setBusy(false)
    if (result.success) router.refresh()
  }

  return (
    <form action={submit} className="flex flex-col gap-2">
      <input type="hidden" name="tournamentId" value={tournamentId} />
      <button
        type="submit"
        disabled={busy}
        className="rounded bg-blue-600 px-3 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:bg-slate-600"
      >
        {busy ? 'Claiming...' : 'Claim ticket'}
      </button>
      <Message message={message} error={error} />
    </form>
  )
}

export function RewardRedeemForm({ rewardId, cost }: { rewardId: string; cost: number }) {
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState(false)
  const router = useRouter()

  async function submit(formData: FormData) {
    setBusy(true)
    setError(false)
    setMessage(null)
    const result = await redeemReward(formData)
    setMessage(result.message)
    setError(!result.success)
    setBusy(false)
    if (result.success) router.refresh()
  }

  return (
    <form action={submit} className="flex flex-col gap-2">
      <input type="hidden" name="rewardId" value={rewardId} />
      <button
        type="submit"
        disabled={busy}
        className="rounded bg-emerald-700 px-3 py-2 text-sm font-semibold text-white hover:bg-emerald-800 disabled:bg-slate-600"
      >
        {busy ? 'Redeeming...' : `Redeem for ${cost} pts`}
      </button>
      <Message message={message} error={error} />
    </form>
  )
}
