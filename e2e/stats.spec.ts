import { expect, test } from '@playwright/test'

import { completeOnboarding } from './helpers'

// NBD-31: the stats page carries the streak card, weekly bars, completion tiles, and a
// week/month export of the user's own data.

test('stats v2 renders streak, chart, and tiles', async ({ page }) => {
  await page.goto('/')
  await completeOnboarding(page, { prayers: 'struggling', quran: 'rarely', adhkar: 'rarely' })
  await page.getByTestId('wird-item-fajr').click()

  await page.getByTestId('nav-stats').click()

  await expect(page.getByTestId('streak-card')).toBeVisible()
  await expect(page.getByTestId('week-chart')).toBeVisible()
  await expect(page.getByTestId('tile-completion')).toBeVisible()
  await expect(page.getByTestId('tile-best-streak')).toBeVisible()
  // A fresh user has a wird in force only from today, so the chart carries 1–7 day bars.
  const bars = await page.getByTestId('week-chart').locator('[data-testid^="bar-"]').count()
  expect(bars).toBeGreaterThanOrEqual(1)
  expect(bars).toBeLessThanOrEqual(7)
})

test('exporting a week downloads the data file', async ({ page }) => {
  await page.goto('/')
  await completeOnboarding(page, { prayers: 'struggling', quran: 'rarely', adhkar: 'rarely' })
  await page.getByTestId('nav-stats').click()
  await expect(page.getByTestId('export-week')).toBeVisible()

  const downloadPromise = page.waitForEvent('download')
  await page.getByTestId('export-week').click()
  const download = await downloadPromise

  expect(download.suggestedFilename()).toMatch(/^nabd-week-\d{4}-\d{2}-\d{2}\.json$/)
})
