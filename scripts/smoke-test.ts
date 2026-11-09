const baseUrl = process.env.SMOKE_BASE_URL ?? 'http://127.0.0.1:3000'
const timeoutMs = 5_000

type Check = { name: string; run: () => Promise<void> }

async function fetchWithTimeout(path: string, redirect: RequestRedirect = 'follow') {
  return fetch(new URL(path, baseUrl), {
    redirect,
    signal: AbortSignal.timeout(timeoutMs)
  })
}

async function waitForHealth(attempts = 30, delayMs = 1_000) {
  let lastError: unknown = null

  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      const response = await fetchWithTimeout('/api/health')
      if (response.ok) return
      lastError = new Error(`health returned ${response.status}`)
    } catch (error) {
      lastError = error
    }

    await new Promise((resolve) => setTimeout(resolve, delayMs))
  }

  throw lastError instanceof Error ? lastError : new Error('health check did not pass')
}

const checks: Check[] = [
  {
    name: 'health endpoint',
    run: async () => {
      const response = await fetchWithTimeout('/api/health')
      if (response.status !== 200) {
        throw new Error(`expected 200, received ${response.status}`)
      }
      const body = (await response.json()) as { status?: string; db?: string }
      if (body.status !== 'ok' || body.db !== 'up') {
        throw new Error(`unexpected health body: ${JSON.stringify(body)}`)
      }
    }
  },
  {
    name: 'login page serves the sign-in UI',
    run: async () => {
      const response = await fetchWithTimeout('/login')
      if (response.status !== 200) {
        throw new Error(`expected 200, received ${response.status}`)
      }
      const body = await response.text()
      if (!body.includes('Fan email')) {
        throw new Error('login page did not include the fan sign-in control')
      }
    }
  },
  {
    name: 'home is served as HTML',
    run: async () => {
      // The market page is partially prerendered: without a session the server
      // returns the shell and the auth gate resolves inside the streamed
      // component, so an HTTP redirect is not guaranteed here.
      const response = await fetchWithTimeout('/')
      if (response.status !== 200) {
        throw new Error(`expected 200, received ${response.status}`)
      }
      const contentType = response.headers.get('content-type') ?? ''
      if (!contentType.includes('text/html')) {
        throw new Error(`expected text/html, received ${contentType}`)
      }
    }
  }
]

async function main() {
  console.log(`Smoke test against ${baseUrl}`)
  await waitForHealth()

  let failed = false
  for (const check of checks) {
    try {
      await check.run()
      console.log(`  ✓ ${check.name}`)
    } catch (error) {
      failed = true
      console.error(`  ✗ ${check.name}: ${error instanceof Error ? error.message : String(error)}`)
    }
  }

  if (failed) {
    process.exit(1)
  }

  console.log('Smoke test passed.')
}

main().catch((error) => {
  console.error(`Smoke test failed: ${error instanceof Error ? error.message : String(error)}`)
  process.exit(1)
})
