'use server'

import { revalidatePath } from 'next/cache'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { attempt, back, requiredNumber, requiredText } from './form'
import { createClubReward, redeemReward } from '@/lib/domain/analytics'

export async function createRewardAction(formData: FormData): Promise<never> {
  const clubId = requiredText(formData, 'clubId')
  const path = `/club/dashboard?club=${clubId}`
  const result = await attempt(async () => {
    const supabase = await createSupabaseServerClient()
    await createClubReward(
      supabase,
      clubId,
      requiredText(formData, 'name'),
      requiredNumber(formData, 'cost'),
      requiredNumber(formData, 'discount')
    )
  })

  if (!result.ok) back(path, 'error', result.error)

  revalidatePath(path)
  back(path, 'message', 'Reward created.')
}

export async function redeemRewardAction(formData: FormData): Promise<never> {
  const result = await attempt(async () => {
    const supabase = await createSupabaseServerClient()
    return redeemReward(
      supabase,
      requiredText(formData, 'rewardId'),
      requiredText(formData, 'requestId')
    )
  })

  if (!result.ok) back('/fan/rewards', 'error', result.error)

  revalidatePath('/fan/rewards')
  back('/fan/rewards', 'message', `Reward redeemed. Code: ${result.data.code}`)
}
