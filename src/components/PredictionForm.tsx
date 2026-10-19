'use client'

import { useState } from 'react'
import { submitPrediction, retractPrediction } from '@/app/actions/predict'
import { useRouter } from 'next/navigation'

type Prediction = {
  predicted_home_score: number
  predicted_away_score: number
} | null

export default function PredictionForm({ 
  matchId, 
  userId,
  existingPrediction 
}: { 
  matchId: string, 
  userId: string,
  existingPrediction: Prediction 
}) {
  const [message, setMessage] = useState<string | null>(null)
  const [isError, setIsError] = useState(false)
  const router = useRouter()

  async function handleSubmit(formData: FormData) {
    setMessage("Submitting...")
    setIsError(false)
    const result = await submitPrediction(formData)
    setMessage(result.message)
    setIsError(!result.success)
    router.refresh() // Refresh the page data to update points/prediction
  }

  async function handleRetract() {
    setMessage("Retracting...")
    setIsError(false)
    const result = await retractPrediction(matchId, userId)
    setMessage(result.message)
    if (!result.success) setIsError(true)
    router.refresh()
  }

  return (
    <div className="p-6 bg-slate-800 rounded-lg max-w-sm mx-auto text-white shadow-xl border border-slate-700 w-full">
      
      {existingPrediction ? (
        <div className="mb-6 p-4 bg-slate-900 rounded border border-slate-600 text-center">
          <p className="text-sm text-slate-400 mb-1">Your Locked Prediction:</p>
          <p className="text-3xl font-bold text-blue-400">
            {existingPrediction.predicted_home_score} - {existingPrediction.predicted_away_score}
          </p>
        </div>
      ) : (
        <h2 className="text-xl font-bold mb-4 text-center">Predict the Score</h2>
      )}
      
      <form action={handleSubmit} className="flex flex-col gap-4">
        <input type="hidden" name="matchId" value={matchId} />
        
        <div className="flex gap-4 items-center justify-center">
          <input 
            type="number" 
            name="homeScore" 
            defaultValue={existingPrediction?.predicted_home_score ?? 0} 
            min="0" 
            className="w-16 p-2 text-center text-black rounded font-bold" 
          />
          <span className="font-bold text-xl">-</span>
          <input 
            type="number" 
            name="awayScore" 
            defaultValue={existingPrediction?.predicted_away_score ?? 0} 
            min="0" 
            className="w-16 p-2 text-center text-black rounded font-bold" 
          />
        </div>

        <button type="submit" className="bg-blue-600 hover:bg-blue-700 py-2 rounded font-bold transition-colors">
          {existingPrediction ? 'Change Prediction' : 'Submit Prediction'}
        </button>
      </form>

      {existingPrediction && (
        <button 
          onClick={handleRetract}
          className="mt-3 w-full bg-red-600/20 text-red-400 border border-red-900 hover:bg-red-600/40 py-2 rounded font-bold transition-colors"
        >
          Retract Prediction (Lose 1 Point)
        </button>
      )}

      {message && (
        <p className={`mt-4 text-center font-semibold text-sm ${isError ? 'text-red-400' : 'text-green-400'}`}>
          {message}
        </p>
      )}
    </div>
  )
}