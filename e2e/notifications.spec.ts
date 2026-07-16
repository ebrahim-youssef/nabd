import { expect, test } from '@playwright/test'

import { answerQuestionnaire, completeOnboarding } from './helpers'

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

  // Enable notifications (permission stubbed granted) and drop the iqamah moment. Retried
  // as a unit: only the moments block proves React took the toggle (a pre-hydration click
  // can set the DOM checkbox without it).
  await expect(async () => {
    await page.getByTestId('onboarding-notifications').click()
    await expect(page.getByTestId('onboarding-moment-atIqamah')).toBeVisible({ timeout: 2000 })
  }).toPass({ timeout: 20_000 })
  // Center it first — near the page bottom it can sit under the fixed navbar on CI's
  // viewport, and uncheck() then waits forever on actionability.
  const iqamah = page.getByTestId('onboarding-moment-atIqamah')
  await expect(async () => {
    await iqamah.evaluate((el) => el.scrollIntoView({ block: 'center' }))
    await iqamah.uncheck({ timeout: 2000 })
    expect(await iqamah.isChecked()).toBe(false)
  }).toPass({ timeout: 20_000 })
  // The acceptance is the persisted prefs (persist() runs synchronously in the finish
  // handler). Poll for them instead of the checklist — checklist arrival is covered by
  // every other onboarding spec, and CI shows a re-render race unique to this flow.
  const finish = page.getByTestId('onboarding-finish')
  await expect(async () => {
    await finish.evaluate((el) => (el as HTMLElement).click()).catch(() => undefined)
    const prefs = await page.evaluate(() =>
      JSON.parse(window.localStorage.getItem('nabd:notification-prefs') ?? 'null'),
    )
    expect(prefs).toMatchObject({
      enabled: true,
      beforeAdhan: true,
      atAdhan: true,
      atIqamah: false,
    })
  }).toPass({ timeout: 30_000 })
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
