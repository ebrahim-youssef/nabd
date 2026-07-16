import { expect, test } from '@playwright/test'

import { completeOnboarding } from './helpers'

// NBD-22: fixed bottom navbar — stats / home / libraries — and the stats page.

test('stats live on their own page reached from the navbar', async ({ page }) => {
  await page.goto('/')
  await completeOnboarding(page)

  // Stats are no longer inlined on home.
  await expect(page.getByTestId('wird-stats')).toHaveCount(0)

  await page.getByTestId('nav-stats').click()
  await expect(page).toHaveURL(/\/stats$/)
  await expect(page.getByTestId('wird-stats')).toBeVisible()

  // Home tab returns to the checklist.
  await page.getByTestId('nav-home').click()
  await expect(page.getByTestId('wird-checklist')).toBeVisible()
})

test('navbar is fixed within the viewport', async ({ page }) => {
  await page.goto('/')
  const nav = page.getByTestId('bottom-nav')
  await expect(nav).toBeVisible()
  const box = await nav.boundingBox()
  const viewport = page.viewportSize()
  expect(box && viewport && box.y + box.height <= viewport.height + 1).toBeTruthy()
})
