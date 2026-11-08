import { createClient } from '@supabase/supabase-js'

const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!url || !serviceKey) {
  throw new Error(
    'NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set. Run `bunx supabase status -o env` and put them in .env.local.'
  )
}

const email = process.env.CLUB_EMAIL ?? 'club@matchpulse.local'
const password = process.env.CLUB_PASSWORD ?? 'matchpulse-club'
const username = process.env.CLUB_USERNAME ?? 'Club Analyst'

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
    throw new Error(`Could not create club user: ${error?.message ?? 'no user returned'}`)
  }

  user = data.user
  console.log('Created club auth user.')
} else {
  console.log('Club auth user already exists.')
}

const { data: updated, error: updateError } = await admin
  .from('profiles')
  .update({ role: 'CLUB', username })
  .eq('id', user.id)
  .select('id')

if (updateError) {
  throw new Error(`Could not update club profile: ${updateError.message}`)
}

if (!updated || updated.length === 0) {
  const { error: insertError } = await admin.from('profiles').insert({
    id: user.id,
    username,
    points: 200,
    role: 'CLUB'
  })

  if (insertError) {
    throw new Error(`Could not create club profile: ${insertError.message}`)
  }
}

console.log(`Club account ready: ${email}`)
console.log('This account is a local development fixture. Do not use it in production.')
