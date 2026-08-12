import { expect, test } from '@playwright/test'
import type { Page } from '@playwright/test'

import { ADHKAR_LIBRARY, INTENTIONS_LIBRARY, WIRD_LEVELS } from '@nabd/shared'

import { seedOnboarding } from './helpers'

const MORNING = ADHKAR_LIBRARY.find((category) => category.id === 'morning')!
const LINKED_ITEM = WIRD_LEVELS[0].wird.items.find((item) => item.id === 'morning-adhkar')!

test('library routes are available before onboarding and hub links open both libraries', async ({
  page,
}) => {
  await page.goto('/app/libraries')
  await expect(page.getByTestId('libraries-hub')).toBeVisible()
  await page.getByRole('link', { name: /مكتبة الأذكار/ }).click()
  await expect(page.getByTestId('adhkar-tabs')).toBeVisible()
  await page.goto('/app/niyyat')
  await expect(page.getByTestId(`deed-${INTENTIONS_LIBRARY[0].id}`)).toBeVisible()
})

// Finishing the morning category takes 374 taps across 31 adhkar. One Playwright click per tap is
// 374 round-trips and blows the test timeout, so the taps are driven inside the page — still real
// DOM clicks on the real element, batched so React can flush between chunks. The card is re-queried
// every chunk because the flow replaces it as it advances, and it disappears once the flow finishes.
async function tapCard(page: Page, times: number) {
  const CHUNK = 25
  for (let done = 0; done < times; done += CHUNK) {
    const batch = Math.min(CHUNK, times - done)
    await page.evaluate((taps) => {
      for (let tap = 0; tap < taps; tap += 1) {
        document.querySelector<HTMLElement>('[data-testid="flow-active-card"]')?.click()
      }
    }, batch)
    await page.waitForTimeout(40)
  }
}

test('once-daily adhkar resumes across reload and completion checks its linked wird item', async ({
  page,
}) => {
  test.slow()
  await seedOnboarding(page)
  await page.goto('/app/adhkar?tab=morning')

  const count = page.getByTestId('flow-count')

  // Tap counts come from the content, never from a literal: the first morning dhikr has a repeat of
  // one, so a single tap completes it and advances to the next — asserting "١" after one tap would
  // be asserting the wrong thing.
  const tapsToClearFirst = MORNING.items[0].repeat
  await tapCard(page, tapsToClearFirst + 1)

  // The extra tap leaves a genuine mid-dhikr position for the reload to restore.
  const positionBeforeReload = await count.textContent()
  await page.reload()
  await expect(count).toHaveText(positionBeforeReload!)

  // Finish the category: every remaining tap across every remaining dhikr.
  const totalTaps = MORNING.items.reduce((sum, dhikr) => sum + dhikr.repeat, 0)
  await tapCard(page, totalTaps - tapsToClearFirst - 1)

  await expect(page.getByTestId('flow-finished')).toBeVisible()
  await page.goto('/app')
  await expect(page.getByTestId(`wird-item-${LINKED_ITEM.id}`)).toHaveAttribute(
    'aria-pressed',
    'true',
  )
})
