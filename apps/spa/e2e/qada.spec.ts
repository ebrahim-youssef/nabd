import { expect, test } from '@playwright/test'

import { collectPageFailures, seedOnboarding } from './helpers'

test('adding a debt distributes it and payments decrement per prayer', async ({ page }) => {
  const failures = collectPageFailures(page)
  await seedOnboarding(page)
  await page.getByTestId('nav-stats').click()
  await page.getByTestId('qada-link').click()
  await expect(page.getByTestId('qada-ledger')).toBeVisible()

  await page.getByTestId('qada-add').click()
  await expect(page.getByTestId('qada-modal')).toBeVisible()
  await page.getByTestId('qada-days').fill('3')
  await expect(page.getByTestId('qada-total')).toContainText('٣')
  await page.getByTestId('qada-confirm').click()

  for (const prayer of ['fajr', 'dhuhr', 'asr', 'maghrib', 'isha']) {
    await expect(page.getByTestId(`qada-count-${prayer}`)).toContainText('٣')
  }

  await page.getByTestId('qada-pay-fajr').click()
  await expect(page.getByTestId('qada-count-fajr')).toContainText('فائتتان')
  await expect(page.getByTestId('qada-count-dhuhr')).toContainText('٣')

  await page.reload()
  await expect(page.getByTestId('qada-count-fajr')).toContainText('فائتتان')
  await expect(page.getByTestId('qada-count-isha')).toContainText('٣')
  expect(failures).toEqual([])
})

test('the year/month factors compute the total from the statistics link', async ({ page }) => {
  const failures = collectPageFailures(page)
  await seedOnboarding(page)
  await page.getByTestId('nav-stats').click()
  await page.getByTestId('qada-link').click()
  await expect(page).toHaveURL(/\/app\/qada$/)

  await page.getByTestId('qada-add').click()
  await page.getByTestId('qada-years').fill('1')
  await page.getByTestId('qada-months').fill('1')
  await page.getByTestId('qada-days').fill('1')
  await expect(page.getByTestId('qada-total')).toContainText('٣٩٦')
  expect(failures).toEqual([])
})
