import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { randomUUID } from 'crypto'

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!

if (!URL || !ANON_KEY || !SERVICE_ROLE_KEY) {
  throw new Error(
    'NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY and SUPABASE_SERVICE_ROLE_KEY must be set. Run `bunx supabase db reset` and put the local values in .env.local.'
  )
}

export const admin: SupabaseClient = createClient(URL, SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false }
})

export type TestUser = {
  id: string
  email: string
  password: string
  client: SupabaseClient
}

const PASSWORD = 'matchpulse-test-password'

export async function createUser(role: 'FAN' | 'ORGANIZER' | 'CLUB' = 'FAN'): Promise<TestUser> {
  const id = randomUUID()
  const email = `test-${id}@matchpulse.local`
  const username = `Test_${id.slice(0, 8)}`

  const { data, error } = await admin.auth.admin.createUser({
    email,
    password: PASSWORD,
    email_confirm: true,
    user_metadata: { username }
  })

  if (error || !data.user) {
    throw new Error(`Failed to create test user: ${error?.message ?? 'no user returned'}`)
  }

  if (role !== 'FAN') {
    const { data: updated, error: updateError } = await admin
      .from('profiles')
      .update({ role })
      .eq('id', data.user.id)
      .select('id')

    if (updateError) {
      throw new Error(`Failed to set test user role: ${updateError.message}`)
    }

    if (!updated || updated.length === 0) {
      const { error: insertError } = await admin.from('profiles').insert({
        id: data.user.id,
        username,
        points: 200,
        role
      })

      if (insertError) {
        throw new Error(`Failed to create test profile: ${insertError.message}`)
      }
    }
  }

  const client = createClient(URL, ANON_KEY, {
    auth: { autoRefreshToken: false, persistSession: false }
  })

  const { error: signInError } = await client.auth.signInWithPassword({
    email,
    password: PASSWORD
  })

  if (signInError) {
    throw new Error(`Failed to sign in test user: ${signInError.message}`)
  }

  return { id: data.user.id, email, password: PASSWORD, client }
}

export async function createAnonymousUser(): Promise<TestUser> {
  const client = createClient(URL, ANON_KEY, {
    auth: { autoRefreshToken: false, persistSession: false }
  })

  const { data, error } = await client.auth.signInAnonymously()

  if (error || !data.user) {
    throw new Error(`Failed to create anonymous user: ${error?.message ?? 'no user returned'}`)
  }

  return { id: data.user.id, email: '', password: '', client }
}

export async function createUsers(
  count: number,
  role: 'FAN' | 'ORGANIZER' | 'CLUB' = 'FAN'
): Promise<TestUser[]> {
  const users: TestUser[] = []
  const batchSize = 10

  for (let start = 0; start < count; start += batchSize) {
    const batch = await Promise.all(
      Array.from({ length: Math.min(batchSize, count - start) }, () => createUser(role))
    )
    users.push(...batch)
  }

  return users
}

export async function deleteUsers(users: TestUser[]): Promise<void> {
  await Promise.all(
    users.map(async (user) => {
      const { error } = await admin.auth.admin.deleteUser(user.id)
      if (error) {
        console.warn(`Could not delete test user ${user.id}: ${error.message}`)
      }
    })
  )
}

export function anonClient(): SupabaseClient {
  return createClient(URL, ANON_KEY, {
    auth: { autoRefreshToken: false, persistSession: false }
  })
}
