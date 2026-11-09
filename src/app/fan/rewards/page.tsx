import { redirect } from 'next/navigation'
import Notice from '@/components/Notice'
import V3Shell from '@/components/V3Shell'
import { redeemRewardAction } from '@/app/actions/v3'
import { listFanRewards } from '@/lib/domain/analytics'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { getViewer } from '@/lib/viewer'

export const instant = false

type PageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}

export default async function FanRewardsPage({ searchParams }: PageProps) {
  const params = await searchParams
  const message = typeof params.message === 'string' ? params.message : undefined
  const error = typeof params.error === 'string' ? params.error : undefined

  const viewer = await getViewer()
  if (!viewer) redirect('/login')

  const supabase = await createSupabaseServerClient()
  const rewards = await listFanRewards(supabase)

  return (
    <V3Shell
      profile={viewer.profile}
      clubs={viewer.clubs}
      isAdmin={viewer.isAdmin}
      context="fan"
      clubId={viewer.clubs[0]?.club_id}
    >
      <div className="mb-8">
        <h1 className="text-3xl font-extrabold tracking-tight">Rewards</h1>
        <p className="mt-1 text-slate-400">
          Redeem your points for club discounts. Rewards are club-scoped and do not involve
          real money.
        </p>
        <p className="mt-2 text-sm text-slate-300">Your balance: {viewer.profile.points} points</p>
      </div>

      <Notice message={message} error={error} />

      <div className="grid gap-4 md:grid-cols-2">
        {rewards.map((reward) => (
          <article key={reward.id} className="rounded border border-slate-800 bg-slate-900 p-5">
            <p className="text-xs font-semibold uppercase tracking-wide text-blue-300">
              {reward.club_name ?? 'Club'}
            </p>
            <h2 className="mt-1 text-xl font-bold">{reward.name}</h2>
            <p className="mt-2 text-sm text-slate-400">
              {reward.cost_points} points · {reward.discount_percent}% discount
            </p>
            <form action={redeemRewardAction} className="mt-4">
              <input type="hidden" name="rewardId" value={reward.id} />
              <button
                type="submit"
                className="rounded bg-emerald-700 px-3 py-2 text-sm font-semibold text-white hover:bg-emerald-800"
              >
                Redeem for {reward.cost_points} pts
              </button>
            </form>
          </article>
        ))}
        {rewards.length === 0 && (
          <p className="text-slate-400">
            No club rewards are available yet. Buy a ticket for a club to unlock its rewards.
          </p>
        )}
      </div>
    </V3Shell>
  )
}
