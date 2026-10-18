import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
import { randomUUID } from 'crypto'

// Load environment variables from .env.local
dotenv.config({ path: '.env.local' })

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

  console.log("1. Simulating 50 concurrent prediction requests...")
  
  // 2. Fire 50 concurrent requests to the atomic RPC
  const requests = Array.from({ length: 50 }).map(() => 
    supabase.rpc('submit_prediction', {
      p_user_id: userId, // Same user double-clicking 50 times
      p_match_id: matchId,
      p_home_score: 2,
      p_away_score: 1
    })
  )
  
  // 3. Await all requests
  const results = await Promise.all(requests)
  
  const successful = results.filter(r => r.data === true).length
  const rejected = results.filter(r => r.data === false).length
  
  console.log(`Results: ${successful} succeeded, ${rejected} rejected.`)
  
  // 4. Assert the invariant holds
  if (successful === 1 && rejected === 49) {
    console.log("✅ PASS: The atomic lock successfully prevented double-predictions.")
  } else {
    console.log("❌ FAIL: The lock failed under concurrency.")
    console.log(results.map(r => r.data))
  }
}

runTest()