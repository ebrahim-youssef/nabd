import { expect, test } from '@playwright/test'
import type { Page } from '@playwright/test'

import { ONBOARDING_COPY, toArabicIndic, WIRD_LEVELS } from '@nabd/shared'

const BEGINNER_ANSWERS = {
  prayers: 'struggling',
  quran: 'rarely',
  adhkar: 'rarely',
} as const

// Derived from the level the beginner answers select, not hardcoded: a wrong literal target would
// make this pass or fail for reasons unrelated to the linking behavior under test.
const BEGINNER_LEVEL = WIRD_LEVELS.find((level) => level.id === 'level-1')
const COUNTER_ITEM = BEGINNER_LEVEL?.wird.items.find((item) => item.kind === 'counter')

async function seedOnboarding(page: Page) {
  await page.getByRole('button', { name: ONBOARDING_COPY.welcomeStart }).click()
  for (const [questionId, optionId] of Object.entries(BEGINNER_ANSWERS)) {
    await page.getByTestId(`onboarding-${questionId}-${optionId}`).check()
  }
  await page.getByRole('button', { name: ONBOARDING_COPY.submit }).click()
  await page.getByRole('button', { name: ONBOARDING_COPY.confirm }).click()
}

test('counting a dhikr to its target completes its linked wird item without reload', async ({
  page,
}) => {
  expect(COUNTER_ITEM, 'the beginner level must contain a counter item').toBeTruthy()
  const itemId = COUNTER_ITEM!.id
  const target = COUNTER_ITEM!.target!

  await page.goto('/app')
  await seedOnboarding(page)

  const counter = page.getByTestId(`dhikr-${itemId}`)
  await expect(counter).toHaveAttribute('aria-pressed', 'false')

  // One tap short of the target must not complete it.
  for (let tap = 0; tap < target - 1; tap += 1) await counter.click()
  await expect(counter).toHaveAttribute('aria-pressed', 'false')

  await counter.click()
  await expect(counter).toHaveAttribute('aria-pressed', 'true')

  // The completion must reach the shared checklist state with no reload: the today summary counts
  // it exactly like a manual check-off, which is what the parity ledger requires of a counted
  // dhikr.
  await expect(page.getByTestId('summary-done')).toHaveText(toArabicIndic(1))

  await page.reload()
  await expect(page.getByTestId(`dhikr-${itemId}`)).toHaveAttribute('aria-pressed', 'true')
})
