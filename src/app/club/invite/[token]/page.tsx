import Link from 'next/link'
import { redirect } from 'next/navigation'
import Notice from '@/components/Notice'
import V3Shell from '@/components/V3Shell'
import { acceptInviteAction } from '@/app/actions/v3'
import { getViewer } from '@/lib/viewer'

export const instant = false

type PageProps = {
  params: Promise<{ token: string }>
  searchParams: Promise<Record<string, string | string[] | undefined>>
}

export default async function ClubInvitePage({ params, searchParams }: PageProps) {
  const { token } = await params
  const query = await searchParams
  const message = typeof query.message === 'string' ? query.message : undefined
  const error = typeof query.error === 'string' ? query.error : undefined

  const viewer = await getViewer()
  if (!viewer) {
    redirect(`/login?next=${encodeURIComponent(`/club/invite/${token}`)}`)
  }

  return (
    <V3Shell
      profile={viewer.profile}
      clubs={viewer.clubs}
      isAdmin={viewer.isAdmin}
      context="club"
      clubId={viewer.clubs[0]?.club_id}
    >
      <div className="mx-auto max-w-xl">
        <h1 className="text-3xl font-extrabold tracking-tight">Club invitation</h1>
        <p className="mt-1 mb-6 text-slate-400">
          You are signed in as {viewer.profile.username}. Accept the invitation with the
          email address that received it.
        </p>

        <Notice message={message} error={error} />

        <form action={acceptInviteAction} className="rounded border border-slate-800 bg-slate-900 p-5">
          <input type="hidden" name="token" value={token} />
          <p className="text-sm text-slate-300">
            The invitation is single-use and expires after seven days.
          </p>
          <button
            type="submit"
            className="mt-4 rounded bg-blue-600 px-4 py-2 font-semibold text-white hover:bg-blue-700"
          >
            Accept invitation
          </button>
        </form>

        <p className="mt-4 text-sm text-slate-400">
          <Link href="/events" className="text-blue-300 underline">
            Browse events
          </Link>
        </p>
      </div>
    </V3Shell>
  )
}
