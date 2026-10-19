/**
 * Single server-side source of the current user identity.
 *
 * Server actions and pages import this and never accept a user id from the
 * client. Passing an identity through a form field would let any caller act as
 * any participant, which is the flaw the existing `retractPrediction` action
 * still has.
 *
 * PROVISIONAL: this returns the seeded demo profile because real
 * authentication is out of scope for this increment. When Supabase Auth lands,
 * replace the body of `getCurrentUserId` with a `supabase.auth.getUser()`
 * lookup. Note honestly: not every action uses this seam yet — the prediction
 * actions predate it and hard-code the demo user id. Retiring those actions is
 * the fix; extending the seam to any new action is mandatory from now on.
 */

const DEMO_USER_ID = '00000000-0000-0000-0000-000000000000'

export async function getCurrentUserId(): Promise<string> {
  return DEMO_USER_ID
}