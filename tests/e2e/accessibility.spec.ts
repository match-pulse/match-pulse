import AxeBuilder from '@axe-core/playwright'
import { expect, test } from '@playwright/test'

const ORGANIZER_EMAIL = process.env.ORGANIZER_EMAIL ?? 'organizer@matchpulse.local'
const ORGANIZER_PASSWORD = process.env.ORGANIZER_PASSWORD ?? 'matchpulse-organizer'
const CLUB_EMAIL = process.env.CLUB_EMAIL ?? 'club@matchpulse.local'
const CLUB_PASSWORD = process.env.CLUB_PASSWORD ?? 'matchpulse-club'

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

test('fan page has no serious or critical accessibility violations', async ({ page }) => {
  await page.goto('/login')
  await page.getByRole('button', { name: 'Continue as fan' }).click()
  await expect(page.getByRole('heading', { name: 'Fan home' })).toBeVisible()
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

test('club page has no serious or critical accessibility violations', async ({ page }) => {
  await page.goto('/login')
  await page.getByRole('button', { name: 'Club' }).click()
  await page.getByLabel('Club email').fill(CLUB_EMAIL)
  await page.getByLabel('Password').fill(CLUB_PASSWORD)
  await page.getByRole('button', { name: 'Sign in as club' }).click()
  await expect(page.getByRole('heading', { name: 'Club analytics' })).toBeVisible()
  await assertNoCriticalViolations(page)
})
