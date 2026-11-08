import AppShell from '@/components/AppShell'
import { RewardRedeemForm } from '@/components/FanActions'
import { requireRole } from '@/lib/session'
import { createSupabaseServerClient } from '@/lib/supabase/server'

// The page reads the session and the database; it must block, not prerender.
export const instant = false

type Reward = { id: string; name: string; cost_points: number; discount_percent: number; active: boolean }
type Redemption = { reward_id: string; code: string; points_spent: number; created_at: string }

export default async function RewardsPage() {
  const profile = await requireRole('FAN')
  const supabase = await createSupabaseServerClient()

  const [{ data: rewards }, { data: redemptions }] = await Promise.all([
    supabase.from('rewards').select('id, name, cost_points, discount_percent, active').eq('active', true).order('cost_points'),
    supabase.from('reward_redemptions').select('reward_id, code, points_spent, created_at').order('created_at', { ascending: false })
  ])

  return (
    <AppShell profile={profile}>
      <h1 className="text-3xl font-extrabold tracking-tight">Rewards</h1>
      <p className="mt-1 mb-6 text-slate-400">Redeem points for a local discount code. No real payment or coupon integration.</p>

      <section className="mb-8">
        <h2 className="mb-3 text-xl font-bold">Available rewards</h2>
        <div className="grid gap-3 md:grid-cols-2">
          {(rewards as Reward[] | null)?.map((reward) => (
            <article key={reward.id} className="rounded border border-slate-800 bg-slate-900 p-4">
              <h3 className="text-lg font-semibold">{reward.name}</h3>
              <p className="mt-1 text-sm text-slate-400">{reward.cost_points} points · {reward.discount_percent}% off</p>
              <div className="mt-3"><RewardRedeemForm rewardId={reward.id} cost={reward.cost_points} /></div>
            </article>
          ))}
          {(!rewards || rewards.length === 0) && <p className="text-slate-400">No rewards configured.</p>}
        </div>
      </section>

      <section>
        <h2 className="mb-3 text-xl font-bold">Your codes</h2>
        <div className="overflow-x-auto rounded border border-slate-800">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-slate-900 text-slate-400"><tr><th className="px-3 py-2">When</th><th className="px-3 py-2">Code</th><th className="px-3 py-2">Points</th></tr></thead>
            <tbody>
              {(redemptions as Redemption[] | null)?.map((redemption) => (
                <tr key={redemption.code} className="border-t border-slate-800">
                  <td className="px-3 py-2">{new Date(redemption.created_at).toLocaleString()}</td>
                  <td className="px-3 py-2 font-mono">{redemption.code}</td>
                  <td className="px-3 py-2">{redemption.points_spent}</td>
                </tr>
              ))}
              {(!redemptions || redemptions.length === 0) && <tr><td colSpan={3} className="px-3 py-4 text-slate-400">No redemptions yet.</td></tr>}
            </tbody>
          </table>
        </div>
      </section>
    </AppShell>
  )
}
