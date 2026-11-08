import { connection, NextResponse } from 'next/server'
import { logError } from '@/lib/logger'
import { createSupabaseHealthClient } from '@/lib/supabase/health'

const NO_STORE = { 'cache-control': 'no-store' }

/**
 * Public, read-only health signal. It checks that the application can reach
 * PostgreSQL through a public read; it does not expose counts, identities,
 * secrets or environment values.
 */
export async function GET() {
  // Keep the probe out of the build-time static shell: health must be observed
  // when it is requested, not when the image is built.
  await connection()
  const timestamp = new Date().toISOString()

  try {
    const supabase = createSupabaseHealthClient()
    const { error } = await supabase.from('markets').select('id').limit(1)

    if (error) {
      throw error
    }

    return NextResponse.json(
      { status: 'ok', app: 'up', db: 'up', timestamp },
      { status: 200, headers: NO_STORE }
    )
  } catch (error) {
    logError('health.db_check_failed', {
      message: error instanceof Error ? error.message : 'unknown error'
    })

    return NextResponse.json(
      { status: 'error', app: 'up', db: 'down', timestamp },
      { status: 503, headers: NO_STORE }
    )
  }
}
