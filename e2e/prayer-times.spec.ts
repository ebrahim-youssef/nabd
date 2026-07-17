import { expect, test } from '@playwright/test'

import { completeOnboarding } from './helpers'

// NBD-27: with location granted, every prayer shows its adhan time and the live sub-header
// announces/counts down. Cairo coordinates.
const CAIRO = { latitude: 30.0444, longitude: 31.2357 }

test.use({
  permissions: ['geolocation'],
  geolocation: CAIRO,
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

// NBD-50 (r6 §2, amended): the dedicated page is reachable from its own bottom-nav tab,
// even before location is granted.
test('the bottom nav links to the dedicated prayer-times page', async ({ page }) => {
  await page.goto('/')
  await page.getByTestId('nav-prayer-times').click()
  await expect(page).toHaveURL(/\/prayer-times$/)
  await expect(page.getByRole('heading', { name: 'مواقيت الصلاة' })).toBeVisible()
})

// NBD-38: the dedicated مواقيت الصلاة page + the calculation-method picker. Coordinates are
// seeded straight into the device cache — the page needs no onboarding and no prompt.
test.describe('dedicated page + method picker', () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript((coords) => {
      window.localStorage.setItem('nabd:coords', JSON.stringify(coords))
    }, CAIRO)
  })

  test('the page lists the six day points with times', async ({ page }) => {
    await page.goto('/prayer-times')

    await expect(page.getByTestId('prayer-times-today')).toBeVisible()
    for (const id of ['fajr', 'sunrise', 'dhuhr', 'asr', 'maghrib', 'isha']) {
      const row = page.getByTestId(`time-row-${id}`)
      await expect(row).toBeVisible()
      // Arabic-Indic wall time like ٤:١٢ ص.
      await expect(row).toContainText(/[٠-٩]+:[٠-٩]+/)
    }
  })

  test('changing the calculation method changes the computed fajr and persists', async ({
    page,
  }) => {
    await page.goto('/prayer-times')
    const fajrBefore = await page.getByTestId('time-row-fajr').innerText()

    await page.goto('/settings')
    await page.getByTestId('method-umm_al_qura').click()
    await expect(page.getByTestId('method-umm_al_qura')).toHaveAttribute('aria-pressed', 'true')

    await page.goto('/prayer-times')
    await expect(page.getByTestId('time-row-fajr')).toBeVisible()
    const fajrAfter = await page.getByTestId('time-row-fajr').innerText()
    expect(fajrAfter).not.toBe(fajrBefore)

    // Persisted: a reload keeps the picked method.
    await page.reload()
    await expect(page.getByTestId('time-row-fajr')).toBeVisible()
    expect(await page.getByTestId('time-row-fajr').innerText()).toBe(fajrAfter)
  })
})
