'use client'

import { useState } from 'react'
import { useFormStatus } from 'react-dom'
import { redeemRewardAction } from '@/app/actions/analytics'

function SubmitButton({ cost }: { cost: number }) {
  const { pending } = useFormStatus()

  return (
    <button
      type="submit"
      disabled={pending}
      className="rounded bg-emerald-700 px-3 py-2 text-sm font-semibold text-white hover:bg-emerald-800 disabled:bg-slate-600"
    >
      {pending ? 'Redeeming...' : `Redeem for ${cost} pts`}
    </button>
  )
}

export default function RewardRedeemForm({
  rewardId,
  cost
}: {
  rewardId: string
  cost: number
}) {
  const [requestId] = useState(() => crypto.randomUUID())

  return (
    <form action={redeemRewardAction} className="mt-4">
      <input type="hidden" name="rewardId" value={rewardId} />
      <input type="hidden" name="requestId" value={requestId} />
      <SubmitButton cost={cost} />
    </form>
  )
}
