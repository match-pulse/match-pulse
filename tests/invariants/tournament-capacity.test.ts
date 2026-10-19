import { createClient } from '@supabase/supabase-js'
import { randomUUID } from 'crypto'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

async function runTest() {
  console.log("⏳ Running Invariant Test: Tournament Capacity Burst")
  
  // 1. Create a tournament with a strict capacity of 32
  const tournamentId = randomUUID()
  const { error: insertError } = await supabase.from('tournaments').insert({
    id: tournamentId, 
    name: 'Summer Cup 2026', 
    max_capacity: 32,
    current_players: 0
  })

  if (insertError) {
    console.error("❌ Failed to insert dummy tournament.", insertError)
    return
  }

  console.log("1. Simulating 100 concurrent registration requests for 32 slots...")
  
  // 2. Fire 100 concurrent requests
  const requests = Array.from({ length: 100 }).map(async () => {
    try {
      const { data, error } = await supabase.rpc('register_for_tournament', {
        p_tournament_id: tournamentId,
        p_user_id: randomUUID() // Each request is a new user
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
  if (successful === 32 && rejected === 68 && networkErrors === 0) {
    console.log("✅ PASS: The atomic capacity lock successfully prevented overbooking.")
  } else {
    console.log("❌ FAIL: The capacity limit failed under a burst.")
    console.log(results)
  }
}

runTest()