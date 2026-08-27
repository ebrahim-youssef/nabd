import { expect, test } from '@playwright/test'

import { WIRD_COPY } from '@nabd/shared'

import { collectPageFailures, seedOnboarding } from './helpers'

// Completing today's wird through the UI is not viable here: the five daily adhkar are counter items
// and each needs its full target in taps. The entries are seeded directly instead — the same approach
// the statistics history fixture takes — and the celebration then appears on the next load.
async function completeTodayInStore(page: import('@playwright/test').Page) {
  await page.evaluate(async () => {
    const now = new Date()
    const day = [
      now.getFullYear(),
      String(now.getMonth() + 1).padStart(2, '0'),
      String(now.getDate()).padStart(2, '0'),
    ].join('-')

    const database = await new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open('nabd')
      request.onsuccess = () => resolve(request.result)
      request.onerror = () => reject(request.error)
    })

    const versions = await new Promise<
      {
        id: string
        effectiveFrom: string
        definition: { items: { id: string; optional?: boolean }[] }
      }[]
    >((resolve, reject) => {
      const request = database
        .transaction('wirdVersions', 'readonly')
        .objectStore('wirdVersions')
        .getAll()
      request.onsuccess = () => resolve(request.result)
      request.onerror = () => reject(request.error)
    })
    // The version onboarding seeded, rather than one this fixture invents, so the item ids match the
    // checklist the user is actually looking at.
    const inForce = versions
      .filter((version) => version.effectiveFrom <= day)
      .sort((a, b) => (a.effectiveFrom < b.effectiveFrom ? 1 : -1))[0]
    if (!inForce) throw new Error('no wird version in force to complete')

    await new Promise<void>((resolve, reject) => {
      const transaction = database.transaction('wirdEntries', 'readwrite')
      const store = transaction.objectStore('wirdEntries')
      for (const item of inForce.definition.items.filter((candidate) => !candidate.optional)) {
        store.add({
          id: `seed-${item.id}`,
          day,
          versionId: inForce.id,
          itemId: item.id,
          done: true,
          at: Date.now(),
        })
      }
      transaction.oncomplete = () => resolve()
      transaction.onerror = () => reject(transaction.error)
      transaction.onabort = () => reject(transaction.error)
    })
    database.close()
  })
}

test.describe('sharing', () => {
  test.use({ permissions: ['clipboard-read', 'clipboard-write'] })

  test('shares the completion through the clipboard when there is no share sheet', async ({
    page,
  }) => {
    const failures = collectPageFailures(page)
    // A headless browser has no share sheet to complete, so the clipboard fallback is the only route
    // a browser test can actually observe. Removed explicitly rather than assumed absent.
    await page.addInitScript(() => {
      Object.defineProperty(navigator, 'share', { value: undefined, configurable: true })
    })
    await seedOnboarding(page)
    await completeTodayInStore(page)
    await page.reload()

    await expect(page.getByTestId('completion-celebration')).toBeVisible({ timeout: 10_000 })
    await page.getByTestId('celebration-share').click()

    await expect(page.getByTestId('celebration-copied')).toBeVisible()
    // The confirmation is only worth anything if the text really landed on the clipboard.
    const clipboard = await page.evaluate(() => navigator.clipboard.readText())
    expect(clipboard).toBe(WIRD_COPY.celebrationShareText)
    expect(failures).toEqual([])
  })
})
