import { expect, test } from '@playwright/test'

import { completeOnboarding } from './helpers'

// NBD-27: with location granted, every prayer shows its adhan time and the live sub-header
// announces/counts down. Cairo coordinates.
test.use({
  permissions: ['geolocation'],
  geolocation: { latitude: 30.0444, longitude: 31.2357 },
})

test('prayer times appear after enabling location', async ({ page }) => {
  await page.goto('/')
  await completeOnboarding(page, { prayers: 'struggling', quran: 'rarely', adhkar: 'rarely' })
  await expect(page.getByTestId('wird-checklist')).toBeVisible()

  // No cached coords yet → the quiet prompt shows; tapping it resolves instantly (granted).
  await page.getByTestId('enable-location').click()

  await expect(page.getByTestId('prayer-status')).toBeVisible()
  await expect(page.getByTestId('prayer-status')).toHaveText(/أذّن|باقي|الشروق/)

  // Each prayer row carries its time.
  for (const prayer of ['fajr', 'dhuhr', 'asr', 'maghrib', 'isha']) {
    await expect(page.getByTestId(`prayer-time-${prayer}`)).toBeVisible()
  }
})

test('cached location survives a reload without re-prompting', async ({ page }) => {
  await page.goto('/')
  await completeOnboarding(page, { prayers: 'struggling', quran: 'rarely', adhkar: 'rarely' })
  await page.getByTestId('enable-location').click()
  await expect(page.getByTestId('prayer-status')).toBeVisible()

  await page.reload()

  await expect(page.getByTestId('prayer-status')).toBeVisible()
  await expect(page.getByTestId('enable-location')).toHaveCount(0)
})

test('the sub-header stays visible while the prayers accordion is collapsed', async ({ page }) => {
  await page.goto('/')
  await completeOnboarding(page, { prayers: 'struggling', quran: 'rarely', adhkar: 'rarely' })
  await page.getByTestId('enable-location').click()
  await expect(page.getByTestId('prayer-status')).toBeVisible()

  await page.getByTestId('area-header-prayers').click()
  await expect(page.getByTestId('area-items-prayers')).toHaveCount(0)
  await expect(page.getByTestId('prayer-status')).toBeVisible()
})
