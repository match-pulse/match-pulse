import { chmodSync, existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { homedir } from 'node:os'
import { join } from 'node:path'
import { createClient, type Session, type SupabaseClient } from '@supabase/supabase-js'
import { DomainError } from '@/lib/domain/errors'
import { signIn, signOut, signUpFan } from '@/lib/domain/auth'

export type StoredSession = {
  url: string
  anonKey: string
  accessToken: string
  refreshToken: string
  email: string | null
  userId: string
}

function configDirectory(): string {
  return process.env.MATCHPULSE_CONFIG_DIR ?? join(homedir(), '.config', 'matchpulse')
}

function profilePath(profile: string): string {
  return join(configDirectory(), `${profile}.json`)
}

function environment(): { url: string; anonKey: string } {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!url || !anonKey) {
    throw new DomainError(
      'VALIDATION',
      'NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY must be set. Use `.env.local` or the CI environment.'
    )
  }

  return { url, anonKey }
}

export function createBaseClient(url: string, anonKey: string): SupabaseClient {
  return createClient(url, anonKey, {
    auth: {
      autoRefreshToken: true,
      persistSession: false,
      detectSessionInUrl: false
    }
  })
}

function sessionFrom(session: Session, url: string, anonKey: string): StoredSession {
  return {
    url,
    anonKey,
    accessToken: session.access_token,
    refreshToken: session.refresh_token,
    email: session.user.email ?? null,
    userId: session.user.id
  }
}

export function loadSession(profile: string): StoredSession {
  const path = profilePath(profile)
  if (!existsSync(path)) {
    throw new DomainError(
      'AUTH_REQUIRED',
      `No session for profile "${profile}". Run \`matchpulse auth login --profile ${profile} --email ...\`.`
    )
  }

  const stored = JSON.parse(readFileSync(path, 'utf8')) as StoredSession
  if (!stored.url || !stored.anonKey || !stored.accessToken || !stored.refreshToken) {
    throw new DomainError('AUTH_REQUIRED', `The session for profile "${profile}" is incomplete.`)
  }
  return stored
}

function saveSession(profile: string, session: StoredSession): void {
  const directory = configDirectory()
  mkdirSync(directory, { recursive: true, mode: 0o700 })
  const path = profilePath(profile)
  writeFileSync(path, JSON.stringify(session, null, 2), { mode: 0o600 })
  chmodSync(path, 0o600)
}

export function clearSession(profile: string): void {
  rmSync(profilePath(profile), { force: true })
}

export async function login(
  profile: string,
  email: string,
  password: string
): Promise<StoredSession> {
  const { url, anonKey } = environment()
  const client = createBaseClient(url, anonKey)
  const session = await signIn(client, email, password)
  const stored = sessionFrom(session, url, anonKey)
  saveSession(profile, stored)
  return stored
}

export async function signup(
  profile: string,
  email: string,
  password: string,
  username?: string
): Promise<StoredSession> {
  const { url, anonKey } = environment()
  const client = createBaseClient(url, anonKey)
  const session = await signUpFan(client, email, password, username)
  const stored = sessionFrom(session, url, anonKey)
  saveSession(profile, stored)
  return stored
}

export async function logout(profile: string): Promise<void> {
  const stored = loadSession(profile)
  const client = createBaseClient(stored.url, stored.anonKey)
  await client.auth.setSession({
    access_token: stored.accessToken,
    refresh_token: stored.refreshToken
  })
  await signOut(client)
  clearSession(profile)
}

export async function getClient(profile: string): Promise<SupabaseClient> {
  const stored = loadSession(profile)
  const client = createBaseClient(stored.url, stored.anonKey)

  const { error } = await client.auth.setSession({
    access_token: stored.accessToken,
    refresh_token: stored.refreshToken
  })

  if (error) {
    throw new DomainError(
      'AUTH_REQUIRED',
      `The session for profile "${profile}" could not be restored. Run \`matchpulse auth login\`.`
    )
  }

  return client
}

export function sessionSummary(session: StoredSession): Record<string, unknown> {
  return {
    profileSession: true,
    email: session.email,
    userId: session.userId
  }
}
