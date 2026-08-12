import { expect, test } from '@playwright/test'

import { shellCopy } from '@nabd/shared'

import { collectPageFailures } from './helpers'

// Every registered application route, plus the namespace prefixes the bottom navigation already
// groups (NBD-84 gives them real screens) and an arbitrary unmatched path. All of them must be
// served by the SPA fallback and all of them must carry the HTTP noindex directive — "every
// direct /app/* request" in the acceptance criterion is not only the four registered sections.
const appRoutes = [
  '/app',
  '/app/libraries',
  '/app/prayer-times',
  '/app/stats',
  '/app/settings',
  '/app/adhkar',
  '/app/niyyat',
  '/app/qada',
  '/app/does-not-exist',
]

test('serves the public landing and every shell route directly', async ({ page }) => {
  const failures = collectPageFailures(page)

  const landingResponse = await page.goto('/')
  expect(landingResponse?.status()).toBe(200)
  expect(landingResponse?.headers()['x-robots-tag']).toBeUndefined()
  await expect(page.locator('html')).toHaveAttribute('dir', 'rtl')
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href', 'https://nabd.app/')
  await expect(page.locator('meta[name="robots"]')).toHaveCount(0)

  for (const route of appRoutes) {
    const response = await page.goto(route)
    expect(response?.status()).toBe(200)
    expect(response?.headers()['x-robots-tag']).toBe('noindex, nofollow')
    await expect(page.getByTestId('bottom-nav')).toBeVisible()
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute(
      'content',
      'noindex, nofollow',
    )
  }

  expect(failures).toEqual([])
})

test('keeps unmatched public paths out of the index at the HTTP layer', async ({ page }) => {
  const failures = collectPageFailures(page)

  // The SPA fallback answers this with the same 200 document as the landing page, so the crawler
  // boundary cannot rely on a status code or on JavaScript having run.
  const response = await page.goto('/no-such-public-page')
  expect(response?.status()).toBe(200)
  expect(response?.headers()['x-robots-tag']).toBe('noindex, nofollow')

  await expect(page.getByText(shellCopy.notFound)).toBeVisible()
  await expect(page.getByTestId('bottom-nav')).toHaveCount(0)
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', 'noindex, nofollow')
  expect(failures).toEqual([])
})

test('keeps the five-tab RTL pill inside a 360px viewport with exact active groups', async ({
  page,
}, testInfo) => {
  test.skip(testInfo.project.name !== 'phone-360', 'phone-width geometry check')
  const failures = collectPageFailures(page)

  await page.goto('/app/adhkar')
  await expect(page.getByTestId('nav-libraries')).toHaveAttribute('aria-current', 'page')
  await expect(page.getByTestId('nav-home')).not.toHaveAttribute('aria-current')

  const pill = await page.getByTestId('bottom-nav').boundingBox()
  expect(pill).not.toBeNull()
  expect(pill?.x).toBeGreaterThanOrEqual(0)
  expect((pill?.x ?? 0) + (pill?.width ?? 0)).toBeLessThanOrEqual(360)

  const labels = await page.getByTestId('bottom-nav').getByRole('link').allTextContents()
  expect(labels).toEqual([
    shellCopy.nav.libraries,
    shellCopy.nav.prayerTimes,
    shellCopy.nav.home,
    shellCopy.nav.stats,
    shellCopy.nav.settings,
  ])
  expect(failures).toEqual([])
})

test('applies persisted dark and modern appearance before the route is visible', async ({
  page,
}) => {
  const failures = collectPageFailures(page)
  await page.goto('/app/settings')
  await page.evaluate(() => {
    localStorage.setItem('nabd:theme', 'dark')
    localStorage.setItem('nabd:mode', 'modern')
  })
  await page.reload()

  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark')
  await expect(page.locator('html')).toHaveAttribute('data-mode', 'modern')
  await expect(page.getByRole('heading', { level: 1, name: shellCopy.nav.settings })).toHaveCSS(
    'font-family',
    /Reem Kufi/,
  )
  expect(failures).toEqual([])
})

test('does not register a service worker or advertise a manifest', async ({ page }) => {
  await page.goto('/app')

  await expect(page.locator('link[rel="manifest"]')).toHaveCount(0)
  expect(await page.evaluate(() => navigator.serviceWorker?.getRegistrations())).toEqual([])
})
