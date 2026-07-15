import type { Page } from '@playwright/test'

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
  await page.getByTestId(`onboarding-prayers-${optionIds.prayers}`).check()
  await page.getByTestId(`onboarding-quran-${optionIds.quran}`).check()
  await page.getByTestId(`onboarding-adhkar-${optionIds.adhkar}`).check()
  await page.getByTestId('onboarding-submit').click()
  await page.getByTestId('onboarding-confirm').click()
}
