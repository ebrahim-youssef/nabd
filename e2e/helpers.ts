import { expect, type Page } from '@playwright/test'

// Selects a radio and verifies React state took it. A click that lands before hydration is
// silently lost (the server-rendered input re-renders unchecked), so retry until the checked
// state sticks instead of trusting the first click. No force: actionability checks must stay
// on so an overlaying element (e.g. the fixed bottom nav) fails loudly instead of being
// clicked through.
async function ensureChecked(page: Page, testId: string): Promise<void> {
  const radio = page.getByTestId(testId)
  await expect(async () => {
    await radio.check()
    expect(await radio.isChecked()).toBe(true)
  }).toPass({ timeout: 15_000 })
}

// Answers the onboarding questionnaire (NBD-6) and confirms the recommended level, so specs
// that exercise the checklist start from a seeded wird — the same path a real new user takes.
// The scores map to level-1 unless every answer is the strongest option.
export async function completeOnboarding(
  page: Page,
  optionIds: { prayers: string; quran: string; adhkar: string } = {
    prayers: 'mostly',
    quran: 'pages',
    adhkar: 'sometimes',
  },
): Promise<void> {
  await ensureChecked(page, `onboarding-prayers-${optionIds.prayers}`)
  await ensureChecked(page, `onboarding-quran-${optionIds.quran}`)
  await ensureChecked(page, `onboarding-adhkar-${optionIds.adhkar}`)
  await page.getByTestId('onboarding-submit').click()
  await page.getByTestId('onboarding-confirm').click()
}
