import type { SupabaseClient } from '@supabase/supabase-js'
import { DomainError } from './errors'
import { callRpc, selectOne } from './rpc'
import type { ClubSummary, ProfileSummary } from './types'

export type Identity = {
  user: { id: string; email: string | null }
  profile: ProfileSummary
  clubs: ClubSummary[]
  isAdmin: boolean
}

export async function signUpFan(
  client: SupabaseClient,
  email: string,
  password: string,
  username?: string
) {
  const { data, error } = await client.auth.signUp({
    email,
    password,
    options: username ? { data: { username } } : undefined
  })

  if (error) throw new DomainError('VALIDATION', error.message)
  if (!data.session) {
    throw new DomainError(
      'EMAIL_CONFIRMATION_REQUIRED',
      'The account was created but no session was returned. Confirm the email or disable confirmations locally.'
    )
  }
  return data.session
}

export async function signIn(client: SupabaseClient, email: string, password: string) {
  const { data, error } = await client.auth.signInWithPassword({ email, password })
  if (error) throw new DomainError('AUTH_REQUIRED', error.message)
  return data.session
}

export async function signOut(client: SupabaseClient) {
  const { error } = await client.auth.signOut()
  if (error) throw new DomainError('UNKNOWN', error.message)
}

export async function getIdentity(client: SupabaseClient): Promise<Identity> {
  const {
    data: { user },
    error
  } = await client.auth.getUser()

  if (error || !user) {
    throw new DomainError('AUTH_REQUIRED', 'Authentication required. Run `matchpulse auth login`.')
  }

  const profile = await selectOne<ProfileSummary>(
    client.from('profiles').select('id, username, points').eq('id', user.id).maybeSingle()
  )

  if (!profile) {
    throw new DomainError('NOT_FOUND', 'Profile not found for the authenticated user.')
  }

  const clubs = await callRpc<ClubSummary[]>(client, 'list_my_clubs')
  const admin = await selectOne<{ profile_id: string }>(
    client.from('platform_admins').select('profile_id').eq('profile_id', user.id).maybeSingle()
  )

  return {
    user: { id: user.id, email: user.email ?? null },
    profile,
    clubs,
    isAdmin: Boolean(admin)
  }
}
