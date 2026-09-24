jest.mock('expo-notifications', () => ({
  AndroidImportance: { HIGH: 6 },
  AndroidAudioUsage: { NOTIFICATION: 5, ALARM: 4 },
  AndroidAudioContentType: { SONIFICATION: 4 },
  AndroidNotificationVisibility: { PUBLIC: 1 },
  SchedulableTriggerInputTypes: { DATE: 'date' },
  setNotificationChannelAsync: jest.fn().mockResolvedValue(null),
  getPermissionsAsync: jest.fn(),
  requestPermissionsAsync: jest.fn(),
  getAllScheduledNotificationsAsync: jest.fn(),
  scheduleNotificationAsync: jest.fn(),
  cancelScheduledNotificationAsync: jest.fn(),
  setNotificationHandler: jest.fn(),
}))

import * as Notifications from 'expo-notifications'
import type { NotificationRequest } from 'expo-notifications'

import type { AlarmPayload } from '@nabd/shared'

import {
  cancelPrayerAlarms,
  configureForegroundHandler,
  mapNotificationPermission,
  readNotificationPermission,
  replacePrayerAlarms,
  requestNotificationPermission,
} from '../notifications'

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

function request(identifier: string, value = NOW + 1_000): NotificationRequest {
  return {
    identifier,
    content: {
      title: 'Old',
      body: 'Old body',
      subtitle: null,
      categoryIdentifier: null,
      sound: null,
    },
    trigger: { type: 'date', value, channelId: 'nabd-prayer-adhan-v1' },
  } as NotificationRequest
}

describe('native notification adapter', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockedNotifications.getAllScheduledNotificationsAsync.mockResolvedValue([])
    mockedNotifications.scheduleNotificationAsync.mockResolvedValue('nabd-prayer-101')
    mockedNotifications.cancelScheduledNotificationAsync.mockResolvedValue(undefined)
  })

  it.each([
    [{ status: 'granted', canAskAgain: true }, 'granted'],
    [{ status: 'denied', canAskAgain: true }, 'denied'],
    [{ status: 'denied', canAskAgain: false }, 'blocked'],
    [{ status: 'undetermined', canAskAgain: true }, 'undetermined'],
  ] as const)('maps %p to %s', (response, expected) => {
    expect(mapNotificationPermission(response)).toBe(expected)
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
    expect(mockedNotifications.requestPermissionsAsync).toHaveBeenCalledWith({
      ios: { allowAlert: true, allowSound: true },
    })
  })

  it('cancels and schedules only future prefixed prayer notifications', async () => {
    const oldPrayer = request('nabd-prayer-old')
    const other = request('other-notification')
    mockedNotifications.getAllScheduledNotificationsAsync.mockResolvedValue([oldPrayer, other])

    await replacePrayerAlarms(
      [
        alarm({ id: 201, channelKey: 'adhkarReminder', at: NOW + 120_000 }),
        alarm({ id: 202, at: NOW }),
      ],
      true,
      NOW,
    )

    expect(mockedNotifications.cancelScheduledNotificationAsync).toHaveBeenCalledWith(
      'nabd-prayer-old',
    )
    expect(mockedNotifications.cancelScheduledNotificationAsync).not.toHaveBeenCalledWith(
      'other-notification',
    )
    expect(mockedNotifications.scheduleNotificationAsync).toHaveBeenCalledTimes(1)
    expect(mockedNotifications.scheduleNotificationAsync).toHaveBeenCalledWith({
      identifier: 'nabd-prayer-201',
      content: { title: 'عنوان', body: 'نص' },
      trigger: {
        type: 'date',
        date: NOW + 120_000,
        channelId: 'nabd-adhkar-reminder-alarm-v1',
      },
    })
  })

  it('uses normal channels when silent mode is off', async () => {
    await replacePrayerAlarms([alarm({ channelKey: 'adhanFajr' })], false, NOW)

    expect(mockedNotifications.scheduleNotificationAsync).toHaveBeenCalledWith(
      expect.objectContaining({
        trigger: expect.objectContaining({ channelId: 'nabd-prayer-fajr-v1' }),
      }),
    )
  })

  it('restores the prayer snapshot and rethrows a scheduling failure', async () => {
    const snapshot = request('nabd-prayer-old')
    mockedNotifications.getAllScheduledNotificationsAsync.mockResolvedValue([snapshot])
    const failure = new Error('schedule failed')
    mockedNotifications.scheduleNotificationAsync
      .mockResolvedValueOnce('nabd-prayer-101')
      .mockRejectedValueOnce(failure)

    await expect(
      replacePrayerAlarms([alarm({ id: 101 }), alarm({ id: 102 })], false, NOW),
    ).rejects.toBe(failure)

    expect(mockedNotifications.cancelScheduledNotificationAsync).toHaveBeenCalledWith(
      'nabd-prayer-101',
    )
    expect(mockedNotifications.cancelScheduledNotificationAsync).not.toHaveBeenCalledWith(
      'nabd-prayer-102',
    )
    expect(mockedNotifications.scheduleNotificationAsync).toHaveBeenLastCalledWith({
      identifier: snapshot.identifier,
      content: { title: 'Old', body: 'Old body' },
      trigger: {
        type: 'date',
        date: NOW + 1_000,
        channelId: 'nabd-prayer-adhan-v1',
      },
    })
  })

  it('skips a past Android snapshot during rollback', async () => {
    const snapshot = request('nabd-prayer-old', NOW - 1)
    mockedNotifications.getAllScheduledNotificationsAsync.mockResolvedValue([snapshot])
    const failure = new Error('schedule failed')
    mockedNotifications.scheduleNotificationAsync.mockRejectedValueOnce(failure)

    await expect(replacePrayerAlarms([alarm()], false, NOW)).rejects.toBe(failure)

    expect(mockedNotifications.scheduleNotificationAsync).toHaveBeenCalledTimes(1)
  })

  it('cancels only prefixed identifiers', async () => {
    mockedNotifications.getAllScheduledNotificationsAsync.mockResolvedValue([
      request('nabd-prayer-one'),
      request('other-one'),
      request('nabd-prayer-two'),
    ])

    await cancelPrayerAlarms()

    expect(mockedNotifications.cancelScheduledNotificationAsync).toHaveBeenCalledTimes(2)
    expect(mockedNotifications.cancelScheduledNotificationAsync).toHaveBeenCalledWith(
      'nabd-prayer-one',
    )
    expect(mockedNotifications.cancelScheduledNotificationAsync).toHaveBeenCalledWith(
      'nabd-prayer-two',
    )
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
