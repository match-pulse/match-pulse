import { getCurrentUser, getProfile, type Profile } from '@/lib/session'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { listMyClubs } from '@/lib/domain/clubs'
import type { ClubSummary } from '@/lib/domain/types'

export type Viewer = {
  user: { id: string; email?: string }
  profile: Profile
  clubs: ClubSummary[]
  isAdmin: boolean
}

export async function getViewer(): Promise<Viewer | null> {
  const user = await getCurrentUser()
  if (!user) return null

  const profile = await getProfile()
  if (!profile) return null

  const supabase = await createSupabaseServerClient()

  let clubs: ClubSummary[] = []
  try {
    clubs = await listMyClubs(supabase)
  } catch {
    clubs = []
  }

  const { data: admin } = await supabase
    .from('platform_admins')
    .select('profile_id')
    .eq('profile_id', user.id)
    .maybeSingle()

  return {
    user: { id: user.id, email: user.email ?? undefined },
    profile,
    clubs,
    isAdmin: Boolean(admin)
  }
}
