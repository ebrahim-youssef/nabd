import { expect, test } from '@playwright/test'

// NBD-7: a checked wird item is stored in Dexie (IndexedDB), so it survives a reload without
// any server round-trip re-fetching state — the checklist rehydrates from local data.
test('checked wird item persists across a reload', async ({ page }) => {
  await page.goto('/')

  const fajr = page.getByTestId('wird-item-fajr')
  await expect(fajr).toBeVisible()

  await fajr.click()
  await expect(fajr).toHaveAttribute('aria-pressed', 'true')

  await page.reload()

  // State comes back from Dexie, not the network.
  await expect(page.getByTestId('wird-item-fajr')).toHaveAttribute('aria-pressed', 'true')
  await expect(page.getByTestId('wird-item-dhuhr')).toHaveAttribute('aria-pressed', 'false')
})

// The stricter "fully offline reload with zero network requests" path needs the Serwist service
// worker to serve the cached app shell while offline. That ships in NBD-15 (PWA); until then a
// reload with the network cut can't fetch the HTML document. Enable this once the SW lands.
test.fixme('checked item persists across a fully offline reload (needs NBD-15 SW)', async ({
  page,
  context,
}) => {
  await page.goto('/')
  await page.getByTestId('wird-item-fajr').click()

  await context.setOffline(true)
  let requests = 0
  page.on('request', () => {
    requests += 1
  })
  await page.reload()

  await expect(page.getByTestId('wird-item-fajr')).toHaveAttribute('aria-pressed', 'true')
  expect(requests).toBe(0)
})
