'use server'

import { supabase } from '@/lib/supabase'

export async function submitPrediction(formData: FormData) {
  const matchId = formData.get('matchId') as string
  const userId = '00000000-0000-0000-0000-000000000000' 
  const homeScore = parseInt(formData.get('homeScore') as string)
  const awayScore = parseInt(formData.get('awayScore') as string)

  // 1. Try to submit the atomic prediction
  const { data: success, error } = await supabase.rpc('submit_prediction', {
    p_user_id: userId,
    p_match_id: matchId,
    p_home_score: homeScore,
    p_away_score: awayScore
  })

  if (error) {
    return { success: false, message: "Database error: " + error.message }
  }

  if (!success) {
    return { success: false, message: "Prediction rejected: Match started or already submitted." }
  }

  // 2. If successful, deduct 1 point
  const { data: profile } = await supabase.from('profiles').select('points').eq('id', userId).single()
  if (profile && profile.points > 0) {
    await supabase.from('profiles').update({ points: profile.points - 1 }).eq('id', userId)
  }

  return { success: true, message: "Prediction submitted! (-1 Point)" }
}

export async function retractPrediction(matchId: string, userId: string) {
  // 1. Delete the prediction
  const { error } = await supabase
    .from('predictions')
    .delete()
    .eq('match_id', matchId)
    .eq('user_id', userId)

  if (error) {
    return { success: false, message: "Failed to retract prediction." }
  }

  // 2. No point refund for now (as requested)
  return { success: true, message: "Prediction retracted. (No refund)" }
}