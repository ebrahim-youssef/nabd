import { expect, test } from '@playwright/test'

import { completeOnboarding } from './helpers'

// NBD-7 + NBD-15: a checked wird item is stored in Dexie and the Serwist service worker caches
// the app shell, so the checklist survives a reload — including a fully offline one. Each spec
// first answers the onboarding questionnaire (NBD-6), which seeds the wird.

test('checked wird item persists across a reload', async ({ page }) => {
  await page.goto('/')
  await completeOnboarding(page)

  const fajr = page.getByTestId('wird-item-fajr')
  await expect(fajr).toBeVisible()

  await fajr.click()
  await expect(fajr).toHaveAttribute('aria-pressed', 'true')

  await page.reload()

  // State comes back from Dexie, not the server.
  await expect(page.getByTestId('wird-item-fajr')).toHaveAttribute('aria-pressed', 'true')
  await expect(page.getByTestId('wird-item-dhuhr')).toHaveAttribute('aria-pressed', 'false')
})

test('checked item persists across a fully offline reload', async ({ page, context }) => {
  await page.goto('/')
  await completeOnboarding(page)

  // Wait until the service worker is controlling the page, so an offline reload can be served
  // from its cache.
  await page.waitForFunction(() => navigator.serviceWorker?.controller != null, null, {
    timeout: 20_000,
  })

  const fajr = page.getByTestId('wird-item-fajr')
  await fajr.click()
  await expect(fajr).toHaveAttribute('aria-pressed', 'true')

  await context.setOffline(true)
  await page.reload()

  // The shell loads from the SW cache and the checked state loads from Dexie — all offline.
  await expect(page.getByTestId('wird-item-fajr')).toHaveAttribute('aria-pressed', 'true')

  await context.setOffline(false)
})
