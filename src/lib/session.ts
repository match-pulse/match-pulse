/**
 * Single server-side source of the current user identity.
 *
 * Server actions and pages import this and never accept a user id from the
 * client. Passing an identity through a form field would let any caller act as
 * any participant.
 *
 * PROVISIONAL: this returns the seeded demo profile because real
 * authentication is out of scope for this increment. When Supabase Auth lands,
 * replace the body of `getCurrentUserId` with a `supabase.auth.getUser()`
 * lookup. Every current action resolves identity through this seam; extending
 * it to any new action is mandatory.
 */

const DEMO_USER_ID = '00000000-0000-0000-0000-000000000000'

export async function getCurrentUserId(): Promise<string> {
  return DEMO_USER_ID
}