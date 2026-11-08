import { redirect } from 'next/navigation'
import { getProfile } from '@/lib/session'

// The home redirect reads the session; it must block, not prerender.
export const instant = false

export default async function Home() {
  const profile = await getProfile()

  if (!profile) {
    redirect('/login')
  }

  if (profile.role === 'ORGANIZER') {
    redirect('/organizer')
  }

  if (profile.role === 'CLUB') {
    redirect('/club')
  }

  redirect('/fan')
}
