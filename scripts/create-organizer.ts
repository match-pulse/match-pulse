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

// The v2 seed market is linked to a legacy tournament with no organizer. Assign
// it to the local organizer so the seeded market can be resolved end-to-end.
const seedTournamentId = '22222222-2222-2222-2222-222222222222'
const { error: seedOrganizerError } = await admin
  .from('tournaments')
  .update({ organizer_id: user.id })
  .eq('id', seedTournamentId)
if (seedOrganizerError) {
  throw new Error(`Could not assign the seed tournament: ${seedOrganizerError.message}`)
}
console.log(`Seed tournament assigned to the organizer: ${seedTournamentId}`)

// Platform-admin fixture for the local/CI admin console.
const adminEmail = process.env.ADMIN_EMAIL ?? 'admin@matchpulse.local'
const adminPassword = process.env.ADMIN_PASSWORD ?? 'matchpulse-admin'
const adminUsername = process.env.ADMIN_USERNAME ?? 'Platform Admin'
const adminProfile = list.users.find((candidate) => candidate.email === adminEmail)

let platformAdmin = adminProfile

if (!platformAdmin) {
  const { data, error } = await admin.auth.admin.createUser({
    email: adminEmail,
    password: adminPassword,
    email_confirm: true,
    user_metadata: { username: adminUsername }
  })

  if (error || !data.user) {
    throw new Error(`Could not create platform admin: ${error?.message ?? 'no user returned'}`)
  }

  platformAdmin = data.user
  console.log('Created platform admin auth user.')
} else {
  console.log('Platform admin auth user already exists.')
}

const { error: adminProfileError } = await admin
  .from('profiles')
  .update({ username: adminUsername, role: 'FAN' })
  .eq('id', platformAdmin.id)

if (adminProfileError) {
  throw new Error(`Could not update platform admin profile: ${adminProfileError.message}`)
}

const { error: adminGrantError } = await admin
  .from('platform_admins')
  .upsert({ profile_id: platformAdmin.id, created_by: user.id }, { onConflict: 'profile_id' })

if (adminGrantError) {
  throw new Error(`Could not grant platform admin: ${adminGrantError.message}`)
}

console.log(`Platform admin ready: ${adminEmail}`)
