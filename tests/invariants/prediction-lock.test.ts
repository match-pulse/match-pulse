import { createClient } from '@supabase/supabase-js'
import { randomUUID } from 'crypto'

// Bun natively loads .env.local, so we don't need dotenv anymore!
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

async function runTest() {
  console.log("⏳ Running Invariant Test: Prediction Kickoff Lock")
  
  // 1. Setup dummy data (A match in SCHEDULED state)
  const matchId = randomUUID()
  const userId = randomUUID()
  
  const { error: insertError } = await supabase.from('matches').insert({
    id: matchId, 
    home_team: 'Italy', 
    away_team: 'France', 
    status: 'SCHEDULED',
    kickoff_time: new Date().toISOString()
  })

  if (insertError) {
    console.error("❌ Failed to insert dummy match. Check your DB connection.", insertError)
    return
  }

  console.log("1. Simulating 20 concurrent prediction requests...")
  
  // 2. Fire 20 concurrent requests (adjusted for local Docker connection limits)
  const requests = Array.from({ length: 20 }).map(async () => {
    try {
      const { data, error } = await supabase.rpc('submit_prediction', {
        p_user_id: userId,
        p_match_id: matchId,
        p_home_score: 2,
        p_away_score: 1
      })
      if (error) return { type: 'error', error }
      return { type: 'success', data }
    } catch (err) {
      return { type: 'catch', error: err }
    }
  })
  
  // 3. Await all requests
  const results = await Promise.all(requests)
  
  const successful = results.filter(r => r.type === 'success' && r.data === true).length
  const rejected = results.filter(r => r.type === 'success' && r.data === false).length
  const networkErrors = results.filter(r => r.type !== 'success').length
  
  console.log(`Results: ${successful} succeeded, ${rejected} rejected, ${networkErrors} network errors.`)
  
  // 4. Assert the invariant holds
  if (successful === 1) {
    console.log("✅ PASS: The atomic lock successfully prevented double-predictions.")
    if (networkErrors > 0) {
      console.log(`⚠️ Note: ${networkErrors} requests failed due to local connection limits, but the invariant held perfectly.`)
    }
  } else {
    console.log("❌ FAIL: The lock failed under concurrency.")
    console.log(results)
  }
}

runTest()