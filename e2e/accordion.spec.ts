import { expect, test } from '@playwright/test'

import { completeOnboarding } from './helpers'

// NBD-21: checklist areas are accordions — open by default, collapsible, and the header
// count stays live even while the body is hidden.

test('areas collapse and the header count stays live', async ({ page }) => {
  await page.goto('/')
  await completeOnboarding(page)

  // Open by default.
  await expect(page.getByTestId('area-items-prayers')).toBeVisible()
  await expect(page.getByTestId('area-count-prayers')).toHaveText('٠/٥')

  // Checking an item updates the header count.
  await page.getByTestId('wird-item-fajr').click()
  await expect(page.getByTestId('area-count-prayers')).toHaveText('١/٥')

  // Collapse hides the items but keeps the header + count.
  await page.getByTestId('area-header-prayers').click()
  await expect(page.getByTestId('area-items-prayers')).toHaveCount(0)
  await expect(page.getByTestId('area-count-prayers')).toHaveText('١/٥')

  // Re-open restores the items with state intact.
  await page.getByTestId('area-header-prayers').click()
  await expect(page.getByTestId('wird-item-fajr')).toHaveAttribute('aria-pressed', 'true')
})
