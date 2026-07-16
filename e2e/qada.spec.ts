import { expect, test } from '@playwright/test'

// NBD-39 (ADR-0010): estimate a missed period → per-prayer counters; each تم القضاء tap
// pays one prayer down; everything survives an offline-style reload (Dexie).

test('adding a debt distributes it and payments decrement per prayer', async ({ page }) => {
  await page.goto('/qada')
  await expect(page.getByTestId('qada-ledger')).toBeVisible()

  // Add ٣ days via the modal.
  await page.getByTestId('qada-add').click()
  await expect(page.getByTestId('qada-modal')).toBeVisible()
  await page.getByTestId('qada-days').fill('3')
  await expect(page.getByTestId('qada-total')).toContainText('٣')
  await page.getByTestId('qada-confirm').click()

  // Every prayer carries the debt.
  for (const prayer of ['fajr', 'dhuhr', 'asr', 'maghrib', 'isha']) {
    await expect(page.getByTestId(`qada-count-${prayer}`)).toContainText('٣')
  }

  // Paying fajr once drops only fajr (٢ renders as the Arabic dual).
  await page.getByTestId('qada-pay-fajr').click()
  await expect(page.getByTestId('qada-count-fajr')).toContainText('فائتتان')
  await expect(page.getByTestId('qada-count-dhuhr')).toContainText('٣')

  // Dexie persistence: the ledger survives a reload.
  await page.reload()
  await expect(page.getByTestId('qada-count-fajr')).toContainText('فائتتان')
  await expect(page.getByTestId('qada-count-isha')).toContainText('٣')
})

test('the year/month factors compute the total and the stats page links here', async ({ page }) => {
  await page.goto('/stats')
  await page.getByTestId('qada-link').click()
  await expect(page).toHaveURL(/\/qada$/)

  await page.getByTestId('qada-add').click()
  await page.getByTestId('qada-years').fill('1')
  await page.getByTestId('qada-months').fill('1')
  await page.getByTestId('qada-days').fill('1')
  // ١ سنة + ١ شهر + ١ يوم = ٣٩٦ يومًا.
  await expect(page.getByTestId('qada-total')).toContainText('٣٩٦')
})
