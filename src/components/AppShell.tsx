import Link from 'next/link'
import { signOut } from '@/app/actions/auth'
import type { Profile } from '@/lib/session'

const LINKS: Record<Profile['role'], Array<{ href: string; label: string }>> = {
  FAN: [
    { href: '/fan', label: 'Home' },
    { href: '/fan/tournaments', label: 'Tournaments' },
    { href: '/fan/portfolio', label: 'Portfolio' },
    { href: '/fan/rewards', label: 'Rewards' },
    { href: '/fan/profile', label: 'Profile' }
  ],
  ORGANIZER: [
    { href: '/organizer', label: 'Dashboard' }
  ]
}

export default function AppShell({
  profile,
  children
}: {
  profile: Profile
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <header className="border-b border-slate-800 bg-slate-900/80">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-3">
          <div className="flex items-center gap-4">
            <Link href="/" className="text-lg font-extrabold tracking-tight">
              Match<span className="text-blue-400">Pulse</span>
            </Link>
            <nav aria-label="Primary" className="flex flex-wrap gap-2 text-sm">
              {LINKS[profile.role].map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="rounded px-2 py-1 text-slate-300 hover:bg-slate-800 hover:text-white"
                >
                  {link.label}
                </Link>
              ))}
            </nav>
          </div>
          <div className="flex items-center gap-3 text-sm">
            <span className="rounded bg-slate-800 px-2 py-1 text-xs font-semibold text-slate-300">
              {profile.role}
            </span>
            <span className="text-slate-300">{profile.username}</span>
            <span className="font-semibold text-blue-300">{profile.points} pts</span>
            <form action={signOut}>
              <button type="submit" className="rounded border border-slate-700 px-2 py-1 text-slate-300 hover:bg-slate-800">
                Sign out
              </button>
            </form>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-8">{children}</main>
    </div>
  )
}
