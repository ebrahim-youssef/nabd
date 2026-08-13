import { expect, test } from '@playwright/test'

import { collectPageFailures, seedOnboarding } from './helpers'

const CAIRO_COORDS = { latitude: 30.0444, longitude: 31.2357 }

test.describe('settings', () => {
  test.use({ permissions: ['geolocation'], geolocation: CAIRO_COORDS })

  test('persists the modern display mode', async ({ page }) => {
    const failures = collectPageFailures(page)
    await seedOnboarding(page)
    await page.goto('/app/settings')

    await page.getByTestId('mode-modern').click()
    await expect(page.locator('html')).toHaveAttribute('data-mode', 'modern')
    await page.reload()
    await expect(page.locator('html')).toHaveAttribute('data-mode', 'modern')
    expect(failures).toEqual([])
  })

  test('starts the selected wird level tomorrow without changing today', async ({ page }) => {
    const failures = collectPageFailures(page)
    await seedOnboarding(page)
    await page.goto('/app')
    const todayItems = await page
      .locator('[data-testid^="wird-item-"]')
      .evaluateAll((items) => items.map((item) => item.getAttribute('data-testid')))

    await page.goto('/app/settings')
    await page.getByTestId('wird-level-select').selectOption('level-2')
    await expect(page.getByTestId('level-hint')).toBeVisible()
    // The select reflects the newest stored version, so this is the signal that the write landed.
    // Without it the assertions below would also pass if nothing had been written at all, which is
    // the wrong reason to be green.
    await expect(page.getByTestId('wird-level-select')).toHaveValue('level-2')
    await page.goto('/app')

    await expect(page.locator('[data-testid^="wird-item-"]')).toHaveCount(todayItems.length)
    const itemsAfterChange = await page
      .locator('[data-testid^="wird-item-"]')
      .evaluateAll((items) => items.map((item) => item.getAttribute('data-testid')))
    expect(itemsAfterChange).toEqual(todayItems)
    expect(failures).toEqual([])
  })

  test('enables location from settings', async ({ page }) => {
    const failures = collectPageFailures(page)
    await seedOnboarding(page)
    await page.goto('/app/settings')

    await page.getByTestId('enable-location-settings').click()
    await expect(page.getByTestId('location-granted')).toBeVisible()
    expect(failures).toEqual([])
  })

  test('changes Fajr live with Umm al-Qura and persists it', async ({ page }) => {
    const failures = collectPageFailures(page)
    await seedOnboarding(page)
    await page.goto('/app/settings')
    await page.getByTestId('enable-location-settings').click()
    await expect(page.getByTestId('location-granted')).toBeVisible()

    await page.goto('/app/prayer-times')
    const egyptianFajr = await page.getByTestId('time-value-fajr').textContent()
    await page.goto('/app/settings')
    await page.getByTestId('method-umm_al_qura').click()
    await page.goto('/app/prayer-times')
    const ummAlQuraFajr = await page.getByTestId('time-value-fajr').textContent()

    expect(ummAlQuraFajr).not.toBe(egyptianFajr)
    await page.reload()
    await expect(page.getByTestId('time-value-fajr')).toHaveText(ummAlQuraFajr ?? '')
    expect(failures).toEqual([])
  })
})
