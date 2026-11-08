import { expect, test } from '@playwright/test'

const ORGANIZER_EMAIL = process.env.ORGANIZER_EMAIL ?? 'organizer@matchpulse.local'
const ORGANIZER_PASSWORD = process.env.ORGANIZER_PASSWORD ?? 'matchpulse-organizer'
const CLUB_EMAIL = process.env.CLUB_EMAIL ?? 'club@matchpulse.local'
const CLUB_PASSWORD = process.env.CLUB_PASSWORD ?? 'matchpulse-club'

test('fan can claim a ticket, register, view the portfolio and redeem a reward', async ({ page }) => {
  await page.goto('/login')
  await page.getByRole('button', { name: 'Continue as fan' }).click()
  await expect(page.getByRole('heading', { name: 'Fan home' })).toBeVisible()

  await page.getByRole('link', { name: 'Open tournament' }).first().click()
  await expect(page.getByRole('button', { name: 'Claim ticket' })).toBeVisible()
  await page.getByRole('button', { name: 'Claim ticket' }).click()
  await expect(page.getByText(/Ticket claimed/)).toBeVisible()

  await page.getByRole('button', { name: 'Register' }).click()
  await expect(page.getByText('Your place is confirmed.')).toBeVisible()

  await page.goto('/fan/portfolio')
  await expect(page.getByRole('heading', { name: 'Portfolio' })).toBeVisible()

  await page.goto('/fan/rewards')
  await expect(page.getByRole('heading', { name: 'Rewards' })).toBeVisible()
  await page.getByRole('button', { name: /Redeem for 100 pts/ }).first().click()
  await expect(page.getByText(/Reward redeemed\. Code:/)).toBeVisible()
})

test('organizer can create a tournament, create a match, update it and resolve the market', async ({ page }) => {
  await page.goto('/login')
  await page.getByRole('tab', { name: 'Organizer' }).click()
  await page.getByLabel('Organizer email').fill(ORGANIZER_EMAIL)
  await page.getByLabel('Password').fill(ORGANIZER_PASSWORD)
  await page.getByRole('button', { name: 'Sign in as organizer' }).click()
  await expect(page.getByRole('heading', { name: 'Organizer dashboard' })).toBeVisible()

  const name = `E2E Cup ${Date.now()}`
  await page.getByLabel('Name').fill(name)
  await page.getByLabel('Participant capacity').fill('8')
  await page.getByLabel('Ticket allocation').fill('10')
  await page.getByLabel('Points per ticket').fill('50')
  await page.getByRole('button', { name: 'Create tournament' }).click()
  await expect(page.getByText(name)).toBeVisible()

  const card = page.locator('article').filter({ hasText: name })
  await card.getByRole('link', { name: 'Manage' }).click()
  await expect(page.getByRole('heading', { name })).toBeVisible()

  await page.getByLabel('Home team').fill('E2E Home')
  await page.getByLabel('Away team').fill('E2E Away')
  await page.getByLabel('Kickoff').fill('2026-11-08T10:00')
  await page.getByRole('button', { name: 'Create match and market' }).click()
  await expect(page.getByText('E2E Home vs E2E Away')).toBeVisible()

  await page.getByLabel('Home', { exact: true }).fill('1')
  await page.getByLabel('Away', { exact: true }).fill('0')
  await page.getByLabel('Status').selectOption('FINISHED')
  await page.getByRole('button', { name: 'Save match' }).click()
  await expect(page.getByText('Match updated.')).toBeVisible()

  await page.getByLabel('Winner').selectOption('HOME')
  await page.getByRole('button', { name: 'Resolve market' }).click()
  await expect(page.getByText('Market resolved.')).toBeVisible()
})

test('club can view aggregate analytics and export CSV', async ({ page }) => {
  await page.goto('/login')
  await page.getByRole('tab', { name: 'Club' }).click()
  await page.getByLabel('Club email').fill(CLUB_EMAIL)
  await page.getByLabel('Password').fill(CLUB_PASSWORD)
  await page.getByRole('button', { name: 'Sign in as club' }).click()
  await expect(page.getByRole('heading', { name: 'Club analytics' })).toBeVisible()
  await expect(page.getByRole('columnheader', { name: 'Traders' })).toBeVisible()

  const response = await page.request.get('/api/club/export')
  expect(response.status()).toBe(200)
  expect(response.headers()['content-type']).toContain('text/csv')
  expect(await response.text()).toContain('match_id,home_team,away_team')
})
