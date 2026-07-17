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

test('sound previews are listed and playable without errors', async ({ page }) => {
  await page.goto('/settings')

  await expect(page.getByTestId('sound-settings')).toBeVisible()
  for (const id of ['before', 'adhan', 'adhan-fajr', 'iqama']) {
    await expect(page.getByTestId(`sound-preview-${id}`)).toBeVisible()
  }

  // Playing then stopping must not throw (audio itself is not assertable headlessly).
  await page.getByTestId('sound-preview-before').click()
  await page.getByTestId('sound-stop').click()

  // The four sound files are actually served.
  for (const file of ['before', 'adhan', 'adhan-fajr', 'iqama']) {
    const response = await page.request.get(`/sounds/${file}.mp3`)
    expect(response.status()).toBe(200)
  }
})

// NBD-48 (r6 §1): a user who skipped location in onboarding can grant it from Settings.
test('settings expose a location enable control when no location is cached', async ({ page }) => {
  await page.goto('/settings')
  await expect(page.getByTestId('location-settings')).toBeVisible()
  await expect(page.getByTestId('enable-location-settings')).toBeVisible()
})

test('settings mode switcher flips data-mode and persists across reload', async ({ page }) => {
  await page.goto('/')
  // الإعدادات is a bottom-nav tab since r6 §2-amendment.
  await page.getByTestId('nav-settings').click()
  await expect(page).toHaveURL(/\/settings$/)

  await expect(page.locator('html')).toHaveAttribute('data-mode', 'classic')
  await page.getByTestId('mode-modern').click()
  await expect(page.locator('html')).toHaveAttribute('data-mode', 'modern')

  await page.reload()
  await expect(page.locator('html')).toHaveAttribute('data-mode', 'modern')
  await expect(page.getByTestId('mode-modern')).toHaveAttribute('aria-pressed', 'true')
})
