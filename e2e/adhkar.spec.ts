import { expect, test } from '@playwright/test'

// NBD-12: the adhkar reference is browsable without an entry existing in the user's wird —
// a fresh visitor (no onboarding, no wird) can read it directly.

test('adhkar library is browsable without a wird', async ({ page }) => {
  await page.goto('/adhkar')

  await expect(page.getByTestId('adhkar-library')).toBeVisible()
  await expect(page.getByRole('heading', { name: 'أذكار الصباح' })).toBeVisible()
  await expect(page.getByTestId('dhikr-after-prayer-tasbih')).toBeVisible()
  // No questionnaire and no checklist involved on this page.
  await expect(page.getByTestId('onboarding-questionnaire')).toHaveCount(0)
})

test('bottom nav reaches the adhkar library via the hub', async ({ page }) => {
  await page.goto('/')

  await page.getByTestId('nav-libraries').click()
  await expect(page.getByTestId('libraries-hub')).toBeVisible()
  await page.getByRole('link', { name: /مكتبة الأذكار/ }).click()
  await expect(page.getByTestId('adhkar-library')).toBeVisible()

  // The back header is fixed on screen — no scrolling needed to leave.
  await page.getByTestId('page-back').click()
  await expect(page.getByTestId('libraries-hub')).toBeVisible()
})
