import { expect, test } from '@playwright/test'

import { completeOnboarding } from './helpers'

// NBD-32: completing the last required item shows the celebration exactly once for that day.

test('finishing the required wird celebrates once', async ({ page }) => {
  await page.goto('/')
  // Level 1: 5 prayers + صفحتان + صباح/مساء + the five daily adhkar — all checkbox rows now
  // (NBD-60: the five are checkbox + counter-button, no longer inline tap-counters); تطوّع stays open.
  await completeOnboarding(page, { prayers: 'struggling', quran: 'rarely', adhkar: 'rarely' })

  for (const id of [
    'fajr',
    'dhuhr',
    'asr',
    'maghrib',
    'isha',
    'quran-pages',
    'morning-adhkar',
    'evening-adhkar',
    'istighfar',
    'habibatan',
    'baqiyat',
    'tahlil',
    'salawat',
  ]) {
    await page.getByTestId(`wird-item-${id}`).click()
    await expect(page.getByTestId(`wird-item-${id}`)).toHaveAttribute('aria-pressed', 'true')
  }

  const celebration = page.getByTestId('completion-celebration')
  await expect(celebration).toBeVisible({ timeout: 10_000 })

  await page.getByTestId('celebration-dismiss').click()
  await expect(celebration).toHaveCount(0)

  // Once per day: a reload with everything still complete stays quiet.
  await page.reload()
  await expect(page.getByTestId('wird-checklist')).toBeVisible()
  await expect(page.getByTestId('completion-celebration')).toHaveCount(0)
})
