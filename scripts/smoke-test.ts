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
    name: 'login page',
    run: async () => {
      const response = await fetchWithTimeout('/login')
      if (response.status !== 200) {
        throw new Error(`expected 200, received ${response.status}`)
      }
    }
  },
  {
    name: 'home redirects to login without a session',
    run: async () => {
      const response = await fetchWithTimeout('/')
      const finalPath = new URL(response.url).pathname
      if (response.status !== 200 || finalPath !== '/login') {
        throw new Error(`expected 200 at /login, received ${response.status} at ${finalPath}`)
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
