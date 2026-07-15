import { expect, test } from '@playwright/test'

import { completeOnboarding } from './helpers'

// NBD-6: a new user answers the questionnaire and lands on a daily wird sized to the chosen
// level.

test('beginner answers land on the level-1 wird', async ({ page }) => {
  await page.goto('/')

  await completeOnboarding(page, { prayers: 'struggling', quran: 'rarely', adhkar: 'rarely' })

  await expect(page.getByTestId('wird-checklist')).toBeVisible()
  await expect(page.getByTestId('wird-item-fajr')).toBeVisible()
  await expect(page.getByTestId('wird-item-quran-pages')).toBeVisible()
  // Level-2-only items must not be present.
  await expect(page.getByTestId('wird-item-rawatib')).toHaveCount(0)
})

test('established answers land on the level-2 wird', async ({ page }) => {
  await page.goto('/')

  await completeOnboarding(page, { prayers: 'always', quran: 'hizb', adhkar: 'daily' })

  await expect(page.getByTestId('wird-checklist')).toBeVisible()
  await expect(page.getByTestId('wird-item-rawatib')).toBeVisible()
  await expect(page.getByTestId('wird-item-quran-hizb')).toBeVisible()
})

test('the questionnaire does not return once the wird is seeded', async ({ page }) => {
  await page.goto('/')
  await completeOnboarding(page)
  await expect(page.getByTestId('wird-checklist')).toBeVisible()

  await page.reload()

  await expect(page.getByTestId('wird-checklist')).toBeVisible()
  await expect(page.getByTestId('onboarding-questionnaire')).toHaveCount(0)
})
