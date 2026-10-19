// Define the shape of our prediction object
type Prediction = {
  id: string
  user_id: string
  match_id: string
  predicted_home_score: number
  predicted_away_score: number
  created_at: string
}

export default function PredictionsList({ predictions }: { predictions: Prediction[] }) {
  if (!predictions || predictions.length === 0) {
    return (
      <div className="text-slate-500 text-center py-8 italic">
        No predictions made yet.
      </div>
    )
  }

  return (
    <div className="overflow-hidden rounded-lg border border-slate-700">
      <table className="min-w-full text-sm text-left text-slate-300">
        <thead className="bg-slate-900 text-xs uppercase text-slate-400">
          <tr>
            <th className="px-4 py-3">Match ID</th>
            <th className="px-4 py-3">Score</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-700 bg-slate-800">
          {predictions.map((pred) => (
            <tr key={pred.id} className="hover:bg-slate-750 transition-colors">
              <td className="px-4 py-3 font-mono text-xs text-slate-500">
                {pred.match_id.slice(0, 8)}...
              </td>
              <td className="px-4 py-3 font-bold text-blue-400">
                {pred.predicted_home_score} - {pred.predicted_away_score}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}