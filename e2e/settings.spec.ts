import { expect, test } from '@playwright/test'

// NBD-37: theme toggles from the header, mode from the settings page; both survive a reload
// and are applied before first paint by the inline layout script.

test('header theme toggle flips data-theme and persists across reload', async ({ page }) => {
  await page.goto('/')

  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light')
  await page.getByTestId('theme-toggle').click()
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark')

  await page.reload()
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark')
})

test('settings mode switcher flips data-mode and persists across reload', async ({ page }) => {
  await page.goto('/')
  await page.getByTestId('settings-link').click()
  await expect(page).toHaveURL(/\/settings$/)

  await expect(page.locator('html')).toHaveAttribute('data-mode', 'classic')
  await page.getByTestId('mode-modern').click()
  await expect(page.locator('html')).toHaveAttribute('data-mode', 'modern')

  await page.reload()
  await expect(page.locator('html')).toHaveAttribute('data-mode', 'modern')
  await expect(page.getByTestId('mode-modern')).toHaveAttribute('aria-pressed', 'true')
})
