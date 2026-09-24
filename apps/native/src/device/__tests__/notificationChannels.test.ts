jest.mock('expo-notifications', () => ({
  AndroidImportance: { HIGH: 6 },
  AndroidAudioUsage: { NOTIFICATION: 5, ALARM: 4 },
  AndroidAudioContentType: { SONIFICATION: 4 },
  AndroidNotificationVisibility: { PUBLIC: 1 },
  setNotificationChannelAsync: jest.fn().mockResolvedValue(null),
}))

import * as Notifications from 'expo-notifications'

import {
  channelFor,
  DEFAULT_CHANNEL_ID,
  ensureChannels,
  NOTIFICATION_CHANNELS,
} from '../notificationChannels'

const mockedNotifications = Notifications as jest.Mocked<typeof Notifications>

describe('notification channels', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it.each([
    ['before', false, 'nabd-prayer-before-v1'],
    ['adhan', false, 'nabd-prayer-adhan-v1'],
    ['adhanFajr', false, 'nabd-prayer-fajr-v1'],
    ['iqamah', false, 'nabd-prayer-iqamah-v1'],
    ['adhkarReminder', false, 'nabd-adhkar-reminder-v1'],
    ['before', true, 'nabd-prayer-before-alarm-v1'],
    ['adhan', true, 'nabd-prayer-adhan-alarm-v1'],
    ['adhanFajr', true, 'nabd-prayer-fajr-alarm-v1'],
    ['iqamah', true, 'nabd-prayer-iqamah-alarm-v1'],
    ['adhkarReminder', true, 'nabd-adhkar-reminder-alarm-v1'],
  ] as const)('selects the %s channel in silentMode=%s', (kind, silentMode, expected) => {
    expect(channelFor(kind, silentMode)).toBe(expected)
  })

  it('uses the normal adhan channel as the default', () => {
    expect(DEFAULT_CHANNEL_ID).toBe(channelFor('adhan', false))
  })

  it('creates every normal and alarm-usage channel with its immutable sound', async () => {
    await ensureChannels()

    expect(mockedNotifications.setNotificationChannelAsync).toHaveBeenCalledTimes(10)
    const calls = mockedNotifications.setNotificationChannelAsync.mock.calls
    for (const [id, config] of calls) {
      const definition = Object.values(NOTIFICATION_CHANNELS).find((entry) =>
        [entry.id, entry.alarmId].includes(id),
      )
      expect(definition).toBeDefined()
      expect(config.name).toBeDefined()
      expect(config.importance).toBe(6)
      expect(config.sound).toBe(definition?.sound)
      expect(config.audioAttributes?.contentType).toBe(4)
    }

    const alarmCalls = calls.filter(([id]) => id.endsWith('-alarm-v1'))
    expect(alarmCalls).toHaveLength(5)
    expect(alarmCalls.every(([, config]) => config.audioAttributes?.usage === 4)).toBe(true)
  })
})
