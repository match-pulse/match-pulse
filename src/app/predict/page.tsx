import { Suspense } from 'react'
import PredictionForm from '@/components/PredictionForm'
import PredictionsList from '@/components/PredictionsList'
import TopBar from '@/components/TopBar'
import { supabase } from '@/lib/supabase'

async function PredictionContent({ matchId, userId }: { matchId: string, userId: string }) {
  const { data: match } = await supabase.from('matches').select('*').eq('id', matchId).single()
  const { data: profile } = await supabase.from('profiles').select('*').eq('id', userId).single()
  
  // Fetch the specific prediction for this match
  const { data: existingPrediction } = await supabase
    .from('predictions')
    .select('*')
    .eq('match_id', matchId)
    .eq('user_id', userId)
    .maybeSingle() 

  // Fetch ALL predictions for the left table
  const { data: allPredictions } = await supabase
    .from('predictions')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })

  return (
    <>
      <TopBar username={profile?.username || 'Guest'} points={profile?.points || 0} />
      
      {/* Split Screen Layout */}
      <div className="flex-1 flex flex-col md:flex-row max-w-6xl mx-auto w-full p-8 gap-8">
        
        {/* Left Column: Predictions Table */}
        <div className="w-full md:w-1/3 bg-slate-800 p-6 rounded-lg shadow-xl border border-slate-700 h-fit">
          <h2 className="text-xl font-bold text-white mb-4">Your Picks</h2>
          <PredictionsList predictions={allPredictions || []} />
        </div>

        {/* Right Column: Prediction Form */}
        <div className="w-full md:w-2/3 flex flex-col items-center justify-start pt-8">
          <h1 className="text-4xl text-white font-extrabold mb-2 tracking-tight">
            Match<span className="text-blue-500">Pulse</span>
          </h1>
          
          {match && (
            <p className="text-center text-slate-400 mb-8 font-medium text-lg">
              {match.home_team} vs {match.away_team}
            </p>
          )}

          <PredictionForm 
            matchId={matchId} 
            userId={userId}
            existingPrediction={existingPrediction} 
          />
        </div>
      </div>
    </>
  )
}

export default function PredictPage() {
  const testMatchId = "11111111-1111-1111-1111-111111111111"
  const dummyUserId = '00000000-0000-0000-0000-000000000000'

  return (
    <main className="min-h-screen bg-slate-900 flex flex-col">
      <Suspense fallback={<p className="text-center text-white mt-10">Loading game data...</p>}>
        <PredictionContent matchId={testMatchId} userId={dummyUserId} />
      </Suspense>
    </main>
  )
}