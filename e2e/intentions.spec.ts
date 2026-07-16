import { expect, test } from '@playwright/test'

// NBD-13 (bulleted NBD-36): the user can open a deed and read its bullet-point intentions.

test('opening a deed reveals its bullet intentions with evidence', async ({ page }) => {
  await page.goto('/niyyat')

  await expect(page.getByTestId('intentions-library')).toBeVisible()

  const prayer = page.getByTestId('deed-prayer')
  // The count chip is readable while collapsed — the user sees how many intentions it holds.
  await expect(prayer.getByTestId('deed-count-prayer')).toContainText('نيّات')
  // Collapsed by default — the intentions are not visible until the deed is opened.
  await expect(prayer.getByText('امتثال أمر الله وإقامة ذكره', { exact: false })).toBeHidden()

  await prayer.getByRole('group').or(prayer).locator('summary').click()
  await expect(prayer.getByText('امتثال أمر الله وإقامة ذكره', { exact: false })).toBeVisible()
  // Each bullet carries its evidence line (آية/حديث + تخريج).
  await expect(prayer.getByText('طه ١٤', { exact: false })).toBeVisible()
})

test('bottom nav reaches the intentions library via the hub', async ({ page }) => {
  await page.goto('/')

  await page.getByTestId('nav-libraries').click()
  await page.getByRole('link', { name: /مكتبة النوايا/ }).click()
  await expect(page.getByTestId('intentions-library')).toBeVisible()
})
