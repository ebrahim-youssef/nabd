import { expect, test } from '@playwright/test'

import { collectPageFailures, seedOnboarding } from './helpers'

const CAIRO_COORDS = { latitude: 30.0444, longitude: 31.2357 }
const prayerIds = ['fajr', 'sunrise', 'dhuhr', 'asr', 'maghrib', 'isha']

test.describe('prayer times', () => {
  test.use({ permissions: ['geolocation'], geolocation: CAIRO_COORDS })

  test('enables location and renders all day rows', async ({ page }) => {
    const failures = collectPageFailures(page)
    await seedOnboarding(page)
    await page.goto('/app/prayer-times')

    await page.getByTestId('enable-location-page').click()
    for (const id of prayerIds) await expect(page.getByTestId(`time-row-${id}`)).toBeVisible()
    expect(failures).toEqual([])
  })

  test('uses cached coordinates after reload without another grant', async ({ page }) => {
    const failures = collectPageFailures(page)
    await seedOnboarding(page)
    await page.goto('/app/prayer-times')
    await page.getByTestId('enable-location-page').click()
    await expect(page.getByTestId('prayer-times-today')).toBeVisible()

    await page.reload()

    await expect(page.getByTestId('prayer-times-today')).toBeVisible()
    expect(failures).toEqual([])
  })

  test('persists the Umm al-Qura calculation method and changes Fajr', async ({ page }) => {
    // The picker itself lands with the settings screen; seeding the stored preference covers the
    // durable half — that a non-default method survives a reload and moves the calculation.
    await page.addInitScript(() => {
      if (!localStorage.getItem('nabd:calc-method')) {
        localStorage.setItem('nabd:calc-method', 'umm_al_qura')
      }
    })
    const failures = collectPageFailures(page)
    await seedOnboarding(page)
    await page.goto('/app/prayer-times')
    await page.getByTestId('enable-location-page').click()
    // The value alone, not the whole row: the row text also carries the label and the الآن/التالي
    // chip, which moves with the wall clock and would make this assertion flake.
    const ummAlQuraFajr = await page.getByTestId('time-value-fajr').textContent()

    await page.reload()
    await expect(page.getByTestId('time-value-fajr')).toHaveText(ummAlQuraFajr ?? '')

    await page.evaluate(() => localStorage.setItem('nabd:calc-method', 'egyptian'))
    await page.reload()
    await expect(page.getByTestId('time-value-fajr')).not.toHaveText(ummAlQuraFajr ?? '')
    expect(failures).toEqual([])
  })

  test('opens the dedicated page from the checklist status line', async ({ page }) => {
    const failures = collectPageFailures(page)
    await seedOnboarding(page)
    await page.goto('/app')
    await page.getByTestId('enable-location').click()

    // The per-prayer badge keys off the wird item id, so this also pins the contract that the five
    // prayer items carry bare prayer ids — a prefixed id would leave the badge silently empty.
    await expect(page.getByTestId('prayer-time-fajr')).toBeVisible()

    await page.getByTestId('prayer-status').click()

    await expect(page).toHaveURL(/\/app\/prayer-times$/)
    expect(failures).toEqual([])
  })
})
