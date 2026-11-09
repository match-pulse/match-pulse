import { redirect } from 'next/navigation'
import Notice from '@/components/Notice'
import V3Shell from '@/components/V3Shell'
import { assignPlanAction } from '@/app/actions/v3'
import { adminListAudit, adminListClubs } from '@/lib/domain/admin'
import { listPlans } from '@/lib/domain/clubs'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { getViewer } from '@/lib/viewer'

export const instant = false

type PageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}

export default async function AdminPage({ searchParams }: PageProps) {
  const params = await searchParams
  const message = typeof params.message === 'string' ? params.message : undefined
  const error = typeof params.error === 'string' ? params.error : undefined

  const viewer = await getViewer()
  if (!viewer) redirect('/login')
  if (!viewer.isAdmin) redirect('/')

  const supabase = await createSupabaseServerClient()
  const [clubs, plans, audit] = await Promise.all([
    adminListClubs(supabase),
    listPlans(supabase),
    adminListAudit(supabase, 50)
  ])

  return (
    <V3Shell
      profile={viewer.profile}
      clubs={viewer.clubs}
      isAdmin={viewer.isAdmin}
      context="admin"
      clubId={viewer.clubs[0]?.club_id}
    >
      <div className="mb-8">
        <h1 className="text-3xl font-extrabold tracking-tight">Platform admin</h1>
        <p className="mt-1 text-slate-400">
          Clubs, simulated subscriptions and the audit trail.
        </p>
      </div>

      <Notice message={message} error={error} />

      <section className="rounded border border-slate-800 bg-slate-900 p-5">
        <h2 className="text-xl font-bold">Clubs</h2>
        <div className="mt-3 overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="text-slate-400">
              <tr>
                <th className="px-3 py-2">Club</th>
                <th className="px-3 py-2">Plan</th>
                <th className="px-3 py-2">Status</th>
                <th className="px-3 py-2">Assign</th>
              </tr>
            </thead>
            <tbody>
              {clubs.map((club) => (
                <tr key={club.club_id} className="border-t border-slate-800">
                  <td className="px-3 py-2">
                    <p className="font-semibold">{club.name}</p>
                    <p className="text-xs text-slate-400">{club.slug}</p>
                  </td>
                  <td className="px-3 py-2">{club.plan_code ?? '—'}</td>
                  <td className="px-3 py-2">{club.subscription_status ?? '—'}</td>
                  <td className="px-3 py-2">
                    <form action={assignPlanAction} className="flex flex-wrap items-end gap-2">
                      <input type="hidden" name="clubId" value={club.club_id} />
                      <select
                        name="plan"
                        defaultValue={club.plan_code ?? 'STARTER'}
                        className="rounded bg-white p-1 text-black"
                        aria-label={`Plan for ${club.name}`}
                      >
                        {plans.map((plan) => (
                          <option key={plan.code} value={plan.code}>
                            {plan.code}
                          </option>
                        ))}
                      </select>
                      <select
                        name="status"
                        defaultValue={club.subscription_status ?? 'ACTIVE'}
                        className="rounded bg-white p-1 text-black"
                        aria-label={`Status for ${club.name}`}
                      >
                        <option value="ACTIVE">ACTIVE</option>
                        <option value="PAST_DUE">PAST_DUE</option>
                        <option value="CANCELED">CANCELED</option>
                      </select>
                      <button
                        type="submit"
                        className="rounded bg-blue-600 px-2 py-1 text-xs font-semibold text-white hover:bg-blue-700"
                      >
                        Assign
                      </button>
                    </form>
                  </td>
                </tr>
              ))}
              {clubs.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-3 py-4 text-slate-400">
                    No clubs yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section className="mt-6 rounded border border-slate-800 bg-slate-900 p-5">
        <h2 className="text-xl font-bold">Audit</h2>
        <div className="mt-3 overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="text-slate-400">
              <tr>
                <th className="px-3 py-2">When</th>
                <th className="px-3 py-2">Actor</th>
                <th className="px-3 py-2">Action</th>
                <th className="px-3 py-2">Entity</th>
                <th className="px-3 py-2">Club</th>
              </tr>
            </thead>
            <tbody>
              {audit.map((entry) => (
                <tr key={entry.id} className="border-t border-slate-800">
                  <td className="px-3 py-2 text-xs text-slate-400">
                    {new Date(entry.created_at).toLocaleString()}
                  </td>
                  <td className="px-3 py-2">{entry.actor_username ?? '—'}</td>
                  <td className="px-3 py-2">{entry.action}</td>
                  <td className="px-3 py-2 text-xs text-slate-400">{entry.entity_type}</td>
                  <td className="px-3 py-2 text-xs text-slate-400">{entry.club_id ?? '—'}</td>
                </tr>
              ))}
              {audit.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-3 py-4 text-slate-400">
                    No audit events.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </V3Shell>
  )
}
