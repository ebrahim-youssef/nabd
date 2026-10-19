jest.mock('expo', () => ({
  ...jest.requireActual('expo'),
  requireOptionalNativeModule: jest.fn(),
}))

jest.mock('expo-notifications', () => ({
  getPermissionsAsync: jest.fn(),
  requestPermissionsAsync: jest.fn(),
  getAllScheduledNotificationsAsync: jest.fn(),
  cancelScheduledNotificationAsync: jest.fn(),
  getPresentedNotificationsAsync: jest.fn(),
  dismissNotificationAsync: jest.fn(),
  setNotificationHandler: jest.fn(),
}))

import { requireOptionalNativeModule } from 'expo'
import * as Notifications from 'expo-notifications'

import type { AlarmPayload } from '@nabd/shared'

import { logger } from '../../observability/logger'
import {
  cancelPrayerAlarms,
  configureForegroundHandler,
  readNotificationPermission,
  replacePrayerAlarms,
  requestNotificationPermission,
} from '../notifications'

const mockedNativeModule = requireOptionalNativeModule as jest.MockedFunction<
  typeof requireOptionalNativeModule
>
const mockedNotifications = Notifications as jest.Mocked<typeof Notifications>
const NOW = 1_800_000_000_000

function alarm(overrides: Partial<AlarmPayload> = {}): AlarmPayload {
  return {
    id: 101,
    title: 'عنوان',
    body: 'نص',
    channelKey: 'adhan',
    at: NOW + 60_000,
    ...overrides,
  }
}

function scheduled(identifier: string): Notifications.NotificationRequest {
  return { identifier } as Notifications.NotificationRequest
}

function presented(identifier: string): Notifications.Notification {
  return { request: { identifier } } as Notifications.Notification
}

describe('native notification adapter', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockedNativeModule.mockReturnValue({
      replacePrayerAlarms: jest.fn(() => 'scheduled'),
      cancelPrayerAlarms: jest.fn(),
    } as never)
    mockedNotifications.getAllScheduledNotificationsAsync.mockResolvedValue([])
    mockedNotifications.getPresentedNotificationsAsync.mockResolvedValue([])
    mockedNotifications.cancelScheduledNotificationAsync.mockResolvedValue(undefined)
    mockedNotifications.dismissNotificationAsync.mockResolvedValue(undefined)
  })

  it('reads and requests notification permission', async () => {
    mockedNotifications.getPermissionsAsync.mockResolvedValue({
      status: 'granted',
      canAskAgain: true,
    } as never)
    mockedNotifications.requestPermissionsAsync.mockResolvedValue({
      status: 'denied',
      canAskAgain: false,
    } as never)

    await expect(readNotificationPermission()).resolves.toBe('granted')
    await expect(requestNotificationPermission()).resolves.toBe('blocked')
  })

  it('sends only future alarms to native with the selected channel mode', async () => {
    const native = { replacePrayerAlarms: jest.fn(() => 'scheduled') }
    mockedNativeModule.mockReturnValue(native as never)

    await replacePrayerAlarms(
      [
        alarm({ id: 201, channelKey: 'adhkarReminder', at: NOW + 120_000 }),
        alarm({ id: 202, at: NOW }),
      ],
      true,
      NOW,
    )

    expect(native.replacePrayerAlarms).toHaveBeenCalledWith(
      JSON.stringify({
        version: 1,
        alarms: [
          {
            id: '201',
            at: NOW + 120_000,
            title: 'عنوان',
            body: 'نص',
            sound: 'before',
            channelId: 'nabd-adhkar-reminder-alarm-v1',
            isAlarmChannel: true,
          },
        ],
      }),
    )
  })

  it('uses normal channels and marks normal notifications as non-alarm', async () => {
    const native = { replacePrayerAlarms: jest.fn(() => 'scheduled') }
    mockedNativeModule.mockReturnValue(native as never)

    await replacePrayerAlarms([alarm({ channelKey: 'adhanFajr' })], false, NOW)

    expect(native.replacePrayerAlarms).toHaveBeenCalledWith(
      expect.stringContaining('"channelId":"nabd-prayer-fajr-v1"'),
    )
    expect(native.replacePrayerAlarms).toHaveBeenCalledWith(
      expect.stringContaining('"sound":"adhan_fajr"'),
    )
    expect(native.replacePrayerAlarms).toHaveBeenCalledWith(
      expect.stringContaining('"isAlarmChannel":false'),
    )
  })

  it('migrates old Expo scheduled and presented notifications before native scheduling', async () => {
    const native = { replacePrayerAlarms: jest.fn(() => 'scheduled') }
    mockedNativeModule.mockReturnValue(native as never)
    mockedNotifications.getAllScheduledNotificationsAsync.mockResolvedValue([
      scheduled('nabd-prayer-old'),
      scheduled('other'),
    ])
    mockedNotifications.getPresentedNotificationsAsync.mockResolvedValue([
      presented('nabd-prayer-presented'),
      presented('other-presented'),
    ])

    await replacePrayerAlarms([alarm()], false, NOW)

    expect(mockedNotifications.cancelScheduledNotificationAsync).toHaveBeenCalledWith(
      'nabd-prayer-old',
    )
    expect(mockedNotifications.dismissNotificationAsync).toHaveBeenCalledWith(
      'nabd-prayer-presented',
    )
    expect(native.replacePrayerAlarms).toHaveBeenCalled()
    expect(
      mockedNotifications.cancelScheduledNotificationAsync.mock.invocationCallOrder[0],
    ).toBeLessThan(native.replacePrayerAlarms.mock.invocationCallOrder[0])
  })

  it('logs Expo migration failures and still calls native scheduling', async () => {
    const native = { replacePrayerAlarms: jest.fn(() => 'scheduled') }
    mockedNativeModule.mockReturnValue(native as never)
    mockedNotifications.getAllScheduledNotificationsAsync.mockRejectedValue(new Error('old API'))
    mockedNotifications.getPresentedNotificationsAsync.mockRejectedValue(new Error('presented'))

    await expect(replacePrayerAlarms([alarm()], false, NOW)).resolves.toBeUndefined()

    expect(native.replacePrayerAlarms).toHaveBeenCalled()
    expect(logger.warn).toHaveBeenCalled()
  })

  it.each([
    ['exact-denied', 'exact alarm access is denied'],
    ['invalid', 'native prayer alarm snapshot is invalid'],
  ] as const)('maps native %s to a failed synchronization error', async (result, message) => {
    mockedNativeModule.mockReturnValue({ replacePrayerAlarms: jest.fn(() => result) } as never)

    await expect(replacePrayerAlarms([alarm()], false, NOW)).rejects.toThrow(message)
  })

  it('throws when the native module is missing', async () => {
    mockedNativeModule.mockReturnValue(null)

    await expect(replacePrayerAlarms([alarm()], false, NOW)).rejects.toThrow(
      'native prayer alarm module is unavailable',
    )
  })

  it('cancels Expo notifications and native alarms on every cancel call', async () => {
    const native = { cancelPrayerAlarms: jest.fn() }
    mockedNativeModule.mockReturnValue(native as never)
    mockedNotifications.getAllScheduledNotificationsAsync.mockResolvedValue([
      scheduled('nabd-prayer-one'),
      scheduled('other-one'),
    ])
    mockedNotifications.getPresentedNotificationsAsync.mockResolvedValue([
      presented('nabd-prayer-two'),
    ])

    await cancelPrayerAlarms()

    expect(mockedNotifications.cancelScheduledNotificationAsync).toHaveBeenCalledWith(
      'nabd-prayer-one',
    )
    expect(mockedNotifications.dismissNotificationAsync).toHaveBeenCalledWith('nabd-prayer-two')
    expect(native.cancelPrayerAlarms).toHaveBeenCalledTimes(1)
  })

  it('configures the foreground handler once', async () => {
    configureForegroundHandler()
    configureForegroundHandler()

    expect(mockedNotifications.setNotificationHandler).toHaveBeenCalledTimes(1)
    const handler = mockedNotifications.setNotificationHandler.mock.calls[0][0]
    await expect(handler?.handleNotification({} as never)).resolves.toEqual({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
    })
  })
})
