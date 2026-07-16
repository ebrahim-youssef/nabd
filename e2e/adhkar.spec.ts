import { expect, test } from '@playwright/test'

// NBD-12 + NBD-29: the adhkar page is browsable without a wird, organized as tabs, and runs
// the guided counter flow — tap the active card to count; hitting the target auto-advances
// and resets the counter.

test('adhkar tabs are browsable without a wird', async ({ page }) => {
  await page.goto('/adhkar')

  await expect(page.getByTestId('adhkar-tabs')).toBeVisible()
  await expect(page.getByTestId('flow-active-card')).toBeVisible()
  // No questionnaire involved on this page.
  await expect(page.getByTestId('onboarding-questionnaire')).toHaveCount(0)

  // Switching tabs swaps the category and resets the flow.
  await page.getByTestId('adhkar-tab-evening').click()
  await expect(page.getByTestId('adhkar-tab-evening')).toHaveAttribute('aria-selected', 'true')
  await expect(page.getByTestId('flow-count')).toContainText('٠')
})

test('tapping the active card counts, auto-advances, and resets', async ({ page }) => {
  await page.goto('/adhkar?tab=morning')

  const card = page.getByTestId('flow-active-card')
  const firstText = await card.innerText()

  // First morning dhikr repeats once: a single tap advances to the next card.
  await card.click()
  await expect(card).not.toHaveText(firstText)
  await expect(page.getByTestId('flow-count')).toContainText('٠')

  // Second dhikr repeats ×3: two taps keep it active, the third advances.
  await card.click()
  await card.click()
  await expect(page.getByTestId('flow-count')).toContainText('٢')
  const secondText = await card.innerText()
  await card.click()
  await expect(card).not.toHaveText(secondText)

  // The strip previews upcoming adhkar (three at most).
  const strip = page.getByTestId('flow-strip')
  await expect(strip).toBeVisible()
  expect(await strip.locator('li').count()).toBeLessThanOrEqual(3)
})

test('deep link opens the requested tab', async ({ page }) => {
  await page.goto('/adhkar?tab=sleep')
  await expect(page.getByTestId('adhkar-tab-sleep')).toHaveAttribute('aria-selected', 'true')
})

// NBD-41 (r4 §7): the once-daily categories resume where they stopped, for the current day.

test('a morning flow position survives a reload and a tab round-trip', async ({ page }) => {
  await page.goto('/adhkar?tab=morning')
  const card = page.getByTestId('flow-active-card')

  // Dhikr 1 repeats once (tap advances); dhikr 2 repeats ×3 (two taps → count ٢).
  await card.click()
  await card.click()
  await card.click()
  await expect(page.getByTestId('flow-count')).toContainText('٢')
  const activeText = await card.innerText()

  await page.reload()
  await expect(page.getByTestId('flow-count')).toContainText('٢')
  expect(await card.innerText()).toBe(activeText)

  // Leaving for another tab and coming back also resumes.
  await page.getByTestId('adhkar-tab-evening').click()
  await expect(page.getByTestId('flow-count')).toContainText('٠')
  await page.getByTestId('adhkar-tab-morning').click()
  await expect(page.getByTestId('flow-count')).toContainText('٢')
})

test('a repeatable category (بعد الصلاة) resets after a reload', async ({ page }) => {
  await page.goto('/adhkar?tab=after-prayer')
  const card = page.getByTestId('flow-active-card')

  await card.click()
  await card.click()
  await card.click()

  await page.reload()
  await expect(page.getByTestId('flow-count')).toContainText('٠/')
})
