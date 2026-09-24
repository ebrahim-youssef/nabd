import {
  deviceCopy,
  evaluateExactAlarm,
  evaluateNotificationSettings,
  evaluateNotifications,
} from '../logic'
import type { ExactAlarmSnapshot, NotificationSettingsSnapshot } from '../types'

const baseSettings: NotificationSettingsSnapshot = {
  permission: 'granted',
  enabled: true,
}

const baseExactAlarm: ExactAlarmSnapshot = {
  apiLevel: 35,
  access: 'granted',
}

describe('notification capability logic', () => {
  it.each(['undetermined', 'denied'] as const)('keeps %s permission actionable', (permission) => {
    const status = evaluateNotificationSettings({ ...baseSettings, permission })

    expect(status).toMatchObject({
      state: 'permission-required',
      action: { type: 'request-notification-permission' },
      message: deviceCopy.notifications.permissionRequired,
    })
  })

  it('routes blocked permission to application settings', () => {
    const status = evaluateNotificationSettings({ ...baseSettings, permission: 'blocked' })

    expect(status).toMatchObject({
      state: 'settings-required',
      action: { type: 'open-app-settings' },
      message: deviceCopy.notifications.settingsRequired,
    })
  })

  it('reports the application master switch as disabled with one action', () => {
    const status = evaluateNotificationSettings({ ...baseSettings, enabled: false })

    expect(status).toMatchObject({
      state: 'disabled',
      action: { type: 'enable-notifications' },
      message: deviceCopy.notifications.disabled,
    })
  })

  it('reports a disabled device notification switch separately', () => {
    const status = evaluateNotificationSettings({ ...baseSettings, deviceEnabled: false })

    expect(status).toMatchObject({
      state: 'settings-required',
      action: { type: 'open-app-settings' },
      message: deviceCopy.notifications.deviceDisabled,
    })
  })

  it('reports granted notification settings as ready', () => {
    expect(evaluateNotificationSettings(baseSettings)).toEqual({
      capability: 'notifications',
      state: 'ready',
      message: deviceCopy.notifications.ready,
      action: null,
    })
  })

  it('reports exact alarms as not required below API 31', () => {
    expect(evaluateExactAlarm({ apiLevel: 30, access: 'not-required' })).toMatchObject({
      state: 'not-required',
      action: null,
    })
  })

  it.each([31, 32])('routes API %s exact-alarm denial to exact settings', (apiLevel) => {
    expect(evaluateExactAlarm({ apiLevel, access: 'denied' })).toMatchObject({
      state: 'settings-required',
      action: { type: 'open-exact-alarm-settings' },
      message: deviceCopy.exactAlarm.settingsRequired,
    })
  })

  it('reports exact alarms as ready when access is granted', () => {
    expect(evaluateExactAlarm(baseExactAlarm)).toMatchObject({
      state: 'ready',
      action: null,
      message: deviceCopy.exactAlarm.ready,
    })
  })

  it.each([33, 34, 35])('reports an impossible API %s denial as unavailable', (apiLevel) => {
    expect(evaluateExactAlarm({ apiLevel, access: 'denied' })).toMatchObject({
      state: 'unavailable',
      action: { type: 'open-app-settings' },
      message: deviceCopy.exactAlarm.unavailable,
    })
  })

  it('evaluates notification and exact-alarm rows together', () => {
    const evaluation = evaluateNotifications({
      ...baseSettings,
      exactAlarm: { apiLevel: 31, access: 'denied' },
    })

    expect(evaluation.notifications).toMatchObject({ state: 'ready' })
    expect(evaluation.exactAlarm).toMatchObject({
      state: 'settings-required',
      action: { type: 'open-exact-alarm-settings' },
    })
  })
})
