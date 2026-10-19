'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { enterPosition, exitPosition } from '@/app/actions/market'
import type { Outcome } from '@/app/actions/market'

type Position = {
  outcome: Outcome
  shares: string
  costBasis: number
  exitValue: number
}

const LABELS: Record<Outcome, string> = {
  HOME: 'Home win',
  DRAW: 'Draw',
  AWAY: 'Away win'
}

export default function MarketTrader({
  marketId,
  open,
  resolvedWinner,
  points,
  prices,
  positions
}: {
  marketId: string
  open: boolean
  resolvedWinner: Outcome | null
  points: number
  prices: Record<Outcome, number>
  positions: Position[]
}) {
  const [outcome, setOutcome] = useState<Outcome>('HOME')
  const [message, setMessage] = useState<string | null>(null)
  const [isError, setIsError] = useState(false)
  const [busy, setBusy] = useState(false)
  const router = useRouter()

  async function handleEnter(formData: FormData) {
    setBusy(true)
    setMessage('Sending order...')
    setIsError(false)
    const result = await enterPosition(formData)
    setMessage(result.message)
    setIsError(!result.success)
    setBusy(false)
    router.refresh()
  }

  async function handleExit(position: Position) {
    setBusy(true)
    setMessage('Closing position...')
    setIsError(false)

    const formData = new FormData()
    formData.set('marketId', marketId)
    formData.set('outcome', position.outcome)
    formData.set('shares', position.shares)

    const result = await exitPosition(formData)
    setMessage(result.message)
    setIsError(!result.success)
    setBusy(false)
    router.refresh()
  }

  return (
    <div className="w-full bg-slate-800 p-6 rounded-lg shadow-xl border border-slate-700 text-white">
      {resolvedWinner ? (
        <p className="text-center font-semibold text-blue-400">
          Market resolved: {LABELS[resolvedWinner]}. Winning shares paid one point each.
        </p>
      ) : !open ? (
        <p className="text-center font-semibold text-slate-300">
          The market opens at kickoff. Positions can only be entered while the match is live.
        </p>
      ) : (
        <form action={handleEnter} className="flex flex-col gap-4">
          <input type="hidden" name="marketId" value={marketId} />
          <input type="hidden" name="outcome" value={outcome} />

          <div className="grid grid-cols-3 gap-3">
            {(Object.keys(LABELS) as Outcome[]).map((option) => (
              <button
                key={option}
                type="button"
                onClick={() => setOutcome(option)}
                className={`rounded border p-3 text-center transition-colors ${
                  outcome === option
                    ? 'border-blue-500 bg-blue-600/20'
                    : 'border-slate-600 bg-slate-900 hover:border-slate-400'
                }`}
              >
                <span className="block text-sm text-slate-400">{LABELS[option]}</span>
                <span className="block text-xl font-bold text-blue-400">
                  {(prices[option] * 100).toFixed(1)}%
                </span>
              </button>
            ))}
          </div>

          <label className="text-sm text-slate-400" htmlFor="budget">
            Points to spend (you hold {points})
          </label>
          <input
            id="budget"
            name="budget"
            type="number"
            min="1"
            step="1"
            defaultValue={10}
            className="p-2 rounded text-black font-semibold"
          />

          <button
            type="submit"
            disabled={busy}
            className="bg-blue-600 hover:bg-blue-700 py-2 rounded font-bold transition-colors disabled:bg-slate-600 disabled:cursor-not-allowed"
          >
            {busy ? 'Working...' : `Buy ${LABELS[outcome]} shares`}
          </button>

          <p className="text-xs text-slate-500 text-center">
            Price and debit are computed on the curve by the database. Your balance is the
            hard limit; overspending is refused there, not here.
          </p>
        </form>
      )}

      {positions.length > 0 && (
        <div className="mt-6 border-t border-slate-700 pt-4">
          <h3 className="font-bold mb-3">Your positions</h3>
          <ul className="flex flex-col gap-3">
            {positions.map((position) => {
              const pnl = position.exitValue - position.costBasis
              return (
                <li
                  key={position.outcome}
                  className="flex items-center justify-between gap-3 bg-slate-900 rounded border border-slate-700 p-3"
                >
                  <div>
                    <p className="font-semibold">{LABELS[position.outcome]}</p>
                    <p className="text-xs text-slate-400">
                      {Number(position.shares).toFixed(2)} shares · cost {position.costBasis}
                    </p>
                    <p className={`text-xs font-semibold ${pnl >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                      {resolvedWinner ? 'Payout' : 'Exit value'} {position.exitValue} · PnL{' '}
                      {pnl >= 0 ? '+' : ''}
                      {pnl}
                    </p>
                  </div>
                  {open && (
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => handleExit(position)}
                      className="bg-slate-700 hover:bg-slate-600 px-3 py-1.5 rounded text-sm font-semibold transition-colors disabled:opacity-50"
                    >
                      Exit all
                    </button>
                  )}
                </li>
              )
            })}
          </ul>
        </div>
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
