import { expect, test } from '@playwright/test'

import { completeOnboarding } from './helpers'

// NBD-6 + NBD-26: a new user answers the questionnaire and lands on a daily wird sized to
// the chosen level (three levels since NBD-26).

test('beginner answers land on the level-1 wird', async ({ page }) => {
  await page.goto('/')

  await completeOnboarding(page, { prayers: 'struggling', quran: 'rarely', adhkar: 'rarely' })

  await expect(page.getByTestId('wird-checklist')).toBeVisible()
  await expect(page.getByTestId('wird-item-fajr')).toBeVisible()
  await expect(page.getByTestId('wird-item-quran-pages')).toBeVisible()
  // Voluntary deeds carry the تطوّع chip from level 1.
  await expect(page.getByTestId('wird-item-qiyam')).toBeVisible()
  // Level-2+ items must not be present.
  await expect(page.getByTestId('wird-item-rawatib-fajr-before')).toHaveCount(0)
})

test('middling answers land on the level-2 wird', async ({ page }) => {
  await page.goto('/')

  await completeOnboarding(page, { prayers: 'mostly', quran: 'pages', adhkar: 'sometimes' })

  await expect(page.getByTestId('wird-checklist')).toBeVisible()
  await expect(page.getByTestId('wird-item-rawatib-fajr-before')).toBeVisible()
  await expect(page.getByTestId('wird-item-quran-hizb')).toBeVisible()
  // Level-3-only items must not be present.
  await expect(page.getByTestId('wird-item-ghair-rawatib')).toHaveCount(0)

  // NBD-40: the prayers area follows performance order — قبلية ← صلاة ← أذكار ← بعدية per prayer.
  const prayerItems = page.getByTestId('area-items-prayers').locator('[data-testid^="wird-item-"]')
  await expect(prayerItems.first()).toHaveAttribute('data-testid', 'wird-item-rawatib-fajr-before')
  const ids = await prayerItems.evaluateAll((nodes) =>
    nodes.map((node) => node.getAttribute('data-testid')),
  )
  expect(ids.slice(0, 7)).toEqual([
    'wird-item-rawatib-fajr-before',
    'wird-item-fajr',
    'wird-item-prayer-adhkar-fajr',
    'wird-item-rawatib-dhuhr-before',
    'wird-item-dhuhr',
    'wird-item-prayer-adhkar-dhuhr',
    'wird-item-rawatib-dhuhr-after',
  ])
})

test('established answers land on the level-3 wird', async ({ page }) => {
  await page.goto('/')

  await completeOnboarding(page, { prayers: 'always', quran: 'hizb', adhkar: 'daily' })

  await expect(page.getByTestId('wird-checklist')).toBeVisible()
  await expect(page.getByTestId('wird-item-ghair-rawatib')).toBeVisible()
  await expect(page.getByTestId('wird-item-quran-juz')).toBeVisible()
})

test('the questionnaire does not return once the wird is seeded', async ({ page }) => {
  await page.goto('/')
  await completeOnboarding(page)
  await expect(page.getByTestId('wird-checklist')).toBeVisible()

  await page.reload()

  await expect(page.getByTestId('wird-checklist')).toBeVisible()
  await expect(page.getByTestId('onboarding-questionnaire')).toHaveCount(0)
})
