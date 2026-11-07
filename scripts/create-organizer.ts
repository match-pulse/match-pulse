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
