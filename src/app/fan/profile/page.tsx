import AppShell from '@/components/AppShell'
import { requireRole } from '@/lib/session'

// The page reads the session and the database; it must block, not prerender.
export const instant = false

export default async function ProfilePage() {
  const profile = await requireRole('FAN')

  return (
    <AppShell profile={profile}>
      <h1 className="text-3xl font-extrabold tracking-tight">Profile</h1>
      <div className="mt-6 max-w-md rounded border border-slate-800 bg-slate-900 p-5">
        <dl className="grid gap-3 text-sm">
          <div><dt className="text-slate-400">Username</dt><dd className="font-semibold">{profile.username}</dd></div>
          <div><dt className="text-slate-400">Role</dt><dd className="font-semibold">{profile.role}</dd></div>
          <div><dt className="text-slate-400">Points</dt><dd className="font-semibold text-blue-300">{profile.points}</dd></div>
        </dl>
      </div>
    </AppShell>
  )
}
