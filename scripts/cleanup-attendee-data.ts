import { createClient } from '@supabase/supabase-js'

const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!url || !serviceKey) {
  throw new Error(
    'NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set. Run `bunx supabase status -o env` and put them in .env.local.'
  )
}

const olderThan = process.env.ATTENDEE_RETENTION ?? '365 days'
const admin = createClient(url, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false }
})

const { data, error } = await admin.rpc('cleanup_expired_attendee_data', {
  p_older_than: olderThan
})

if (error) {
  throw new Error(`Attendee retention cleanup failed: ${error.message}`)
}

console.log(
  `Cleared attendee identity from ${data ?? 0} ticket(s) older than ${olderThan}.`
)
console.log(
  'This is a local/CI maintenance command. Production scheduling and legal retention review are out of scope.'
)
