'use server'

import { revalidatePath } from 'next/cache'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { attempt, back, requiredText, text } from './form'
import { adminAssignPlan } from '@/lib/domain/admin'

export async function assignPlanAction(formData: FormData): Promise<never> {
  const path = '/admin'
  const status = (text(formData, 'status') ?? 'ACTIVE').toUpperCase()
  if (status !== 'ACTIVE' && status !== 'PAST_DUE' && status !== 'CANCELED') {
    back(path, 'error', 'Invalid subscription status.')
  }

  const result = await attempt(async () => {
    const supabase = await createSupabaseServerClient()
    await adminAssignPlan(
      supabase,
      requiredText(formData, 'clubId'),
      requiredText(formData, 'plan').toUpperCase(),
      status
    )
  })

  if (!result.ok) back(path, 'error', result.error)

  revalidatePath(path)
  back(path, 'message', 'Plan assigned.')
}
