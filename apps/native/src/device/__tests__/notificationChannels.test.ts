jest.mock('expo-notifications', () => ({
  AndroidImportance: { HIGH: 6 },
  AndroidAudioUsage: { NOTIFICATION: 5, ALARM: 4 },
  AndroidAudioContentType: { SONIFICATION: 4 },
  AndroidNotificationVisibility: { PUBLIC: 1 },
  setNotificationChannelAsync: jest.fn().mockResolvedValue(null),
}))

import * as Notifications from 'expo-notifications'

import { channelFor, ensureChannels } from '../notificationChannels'

const mockedNotifications = Notifications as jest.Mocked<typeof Notifications>

const CHANNEL_CASES = [
  {
    kind: 'before',
    normal: 'nabd-prayer-before-v1',
    alarm: 'nabd-prayer-before-alarm-v1',
    sound: 'before.mp3',
  },
  {
    kind: 'adhan',
    normal: 'nabd-prayer-adhan-v1',
    alarm: 'nabd-prayer-adhan-alarm-v1',
    sound: 'adhan.mp3',
  },
  {
    kind: 'adhanFajr',
    normal: 'nabd-prayer-fajr-v1',
    alarm: 'nabd-prayer-fajr-alarm-v1',
    sound: 'adhan_fajr.mp3',
  },
  {
    kind: 'iqamah',
    normal: 'nabd-prayer-iqamah-v1',
    alarm: 'nabd-prayer-iqamah-alarm-v1',
    sound: 'iqama.mp3',
  },
  {
    kind: 'adhkarReminder',
    normal: 'nabd-adhkar-reminder-v1',
    alarm: 'nabd-adhkar-reminder-alarm-v1',
    sound: 'before.mp3',
  },
] as const

describe('notification channels', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it.each(CHANNEL_CASES)(
    'selects the normal and alarm $kind channels',
    ({ kind, normal, alarm }) => {
      expect(channelFor(kind, false)).toBe(normal)
      expect(channelFor(kind, true)).toBe(alarm)
    },
  )

  it('creates every normal and alarm-usage channel with its immutable sound', async () => {
    await ensureChannels()

    expect(mockedNotifications.setNotificationChannelAsync).toHaveBeenCalledTimes(10)
    const calls = mockedNotifications.setNotificationChannelAsync.mock.calls
    CHANNEL_CASES.forEach(({ normal, alarm, sound }, index) => {
      const [normalId, normalConfig] = calls[index * 2]
      const [alarmId, alarmConfig] = calls[index * 2 + 1]

      expect(normalId).toBe(normal)
      expect(normalConfig.name).toBeDefined()
      expect(normalConfig.importance).toBe(6)
      expect(normalConfig.sound).toBe(sound)
      expect(normalConfig.audioAttributes).toMatchObject({ usage: 5, contentType: 4 })

      expect(alarmId).toBe(alarm)
      expect(alarmConfig.name).toBeDefined()
      expect(alarmConfig.importance).toBe(6)
      expect(alarmConfig.sound).toBe(sound)
      expect(alarmConfig.audioAttributes).toMatchObject({ usage: 4, contentType: 4 })
    })
  })
})
