import { createClient } from '@supabase/supabase-js'

const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!url || !serviceKey) {
  throw new Error(
    'NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set. Run `bunx supabase status -o env` and put them in .env.local.'
  )
}

const email = process.env.ORGANIZER_EMAIL ?? 'organizer@matchpulse.local'
const password = process.env.ORGANIZER_PASSWORD ?? 'matchpulse-organizer'
const username = process.env.ORGANIZER_USERNAME ?? 'Organizer'

const admin = createClient(url, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false }
})

const { data: list, error: listError } = await admin.auth.admin.listUsers({
  page: 1,
  perPage: 1000
})

if (listError) {
  throw new Error(`Could not list auth users: ${listError.message}`)
}

let user = list.users.find((candidate) => candidate.email === email)

if (!user) {
  const { data, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { username }
  })

  if (error || !data.user) {
    throw new Error(`Could not create organizer: ${error?.message ?? 'no user returned'}`)
  }

  user = data.user
  console.log('Created organizer auth user.')
} else {
  console.log('Organizer auth user already exists.')
}

const { data: updated, error: updateError } = await admin
  .from('profiles')
  .update({ role: 'ORGANIZER', username })
  .eq('id', user.id)
  .select('id')

if (updateError) {
  throw new Error(`Could not update organizer profile: ${updateError.message}`)
}

if (!updated || updated.length === 0) {
  const { error: insertError } = await admin.from('profiles').insert({
    id: user.id,
    username,
    points: 200,
    role: 'ORGANIZER'
  })

  if (insertError) {
    throw new Error(`Could not create organizer profile: ${insertError.message}`)
  }
}

console.log(`Organizer ready: ${email}`)
console.log('This account is a local development fixture. Do not use it in production.')

// v3 demo tenant: a published event with one ticket type and a prediction market.
// The E2E and local UI use this instead of the legacy organizer-owned tournament.
const demoClubId = '66666666-6666-6666-6666-666666666666'
const demoEventId = '77777777-7777-7777-7777-777777777777'
const demoTicketTypeId = '88888888-8888-8888-8888-888888888888'
const demoMatchId = '99999999-9999-9999-9999-999999999999'
const demoMarketId = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'

const { error: clubError } = await admin.from('clubs').upsert(
  {
    id: demoClubId,
    name: 'MatchPulse Demo Club',
    slug: 'matchpulse-demo',
    created_by: user.id
  },
  { onConflict: 'id' }
)
if (clubError) throw new Error(`Could not create demo club: ${clubError.message}`)

const { error: memberError } = await admin.from('club_members').upsert(
  { club_id: demoClubId, profile_id: user.id, role: 'OWNER' },
  { onConflict: 'club_id,profile_id' }
)
if (memberError) throw new Error(`Could not create demo membership: ${memberError.message}`)

const { error: subscriptionError } = await admin.from('club_subscriptions').upsert(
  { club_id: demoClubId, plan_code: 'PRO', status: 'ACTIVE' },
  { onConflict: 'club_id' }
)
if (subscriptionError) throw new Error(`Could not create demo subscription: ${subscriptionError.message}`)

const { error: eventError } = await admin.from('tournaments').upsert(
  {
    id: demoEventId,
    club_id: demoClubId,
    organizer_id: user.id,
    name: 'Demo Derby',
    max_capacity: 1000,
    current_players: 0,
    ticket_allocation: 1000,
    ticket_points: 10,
    status: 'PUBLISHED',
    published_at: new Date().toISOString()
  },
  { onConflict: 'id' }
)
if (eventError) throw new Error(`Could not create demo event: ${eventError.message}`)

const { error: typeError } = await admin.from('ticket_types').upsert(
  {
    id: demoTicketTypeId,
    event_id: demoEventId,
    name: 'General',
    sector: 'GENERAL',
    price_cents: 1500,
    allocation: 1000,
    max_per_buyer: 4,
    requires_fan_card: false,
    transferable: true,
    away_sector: false,
    active: true,
    created_by: user.id
  },
  { onConflict: 'id' }
)
if (typeError) throw new Error(`Could not create demo ticket type: ${typeError.message}`)

const { error: matchError } = await admin.from('matches').upsert(
  {
    id: demoMatchId,
    tournament_id: demoEventId,
    home_team: 'Demo Home',
    away_team: 'Demo Away',
    status: 'SCHEDULED',
    kickoff_time: new Date(Date.now() + 86_400_000).toISOString(),
    home_score: 0,
    away_score: 0,
    prediction_enabled: true
  },
  { onConflict: 'id' }
)
if (matchError) throw new Error(`Could not create demo match: ${matchError.message}`)

const { error: marketError } = await admin.from('markets').upsert(
  { id: demoMarketId, match_id: demoMatchId, b: 100 },
  { onConflict: 'id' }
)
if (marketError) throw new Error(`Could not create demo market: ${marketError.message}`)

console.log(`Demo v3 club and event ready: ${demoEventId}`)
