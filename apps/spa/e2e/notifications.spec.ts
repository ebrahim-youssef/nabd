import { expect, test } from '@playwright/test'

import { collectPageFailures, seedOnboarding } from './helpers'

test.describe('notifications', () => {
  // Chromium under Playwright reports Notification.permission as 'denied' whatever the context
  // grant says, while requestPermission() honours the grant and resolves 'granted'. The app is
  // right to trust the getter and not re-prompt into a silent no-op on a denied permission, which
  // is the one behaviour this harness cannot express. So the getter, and only the getter, is
  // replaced with one that reports what the real requestPermission() last resolved: 'default'
  // until asked, and sticky across a reload afterwards, the way a real browser's does. The
  // request itself is the browser's own and answers from the context grant below.
  test('opting in persists enabled moments and an iqamah opt-out', async ({ page, context }) => {
    await context.grantPermissions(['notifications'])
    await page.addInitScript(() => {
      const KEY = 'e2e:notification-permission'
      const request = window.Notification.requestPermission.bind(window.Notification)
      Object.defineProperty(window.Notification, 'permission', {
        configurable: true,
        get: () => window.localStorage.getItem(KEY) ?? 'default',
      })
      window.Notification.requestPermission = async () => {
        const outcome = await request()
        window.localStorage.setItem(KEY, outcome)
        return outcome
      }
    })
    const failures = collectPageFailures(page)
    await seedOnboarding(page)
    await page.goto('/app/settings')

    // click() and then wait, rather than check(), which verifies the box flipped in the moment
    // after the click. Turning this on genuinely waits for the browser's permission answer, so the
    // box is still unchecked when check() looks, and check() responds by clicking again.
    await page.getByTestId('notification-enabled').click()
    await expect(page.getByTestId('notification-enabled')).toBeChecked()
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
