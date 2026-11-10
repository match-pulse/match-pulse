import AxeBuilder from '@axe-core/playwright'
import { expect, test } from '@playwright/test'

const ORGANIZER_EMAIL = process.env.ORGANIZER_EMAIL ?? 'organizer@matchpulse.local'
const ORGANIZER_PASSWORD = process.env.ORGANIZER_PASSWORD ?? 'matchpulse-organizer'
const ADMIN_EMAIL = process.env.ADMIN_EMAIL ?? 'admin@matchpulse.local'
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD ?? 'matchpulse-admin'

async function assertNoCriticalViolations(page: import('@playwright/test').Page) {
  const results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa']).analyze()
  const blocking = results.violations.filter(
    (violation) => violation.impact === 'critical' || violation.impact === 'serious'
  )
  expect(blocking, JSON.stringify(blocking, null, 2)).toEqual([])
}

test('login page has no serious or critical accessibility violations', async ({ page }) => {
  await page.goto('/login')
  await assertNoCriticalViolations(page)
})

test('fan events page has no serious or critical accessibility violations', async ({ page }) => {
  const fanEmail = `axe-fan-${Date.now()}@matchpulse.local`

  await page.goto('/login')
  await page.getByRole('button', { name: 'New fan? Create an account' }).click()
  await page.getByLabel('Fan email').fill(fanEmail)
  await page.getByLabel('Username').fill('Axe Fan')
  await page.getByLabel('Password', { exact: true }).fill('matchpulse-fan')
  await page.getByLabel('Confirm password').fill('matchpulse-fan')
  await page.getByRole('button', { name: 'Create fan account' }).click()

  await expect(page.getByRole('heading', { name: 'Events' })).toBeVisible()
  await assertNoCriticalViolations(page)

  const demo = page.locator('article').filter({ hasText: 'Demo Derby' }).first()
  await demo.getByRole('link', { name: 'Open event' }).click()
  await expect(page.getByRole('heading', { name: 'Demo Derby' })).toBeVisible()
  await assertNoCriticalViolations(page)
})

test('organizer page has no serious or critical accessibility violations', async ({ page }) => {
  await page.goto('/login')
  await page.getByRole('button', { name: 'Organizer' }).click()
  await page.getByLabel('Organizer email').fill(ORGANIZER_EMAIL)
  await page.getByLabel('Password').fill(ORGANIZER_PASSWORD)
  await page.getByRole('button', { name: 'Sign in as organizer' }).click()
  await expect(page.getByRole('heading', { name: 'Organizer dashboard' })).toBeVisible()
  await assertNoCriticalViolations(page)
})

test('club dashboard and event page have no serious or critical accessibility violations', async ({ page }) => {
  await page.goto('/login')
  await page.getByRole('button', { name: 'Organizer' }).click()
  await page.getByLabel('Organizer email').fill(ORGANIZER_EMAIL)
  await page.getByLabel('Password').fill(ORGANIZER_PASSWORD)
  await page.getByRole('button', { name: 'Sign in as organizer' }).click()
  await expect(page.getByRole('heading', { name: 'Organizer dashboard' })).toBeVisible()

  await page.goto('/club/dashboard')
  await expect(page.getByRole('heading', { name: 'MatchPulse Demo Club' })).toBeVisible()
  await assertNoCriticalViolations(page)

  await page.getByRole('link', { name: 'Manage' }).first().click()
  await expect(page.getByRole('heading', { name: 'Demo Derby' })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Ticket types' })).toBeVisible()
  await assertNoCriticalViolations(page)
})

test('admin console has no serious or critical accessibility violations', async ({ page }) => {
  await page.goto('/login')
  await page.getByRole('button', { name: 'Organizer' }).click()
  await page.getByLabel('Organizer email').fill(ADMIN_EMAIL)
  await page.getByLabel('Password').fill(ADMIN_PASSWORD)
  await page.getByRole('button', { name: 'Sign in as organizer' }).click()
  await expect(page.getByRole('heading', { name: 'Platform admin' })).toBeVisible()
  await assertNoCriticalViolations(page)
})
