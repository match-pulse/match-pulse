'use server'

import { redirect } from 'next/navigation'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { signIn as domainSignIn, signUpFan as domainSignUpFan } from '@/lib/domain/auth'
import { fromUnknownError } from '@/lib/domain/errors'

type AuthFailure = { success: false; message: string }

function safeNext(formData: FormData): string {
  const next = formData.get('next')
  if (typeof next === 'string' && next.startsWith('/') && !next.startsWith('//')) {
    return next
  }
  return '/'
}

function failure(error: unknown): AuthFailure {
  return { success: false, message: fromUnknownError(error).message }
}

async function passwordSignIn(formData: FormData): Promise<AuthFailure> {
  const email = formData.get('email')
  const password = formData.get('password')

  if (typeof email !== 'string' || typeof password !== 'string' || !email || !password) {
    return { success: false, message: 'Enter your email and password.' }
  }

  const supabase = await createSupabaseServerClient()

  try {
    await domainSignIn(supabase, email, password)
  } catch (error) {
    return failure(error)
  }

  redirect(safeNext(formData))
}

export async function signInFan(formData: FormData): Promise<AuthFailure> {
  return passwordSignIn(formData)
}

export async function signInOrganizer(formData: FormData): Promise<AuthFailure> {
  return passwordSignIn(formData)
}

export async function signInClub(formData: FormData): Promise<AuthFailure> {
  return passwordSignIn(formData)
}

export async function signUpFan(formData: FormData): Promise<AuthFailure> {
  const email = formData.get('email')
  const password = formData.get('password')
  const confirmPassword = formData.get('confirmPassword')
  const username = formData.get('username')

  if (typeof email !== 'string' || !email) {
    return { success: false, message: 'Enter your email.' }
  }
  if (typeof password !== 'string' || password.length < 6) {
    return { success: false, message: 'The password must be at least 6 characters.' }
  }
  if (typeof confirmPassword !== 'string' || password !== confirmPassword) {
    return { success: false, message: 'The passwords do not match.' }
  }
  if (typeof username !== 'string' || username.trim().length < 2) {
    return { success: false, message: 'Choose a username with at least 2 characters.' }
  }

  const supabase = await createSupabaseServerClient()

  try {
    await domainSignUpFan(supabase, email, password, username.trim())
  } catch (error) {
    return failure(error)
  }

  redirect(safeNext(formData))
}

export async function signOut(): Promise<never> {
  const supabase = await createSupabaseServerClient()
  await supabase.auth.signOut()
  redirect('/login')
}
