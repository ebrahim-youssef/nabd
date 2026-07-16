import { expect, type Page } from '@playwright/test'

// Selects a radio/checkbox and verifies React state took it. A click that lands before
// hydration is silently lost (the server-rendered input re-renders unchecked), so retry until
// the checked state sticks instead of trusting the first click. No force: actionability
// checks must stay on so an overlaying element (e.g. the fixed bottom nav) fails loudly
// instead of being clicked through.
export async function ensureChecked(page: Page, testId: string): Promise<void> {
  const box = page.getByTestId(testId)
  await expect(async () => {
    await box.check()
    expect(await box.isChecked()).toBe(true)
  }).toPass({ timeout: 15_000 })
}

export type OnboardingAnswers = { prayers: string; quran: string; adhkar: string }

const DEFAULT_ANSWERS: OnboardingAnswers = {
  prayers: 'mostly',
  quran: 'pages',
  adhkar: 'sometimes',
}

// Walks the questionnaire + level steps and stops on the permissions step (NBD-28), for
// specs that exercise the permissions UI itself.
export async function answerQuestionnaire(
  page: Page,
  optionIds: OnboardingAnswers = DEFAULT_ANSWERS,
): Promise<void> {
  // Welcome/purpose screen first (NBD-30).
  await page.getByTestId('onboarding-begin').click()
  await ensureChecked(page, `onboarding-prayers-${optionIds.prayers}`)
  await ensureChecked(page, `onboarding-quran-${optionIds.quran}`)
  await ensureChecked(page, `onboarding-adhkar-${optionIds.adhkar}`)
  await page.getByTestId('onboarding-submit').click()
  await page.getByTestId('onboarding-confirm').click()
  await expect(page.getByTestId('onboarding-permissions')).toBeVisible()
}

// Full onboarding (NBD-6): answers, confirms the level, skips both permissions, and starts
// the wird — the same path a real new user takes. The default scores map to level-2.
export async function completeOnboarding(
  page: Page,
  optionIds: OnboardingAnswers = DEFAULT_ANSWERS,
): Promise<void> {
  await answerQuestionnaire(page, optionIds)
  await finishOnboarding(page)
}

// Clicks ابدأ وِردي and waits for the checklist. Retried as a unit: seeding is idempotent
// (double-submit safe), so a swallowed click or a slow Dexie flip on a loaded CI runner just
// clicks again instead of failing the spec.
export async function finishOnboarding(page: Page): Promise<void> {
  const finish = page.getByTestId('onboarding-finish')
  await expect(async () => {
    // Dispatch the click directly: the button sits at the page bottom where Playwright's
    // scroll/stability machinery repeatedly stalls against the fixed navbar on CI. The
    // outcome (checklist appears) is still what's asserted; seeding is idempotent.
    await finish.evaluate((el) => (el as HTMLElement).click()).catch(() => undefined)
    await expect(page.getByTestId('wird-checklist')).toBeVisible({ timeout: 5000 })
  }).toPass({ timeout: 30_000 })
}
