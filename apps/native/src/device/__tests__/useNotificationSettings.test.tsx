import { act, renderHook, waitFor } from '@testing-library/react-native'
import * as IntentLauncher from 'expo-intent-launcher'
import * as Notifications from 'expo-notifications'
import { useSQLiteContext } from 'expo-sqlite'
import { AppState } from 'react-native'

import { DEFAULT_NOTIFICATION_PREFS } from '@nabd/shared'

import { createDeviceRepository } from '../db'
import { readExactAlarmSnapshot } from '../exactAlarm'
import { androidPackage, openAppSettings } from '../location'
import { requestPrayerReschedule } from '../prayerAlarms'
import { useNotificationSettings } from '../useNotificationSettings'
import { createPreferencesRepository, PREFERENCE_KEYS } from '../../preferences/db'
import { logger } from '../../observability/logger'

jest.mock('expo-sqlite', () => ({ useSQLiteContext: jest.fn() }))
jest.mock('expo-notifications', () => ({
  getPermissionsAsync: jest.fn(),
  requestPermissionsAsync: jest.fn(),
}))
jest.mock('expo-intent-launcher', () => ({
  ActivityAction: {
    APPLICATION_DETAILS_SETTINGS: 'android.settings.APPLICATION_DETAILS_SETTINGS',
    REQUEST_SCHEDULE_EXACT_ALARM: 'android.settings.REQUEST_SCHEDULE_EXACT_ALARM',
  },
  startActivityAsync: jest.fn(),
}))
jest.mock('../exactAlarm', () => ({ readExactAlarmSnapshot: jest.fn() }))
jest.mock('../location', () => ({
  androidPackage: jest.fn(() => 'com.nabd.app'),
  openAppSettings: jest.fn(),
}))
jest.mock('../db', () => ({ createDeviceRepository: jest.fn() }))
jest.mock('../prayerAlarms', () => ({ requestPrayerReschedule: jest.fn() }))
jest.mock('../../preferences/db', () => ({
  ...jest.requireActual('../../preferences/db'),
  createPreferencesRepository: jest.fn(),
}))

const mockedNotifications = Notifications as jest.Mocked<typeof Notifications>
const mockedIntentLauncher = IntentLauncher as jest.Mocked<typeof IntentLauncher>
const mockedUseSQLiteContext = useSQLiteContext as jest.MockedFunction<typeof useSQLiteContext>
const mockedCreateDeviceRepository = createDeviceRepository as jest.MockedFunction<
  typeof createDeviceRepository
>
const mockedCreatePreferencesRepository = createPreferencesRepository as jest.MockedFunction<
  typeof createPreferencesRepository
>
const mockedReadExactAlarmSnapshot = readExactAlarmSnapshot as jest.MockedFunction<
  typeof readExactAlarmSnapshot
>
const mockedOpenAppSettings = openAppSettings as jest.MockedFunction<typeof openAppSettings>
const mockedAndroidPackage = androidPackage as jest.MockedFunction<typeof androidPackage>
const mockedRequestPrayerReschedule = requestPrayerReschedule as jest.MockedFunction<
  typeof requestPrayerReschedule
>
const readPreference = jest.fn()
const writePreference = jest.fn()
const NOW = 1_800_000_000_000
const now = () => NOW

let appStateListener: ((state: string) => void) | undefined

function setStoredValues(overrides: Record<string, string | null> = {}) {
  const values: Record<string, string | null> = {
    [PREFERENCE_KEYS.notificationPrefs]: JSON.stringify({
      ...DEFAULT_NOTIFICATION_PREFS,
      enabled: true,
    }),
    [PREFERENCE_KEYS.silentMode]: '0',
    ...overrides,
  }
  readPreference.mockImplementation(async (key: string) => values[key] ?? null)
}

function setPermission(status: 'granted' | 'denied' | 'undetermined', canAskAgain = true) {
  mockedNotifications.getPermissionsAsync.mockResolvedValue({
    status,
    canAskAgain,
  } as never)
}

function setRequestedPermission(status: 'granted' | 'denied', canAskAgain = true) {
  mockedNotifications.requestPermissionsAsync.mockResolvedValue({
    status,
    canAskAgain,
  } as never)
}

function renderSettings() {
  return renderHook(() => useNotificationSettings({ now }))
}

async function waitForInitialLoad() {
  await waitFor(() => expect(mockedReadExactAlarmSnapshot).toHaveBeenCalledTimes(1))
}

describe('useNotificationSettings', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    jest.restoreAllMocks()
    appStateListener = undefined
    mockedUseSQLiteContext.mockReturnValue({} as never)
    mockedCreatePreferencesRepository.mockReturnValue({
      read: readPreference,
      write: writePreference,
      clear: jest.fn(),
    } as never)
    mockedCreateDeviceRepository.mockReturnValue({
      readLocationCacheState: jest.fn().mockResolvedValue({
        latitude: 30,
        longitude: 31,
        recordedAt: NOW,
        fresh: true,
      }),
    } as never)
    mockedReadExactAlarmSnapshot.mockReturnValue({ apiLevel: 30, access: 'not-required' })
    mockedAndroidPackage.mockReturnValue('com.nabd.app')
    mockedOpenAppSettings.mockResolvedValue({ resultCode: -1 } as never)
    mockedIntentLauncher.startActivityAsync.mockResolvedValue({ resultCode: -1 } as never)
    mockedRequestPrayerReschedule.mockImplementation(() => undefined)
    setStoredValues()
    setPermission('granted')
    setRequestedPermission('granted')
    writePreference.mockResolvedValue(undefined)
    jest.spyOn(AppState, 'addEventListener').mockImplementation((_event, listener) => {
      appStateListener = listener as (state: string) => void
      return { remove: jest.fn() } as never
    })
  })

  afterEach(() => {
    jest.useRealTimers()
  })

  it('requests permission, persists an enabled master switch, and reschedules', async () => {
    setStoredValues({
      [PREFERENCE_KEYS.notificationPrefs]: JSON.stringify({
        ...DEFAULT_NOTIFICATION_PREFS,
        enabled: false,
      }),
    })
    setPermission('denied')
    setRequestedPermission('granted')
    const { result } = renderSettings()
    await waitForInitialLoad()

    await act(async () => {
      await result.current.setEnabled(true)
    })

    expect(mockedNotifications.requestPermissionsAsync).toHaveBeenCalledTimes(1)
    expect(writePreference).toHaveBeenCalledWith(
      PREFERENCE_KEYS.notificationPrefs,
      expect.any(String),
      NOW,
    )
    const stored = JSON.parse(writePreference.mock.calls[0][1] as string)
    expect(stored.enabled).toBe(true)
    expect(mockedRequestPrayerReschedule).toHaveBeenCalledTimes(1)
    expect(result.current.prefs.enabled).toBe(true)
  })

  it('reschedules when the permission action grants access with notifications enabled', async () => {
    setPermission('denied')
    setRequestedPermission('granted')
    const { result } = renderSettings()
    await waitForInitialLoad()

    await act(async () => {
      await result.current.runAction('request-notification-permission')
    })

    expect(result.current.permission).toBe('granted')
    expect(mockedRequestPrayerReschedule).toHaveBeenCalledTimes(1)
  })

  it('reschedules when enabling with an already-enabled preference', async () => {
    setPermission('denied')
    setRequestedPermission('granted')
    const { result } = renderSettings()
    await waitForInitialLoad()

    await act(async () => {
      await result.current.setEnabled(true)
    })

    expect(result.current.permission).toBe('granted')
    expect(writePreference).not.toHaveBeenCalled()
    expect(mockedRequestPrayerReschedule).toHaveBeenCalledTimes(1)
  })

  it('persists disabling the master switch', async () => {
    const { result } = renderSettings()
    await waitForInitialLoad()

    await act(async () => {
      await result.current.setEnabled(false)
    })

    const stored = JSON.parse(writePreference.mock.calls[0][1] as string)
    expect(stored.enabled).toBe(false)
    expect(mockedRequestPrayerReschedule).toHaveBeenCalledTimes(1)
  })

  it('does not persist the master switch when permission is denied', async () => {
    setStoredValues({
      [PREFERENCE_KEYS.notificationPrefs]: JSON.stringify({
        ...DEFAULT_NOTIFICATION_PREFS,
        enabled: false,
      }),
    })
    setPermission('denied')
    setRequestedPermission('denied')
    const { result } = renderSettings()
    await waitForInitialLoad()

    await act(async () => {
      await result.current.setEnabled(true)
    })

    expect(mockedNotifications.requestPermissionsAsync).toHaveBeenCalledTimes(1)
    expect(writePreference).not.toHaveBeenCalled()
    expect(result.current.prefs.enabled).toBe(false)
  })

  it('opens app settings instead of persisting when permission is blocked', async () => {
    setPermission('denied', false)
    const { result } = renderSettings()
    await waitForInitialLoad()

    await act(async () => {
      await result.current.setEnabled(true)
    })

    expect(mockedNotifications.requestPermissionsAsync).not.toHaveBeenCalled()
    expect(mockedOpenAppSettings).toHaveBeenCalledTimes(1)
    expect(writePreference).not.toHaveBeenCalled()
  })

  it('persists moment and silent-mode changes and requests reschedules', async () => {
    const { result } = renderSettings()
    await waitForInitialLoad()

    await act(async () => {
      await result.current.setMoment('atIqamah', false)
      await result.current.setSilentMode(true)
    })

    expect(writePreference).toHaveBeenCalledWith(
      PREFERENCE_KEYS.notificationPrefs,
      expect.any(String),
      NOW,
    )
    const prefsWrite = writePreference.mock.calls.find(
      ([key]) => key === PREFERENCE_KEYS.notificationPrefs,
    )
    expect(JSON.parse(prefsWrite?.[1] as string).atIqamah).toBe(false)
    expect(writePreference).toHaveBeenCalledWith(PREFERENCE_KEYS.silentMode, '1', NOW)
    expect(mockedRequestPrayerReschedule).toHaveBeenCalledTimes(2)
    expect(result.current.prefs.atIqamah).toBe(false)
    expect(result.current.silentMode).toBe(true)
  })

  it('reverts an optimistic write when persistence fails', async () => {
    writePreference.mockRejectedValueOnce(new Error('write failed'))
    const { result } = renderSettings()
    await waitForInitialLoad()

    await act(async () => {
      await result.current.setMoment('atAdhan', false)
    })

    await waitFor(() => expect(result.current.prefs.atAdhan).toBe(true))
    expect(mockedRequestPrayerReschedule).not.toHaveBeenCalled()
    expect(logger.error).toHaveBeenCalled()
  })

  it('opens exact-alarm settings with the app package', async () => {
    mockedReadExactAlarmSnapshot.mockReturnValue({ apiLevel: 31, access: 'denied' })
    const { result } = renderSettings()
    await waitForInitialLoad()

    await act(async () => {
      await result.current.runAction('open-exact-alarm-settings')
    })

    expect(mockedIntentLauncher.startActivityAsync).toHaveBeenCalledWith(
      'android.settings.REQUEST_SCHEDULE_EXACT_ALARM',
      { data: 'package:com.nabd.app' },
    )
  })

  it('falls back to app settings when exact-alarm settings cannot open', async () => {
    mockedIntentLauncher.startActivityAsync.mockRejectedValueOnce(new Error('unavailable'))
    const { result } = renderSettings()
    await waitForInitialLoad()

    await act(async () => {
      await result.current.runAction('open-exact-alarm-settings')
    })

    expect(mockedOpenAppSettings).toHaveBeenCalledTimes(1)
  })

  it('re-reads permission when the app becomes active', async () => {
    setPermission('denied')
    const { result } = renderSettings()
    await waitFor(() => expect(result.current.permission).toBe('denied'))
    mockedNotifications.getPermissionsAsync.mockClear()
    setPermission('granted')

    act(() => appStateListener?.('active'))

    await waitFor(() => expect(result.current.permission).toBe('granted'))
    expect(mockedNotifications.getPermissionsAsync).toHaveBeenCalledTimes(1)
  })

  it('reports missing coordinates from the device repository', async () => {
    mockedCreateDeviceRepository.mockReturnValue({
      readLocationCacheState: jest.fn().mockResolvedValue(null),
    } as never)
    const { result } = renderSettings()

    await waitFor(() => expect(result.current.hasCoordinates).toBe(false))
  })
})
