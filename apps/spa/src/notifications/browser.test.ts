import { afterEach, describe, expect, it, vi } from 'vitest'

import {
  browserNotificationPermission,
  requestBrowserNotificationPermission,
  supportsBrowserNotifications,
} from './browser'

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('browser notification permission adapter', () => {
  it('reports unsupported when the API is absent or the page is insecure', () => {
    vi.stubGlobal('isSecureContext', false)
    vi.stubGlobal('Notification', undefined)

    expect(supportsBrowserNotifications()).toBe(false)
    expect(browserNotificationPermission()).toBe('unsupported')
  })

  it('returns the current granted permission without requesting it again', async () => {
    const requestPermission = vi.fn()
    vi.stubGlobal('isSecureContext', true)
    vi.stubGlobal('Notification', { permission: 'granted', requestPermission })

    await expect(requestBrowserNotificationPermission()).resolves.toBe('granted')
    expect(requestPermission).not.toHaveBeenCalled()
  })
})
