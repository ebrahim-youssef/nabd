import { expect, test } from '@playwright/test'

// NBD-13: the user can open the intention text for a given deed.

test('opening a deed reveals its intention text', async ({ page }) => {
  await page.goto('/niyyat')

  await expect(page.getByTestId('intentions-library')).toBeVisible()

  const prayer = page.getByTestId('deed-prayer')
  // Collapsed by default — the intention is not visible until the deed is opened.
  await expect(prayer.getByText('أنوي امتثال أمر الله وإقامة ذكره', { exact: false })).toBeHidden()

  await prayer.getByRole('group').or(prayer).locator('summary').click()
  await expect(prayer.getByText('أنوي امتثال أمر الله وإقامة ذكره', { exact: false })).toBeVisible()
})

test('home page links to the intentions library', async ({ page }) => {
  await page.goto('/')

  await page.getByRole('link', { name: 'مكتبة النوايا' }).click()
  await expect(page.getByTestId('intentions-library')).toBeVisible()
})
