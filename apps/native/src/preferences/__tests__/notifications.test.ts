import { DEFAULT_NOTIFICATION_PREFS } from '@nabd/shared'

import { PREFERENCE_KEYS, parseStoredNotificationPrefs, parseStoredSilentMode } from '../db'

describe('native notification preferences', () => {
  it('uses the shared disabled defaults for absent and malformed values', () => {
    expect(parseStoredNotificationPrefs(null)).toEqual(DEFAULT_NOTIFICATION_PREFS)
    expect(parseStoredNotificationPrefs('{bad')).toEqual(DEFAULT_NOTIFICATION_PREFS)
    expect(parseStoredSilentMode(null)).toBe(false)
    expect(parseStoredSilentMode('0')).toBe(false)
    expect(parseStoredSilentMode('1')).toBe(true)
  })

  it('parses a stored preference object and preserves valid booleans', () => {
    expect(
      parseStoredNotificationPrefs(
        JSON.stringify({
          enabled: true,
          beforeAdhan: false,
          atAdhan: true,
          atIqamah: false,
          morningAdhkar: true,
          eveningAdhkar: false,
        }),
      ),
    ).toEqual({
      enabled: true,
      beforeAdhan: false,
      atAdhan: true,
      atIqamah: false,
      morningAdhkar: true,
      eveningAdhkar: false,
    })
  })

  it('uses the device-specific preference keys', () => {
    expect(PREFERENCE_KEYS.notificationPrefs).toBe('nabd:notification-prefs')
    expect(PREFERENCE_KEYS.silentMode).toBe('nabd:notification-silent-mode')
  })
})
