import Link from 'next/link'
import { signOut } from '@/app/actions/auth'
import type { Profile } from '@/lib/session'
import type { ClubSummary } from '@/lib/domain/types'

type Context = 'fan' | 'club' | 'admin'

type LinkItem = { href: string; label: string }

function linksFor(context: Context, clubId?: string): LinkItem[] {
  if (context === 'club') {
    const suffix = clubId ? `?club=${clubId}` : ''
    return [
      { href: `/club/dashboard${suffix}`, label: 'Dashboard' },
      { href: `/club/dashboard${suffix}`, label: 'Events' },
      { href: `/club/dashboard${suffix}`, label: 'Analytics' }
    ]
  }

  if (context === 'admin') {
    return [
      { href: '/admin', label: 'Clubs' },
      { href: '/admin', label: 'Audit' }
    ]
  }

  return [
    { href: '/events', label: 'Events' },
    { href: '/fan/tickets', label: 'My tickets' },
    { href: '/fan/portfolio', label: 'Portfolio' },
    { href: '/fan/rewards', label: 'Rewards' }
  ]
}

export default function V3Shell({
  profile,
  clubs,
  isAdmin,
  context,
  clubId,
  children
}: {
  profile: Profile
  clubs: ClubSummary[]
  isAdmin: boolean
  context: Context
  clubId?: string
  children: React.ReactNode
}) {
  const activeClub = clubs.find((club) => club.club_id === clubId) ?? clubs[0]
  const links = linksFor(context, activeClub?.club_id)

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <header className="border-b border-slate-800 bg-slate-900/80">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-3">
          <div className="flex items-center gap-4">
            <Link href="/" className="text-lg font-extrabold tracking-tight">
              Match<span className="text-blue-400">Pulse</span>
            </Link>
            <nav aria-label="Primary" className="flex flex-wrap gap-2 text-sm">
              {links.map((link) => (
                <Link
                  key={link.label}
                  href={link.href}
                  className="rounded px-2 py-1 text-slate-300 hover:bg-slate-800 hover:text-white"
                >
                  {link.label}
                </Link>
              ))}
            </nav>
          </div>
          <div className="flex flex-wrap items-center gap-3 text-sm">
            {activeClub && context !== 'club' && (
              <Link
                href={`/club/dashboard?club=${activeClub.club_id}`}
                className="rounded border border-slate-700 px-2 py-1 text-slate-300 hover:bg-slate-800"
              >
                {activeClub.name}
              </Link>
            )}
            {context === 'club' && (
              <Link
                href="/events"
                className="rounded border border-slate-700 px-2 py-1 text-slate-300 hover:bg-slate-800"
              >
                Fan view
              </Link>
            )}
            {isAdmin && context !== 'admin' && (
              <Link
                href="/admin"
                className="rounded border border-slate-700 px-2 py-1 text-slate-300 hover:bg-slate-800"
              >
                Admin
              </Link>
            )}
            <span className="rounded bg-slate-800 px-2 py-1 text-xs font-semibold text-slate-300">
              {context === 'club' ? activeClub?.role ?? 'CLUB' : context.toUpperCase()}
            </span>
            <span className="text-slate-300">{profile.username}</span>
            <span className="font-semibold text-blue-300">{profile.points} pts</span>
            <form action={signOut}>
              <button
                type="submit"
                className="rounded border border-slate-700 px-2 py-1 text-slate-300 hover:bg-slate-800"
              >
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
