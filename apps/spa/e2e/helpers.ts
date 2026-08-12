import { expect } from '@playwright/test'
import type { Page } from '@playwright/test'

import { ONBOARDING_COPY } from '@nabd/shared'
import type { Answers } from '@nabd/shared'

// Answer sets and their expected level, derived from the questionnaire's own scoring.
export const BEGINNER_ANSWERS: Answers = {
  prayers: 'struggling',
  quran: 'rarely',
  adhkar: 'rarely',
}

// A navigation cancels whatever is still in flight, so fonts and other assets legitimately report
// `net::ERR_ABORTED` when a test walks several routes in a row. Treating that as a failure made the
// shell spec flake without anything being wrong with the page.
const IGNORED_REQUEST_FAILURES = [/net::ERR_ABORTED/]

// Console errors, uncaught exceptions and genuinely failed requests, collected for a test to assert
// on at the end. Attach before the first navigation — listeners added later miss earlier events.
export function collectPageFailures(page: Page) {
  const failures: string[] = []

  page.on('console', (message) => {
    if (message.type() === 'error') failures.push(message.text())
  })
  page.on('pageerror', (error) => failures.push(error.message))
  page.on('requestfailed', (request) => {
    const reason = request.failure()?.errorText ?? 'failed'
    if (IGNORED_REQUEST_FAILURES.some((pattern) => pattern.test(reason))) return
    failures.push(`${request.method()} ${request.url()}: ${reason}`)
  })

  return failures
}

// Walks a fresh profile through onboarding so a test can reach the product surfaces behind it.
export async function seedOnboarding(page: Page, answers: Answers = BEGINNER_ANSWERS) {
  await page.goto('/app')
  await page.getByRole('button', { name: ONBOARDING_COPY.welcomeStart }).click()
  for (const [questionId, optionId] of Object.entries(answers)) {
    await page.getByTestId(`onboarding-${questionId}-${optionId}`).check()
  }
  await page.getByRole('button', { name: ONBOARDING_COPY.submit }).click()
  await page.getByRole('button', { name: ONBOARDING_COPY.confirm }).click()
  await expect(page.getByTestId('today-summary')).toBeVisible()
}
