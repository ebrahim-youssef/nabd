import { expect, test } from '@playwright/test'

import { collectPageFailures, seedOnboarding } from './helpers'

test('renders the statistics surfaces after a check-off', async ({ page }) => {
  const failures = collectPageFailures(page)
  await seedOnboarding(page)
  await page.getByTestId('wird-item-fajr').click()
  await page.getByTestId('nav-stats').click()

  await expect(page.getByTestId('streak-card')).toBeVisible()
  await expect(page.getByTestId('week-chart')).toBeVisible()
  await expect(page.getByTestId('tile-completion')).toBeVisible()
  await expect(page.getByTestId('tile-best-streak')).toBeVisible()
  const bars = await page.getByTestId('week-chart').locator('[data-testid^="bar-"]').count()
  expect(bars).toBeGreaterThanOrEqual(1)
  expect(bars).toBeLessThanOrEqual(7)
  expect(failures).toEqual([])
})

test('exports a week as a date-named JSON file', async ({ page }) => {
  const failures = collectPageFailures(page)
  await seedOnboarding(page)
  await page.getByTestId('nav-stats').click()

  const downloadPromise = page.waitForEvent('download')
  await page.getByTestId('export-week').click()
  const download = await downloadPromise

  expect(download.suggestedFilename()).toMatch(/^nabd-week-\d{4}-\d{2}-\d{2}\.json$/)
  expect(failures).toEqual([])
})

test('keeps a historical completion under the version that governed its day', async ({ page }) => {
  const failures = collectPageFailures(page)
  await seedOnboarding(page)
  const { firstDayId, secondDayId } = await page.evaluate(() => {
    function dayId(date: Date): string {
      return [
        date.getFullYear(),
        String(date.getMonth() + 1).padStart(2, '0'),
        String(date.getDate()).padStart(2, '0'),
      ].join('-')
    }
    const firstDay = new Date()
    firstDay.setDate(firstDay.getDate() - 2)
    const secondDay = new Date()
    secondDay.setDate(secondDay.getDate() - 1)
    return { firstDayId: dayId(firstDay), secondDayId: dayId(secondDay) }
  })

  await page.evaluate(
    async ({ firstDayId, secondDayId }) => {
      const database = await new Promise<IDBDatabase>((resolve, reject) => {
        const request = indexedDB.open('nabd')
        request.onsuccess = () => resolve(request.result)
        request.onerror = () => reject(request.error)
      })
      await new Promise<void>((resolve, reject) => {
        const transaction = database.transaction(['wirdVersions', 'wirdEntries'], 'readwrite')
        const versions = transaction.objectStore('wirdVersions')
        const entries = transaction.objectStore('wirdEntries')
        versions.clear()
        entries.clear()
        versions.add({
          id: 'first-version',
          effectiveFrom: firstDayId,
          createdAt: 1,
          definition: {
            areas: [{ id: 'area', label: 'الأولى', order: 0 }],
            items: [{ id: 'first-item', areaId: 'area', label: 'الأول', kind: 'checkbox' }],
          },
        })
        versions.add({
          id: 'second-version',
          effectiveFrom: secondDayId,
          createdAt: 2,
          definition: {
            areas: [{ id: 'area', label: 'الثانية', order: 0 }],
            items: [
              { id: 'first-item', areaId: 'area', label: 'الأول', kind: 'checkbox' },
              { id: 'second-item', areaId: 'area', label: 'الثاني', kind: 'checkbox' },
            ],
          },
        })
        entries.add({
          id: 'first-entry',
          day: firstDayId,
          versionId: 'first-version',
          itemId: 'first-item',
          done: true,
          at: 3,
        })
        transaction.oncomplete = () => resolve()
        transaction.onerror = () => reject(transaction.error)
        transaction.onabort = () => reject(transaction.error)
      })
      database.close()
    },
    { firstDayId, secondDayId },
  )
  // Direct IndexedDB seeding bypasses Dexie's live-query notification channel; reopen it on reload.
  await page.reload()
  await page.getByTestId('nav-stats').click()

  // Full height is the whole point: the first day had one item and it was done. Were the figure
  // computed against the version in force *now* — two items — the bar would stand at 50%. Matched
  // loosely so an unrelated inline style added later cannot fail this for the wrong reason.
  await expect(page.getByTestId(`bar-${firstDayId}`)).toHaveAttribute('style', /block-size:\s*100%/)
  expect(failures).toEqual([])
})
