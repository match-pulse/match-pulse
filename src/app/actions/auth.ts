'use server'

import { redirect } from 'next/navigation'
import { createSupabaseServerClient } from '@/lib/supabase/server'

type AuthFailure = { success: false; message: string }

export async function signInAnonymously(): Promise<AuthFailure> {
  const supabase = await createSupabaseServerClient()
  const { error } = await supabase.auth.signInAnonymously()

  if (error) {
    return {
      success: false,
      message: 'Could not start a fan session. Check that anonymous sign-in is enabled.'
    }
  }

  redirect('/')
}

export async function signInOrganizer(formData: FormData): Promise<AuthFailure> {
  const email = formData.get('email')
  const password = formData.get('password')

  if (typeof email !== 'string' || typeof password !== 'string' || !email || !password) {
    return { success: false, message: 'Enter the organizer email and password.' }
  }

  const supabase = await createSupabaseServerClient()
  const { error } = await supabase.auth.signInWithPassword({ email, password })

  if (error) {
    return { success: false, message: 'Invalid organizer credentials.' }
  }

  redirect('/')
}

export async function signOut(): Promise<never> {
  const supabase = await createSupabaseServerClient()
  await supabase.auth.signOut()
  redirect('/login')
}
