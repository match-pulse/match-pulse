import { createClient } from '@supabase/supabase-js'

const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!url || !serviceKey) {
  throw new Error(
    'NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set. Run `bunx supabase status -o env` and put them in .env.local.'
  )
}

const retentionDays = Number(process.env.TRADE_REQUEST_RETENTION_DAYS ?? '30')
if (!Number.isInteger(retentionDays) || retentionDays < 1) {
  throw new Error('TRADE_REQUEST_RETENTION_DAYS must be a positive integer.')
}

const admin = createClient(url, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false }
})

const { data, error } = await admin.rpc('cleanup_completed_trade_requests', {
  p_retention: `${retentionDays} days`
})

if (error) {
  throw new Error(`Cleanup failed: ${error.message}`)
}

console.log(JSON.stringify({ event: 'trade_requests.cleanup', retentionDays, deleted: data }))
