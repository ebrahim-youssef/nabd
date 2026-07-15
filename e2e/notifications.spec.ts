import { expect, test } from '@playwright/test'

import { answerQuestionnaire, completeOnboarding, ensureChecked } from './helpers'

// NBD-28: onboarding's permissions step captures notification preferences (three moment
// toggles with fixed iqamah offsets); the choice persists on the device.
//
// Headless Chromium reports Notification.permission as 'denied' no matter what the context
// grants, so the granted state is stubbed at init — the flow under test is ours, not the
// browser prompt.

test('opting in to notifications persists the chosen moments', async ({ page }) => {
  await page.addInitScript(() => {
    class GrantedNotification {
      static permission: NotificationPermission = 'granted'
      static requestPermission = async (): Promise<NotificationPermission> => 'granted'
    }
    Object.defineProperty(window, 'Notification', { value: GrantedNotification })
  })
  await page.goto('/')

  await answerQuestionnaire(page)

  // Enable notifications (permission stubbed granted) and drop the iqamah moment.
  await ensureChecked(page, 'onboarding-notifications')
  await expect(page.getByTestId('onboarding-moment-atIqamah')).toBeVisible()
  await page.getByTestId('onboarding-moment-atIqamah').uncheck()
  await page.getByTestId('onboarding-finish').click()

  await expect(page.getByTestId('wird-checklist')).toBeVisible()

  const prefs = await page.evaluate(() =>
    JSON.parse(window.localStorage.getItem('nabd:notification-prefs') ?? 'null'),
  )
  expect(prefs).toMatchObject({
    enabled: true,
    beforeAdhan: true,
    atAdhan: true,
    atIqamah: false,
  })
})

test('skipping the permissions step leaves notifications off', async ({ page }) => {
  await page.goto('/')
  await completeOnboarding(page)
  await expect(page.getByTestId('wird-checklist')).toBeVisible()

  const prefs = await page.evaluate(() =>
    JSON.parse(window.localStorage.getItem('nabd:notification-prefs') ?? 'null'),
  )
  expect(prefs).toMatchObject({ enabled: false })
})
