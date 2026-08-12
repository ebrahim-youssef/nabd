import { expect, test } from '@playwright/test'
import type { Page } from '@playwright/test'

import { ONBOARDING_COPY, WIRD_LEVELS } from '@nabd/shared'

const BEGINNER_ANSWERS = {
  prayers: 'struggling',
  quran: 'rarely',
  adhkar: 'rarely',
} as const

async function seedOnboarding(page: Page) {
  await page.getByRole('button', { name: ONBOARDING_COPY.welcomeStart }).click()
  for (const [questionId, optionId] of Object.entries(BEGINNER_ANSWERS)) {
    await page.getByTestId(`onboarding-${questionId}-${optionId}`).check()
  }
  await page.getByRole('button', { name: ONBOARDING_COPY.submit }).click()
  await page.getByRole('button', { name: ONBOARDING_COPY.confirm }).click()
}

test('a checked wird item survives reload without application network requests', async ({
  page,
}) => {
  const applicationRequests: string[] = []
  page.on('request', (request) => {
    const type = request.resourceType()
    if (type === 'fetch' || type === 'xhr') applicationRequests.push(request.url())
  })

  await page.goto('/app')
  await seedOnboarding(page)

  const item = WIRD_LEVELS[0].wird.items[0]
  const row = page.getByTestId(`wird-item-${item.id}`)
  await expect(row).toHaveAttribute('aria-pressed', 'false')
  await row.click()
  await expect(row).toHaveAttribute('aria-pressed', 'true')

  await page.reload()

  await expect(page.getByTestId(`wird-item-${item.id}`)).toHaveAttribute('aria-pressed', 'true')
  expect(applicationRequests).toEqual([])
})
