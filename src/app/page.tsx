import { redirect } from 'next/navigation'
import { getCurrentUser, getProfile } from '@/lib/session'
import { createSupabaseServerClient } from '@/lib/supabase/server'

// The home redirect reads the session and the v3 context; it must block.
export const instant = false

export default async function Home() {
  const user = await getCurrentUser()

  if (!user) {
    redirect('/login')
  }

  const supabase = await createSupabaseServerClient()

  const [{ data: admin }, { data: membership }, profile] = await Promise.all([
    supabase
      .from('platform_admins')
      .select('profile_id')
      .eq('profile_id', user.id)
      .maybeSingle(),
    supabase
      .from('club_members')
      .select('club_id')
      .eq('profile_id', user.id)
      .limit(1)
      .maybeSingle(),
    getProfile()
  ])

  if (admin) {
    redirect('/admin')
  }

  if (profile?.role === 'ORGANIZER') {
    redirect('/organizer')
  }

  if (membership) {
    redirect('/club/dashboard')
  }

  redirect('/events')
}
