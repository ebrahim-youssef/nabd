import { expect, test } from '@playwright/test'

import { collectPageFailures, seedOnboarding } from './helpers'

test.describe('notifications', () => {
  // Chromium under Playwright reports Notification.permission as 'denied' whatever the context
  // grant says, while requestPermission() honours the grant and resolves 'granted'. The app is
  // right to trust the getter and not re-prompt into a silent no-op on a denied permission, which
  // is the one behaviour this harness cannot express. So the getter is replaced with a stored one
  // that behaves the way a real browser's does: 'default' until asked, granted afterwards, and
  // sticky across a reload. Nothing else about the opt-in path is faked.
  test('opting in persists enabled moments and an iqamah opt-out', async ({ page }) => {
    await page.addInitScript(() => {
      const KEY = 'e2e:notification-permission'
      Object.defineProperty(window.Notification, 'permission', {
        configurable: true,
        get: () => window.localStorage.getItem(KEY) ?? 'default',
      })
      window.Notification.requestPermission = async () => {
        window.localStorage.setItem(KEY, 'granted')
        return 'granted'
      }
    })
    const failures = collectPageFailures(page)
    await seedOnboarding(page)
    await page.goto('/app/settings')

    await page.getByTestId('notification-enabled').check()
    await page.getByTestId('notification-moment-atIqamah').uncheck()
    await page.reload()

    await expect(page.getByTestId('notification-enabled')).toBeChecked()
    await expect(page.getByTestId('notification-moment-atIqamah')).not.toBeChecked()
    expect(failures).toEqual([])
  })

  test('skipping notification permission leaves the master switch off', async ({ page }) => {
    const failures = collectPageFailures(page)
    await seedOnboarding(page)
    await page.goto('/app/settings')

    await expect(page.getByTestId('notification-enabled')).not.toBeChecked()
    expect(failures).toEqual([])
  })
})
