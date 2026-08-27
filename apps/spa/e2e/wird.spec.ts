import { expect, test } from '@playwright/test'

import { WIRD_LEVELS } from '@nabd/shared'

import { seedOnboarding } from './helpers'

test('a checked wird item survives reload without application network requests', async ({
  page,
}) => {
  const applicationRequests: string[] = []
  page.on('request', (request) => {
    const type = request.resourceType()
    if (type === 'fetch' || type === 'xhr') applicationRequests.push(request.url())
  })

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
