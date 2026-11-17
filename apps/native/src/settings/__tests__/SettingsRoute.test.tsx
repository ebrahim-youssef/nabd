import { act, fireEvent, render, screen, waitFor } from '@testing-library/react-native'

import { WIRD_LEVELS } from '../../content/levels'
import { DEFAULT_NOTIFICATION_PREFS } from '../../device/logic'
import { useSQLiteContext } from 'expo-sqlite'

import { SettingsRoute } from '../SettingsRoute'
import { deviceCopy } from '../../device/copy'
import { useNotificationSettings } from '../../device/useNotificationSettings'
import { requestPrayerReschedule, setPrayerAlarmSyncOutcome } from '../../device/prayerAlarms'
import { logger } from '../../observability/logger'
import { useBackup, type BackupPreview } from '../../backup/useBackup'
import { createPreferencesRepository, PREFERENCE_KEYS } from '../../preferences/db'
import { useWirdRepository } from '../../wird/useWirdRepository'

const mockSetColorScheme = jest.fn()

jest.mock('expo-sqlite', () => ({ useSQLiteContext: jest.fn() }))
jest.mock('nativewind', () => ({ useColorScheme: () => ({ setColorScheme: mockSetColorScheme }) }))
jest.mock('expo-router', () => ({
  useRouter: () => ({ push: jest.fn() }),
  useFocusEffect: jest.fn(),
}))
jest.mock('../../device/useNotificationSettings', () => ({
  useNotificationSettings: jest.fn(),
}))
jest.mock('../../device/prayerAlarms', () => ({
  ...jest.requireActual('../../device/prayerAlarms'),
  requestPrayerReschedule: jest.fn(),
}))
jest.mock('../../backup/useBackup', () => ({ useBackup: jest.fn() }))
jest.mock('lucide-react-native', () => ({ ArrowRight: () => null, Check: () => null }))
jest.mock('../../preferences/db', () => ({
  PREFERENCE_KEYS: {
    celebratedDay: 'nabd:celebrated-day',
    calculationMethod: 'nabd:prayer-calculation-method',
    latitude: 'nabd:cached-latitude',
    longitude: 'nabd:cached-longitude',
    countdownEnabled: 'nabd:notification-countdown-enabled',
    theme: 'nabd:theme',
  },
  createPreferencesRepository: jest.fn(),
}))
jest.mock('../../preferences/theme', () => ({
  DEFAULT_NATIVE_THEME: 'system',
  SYSTEM_THEME_LABEL: 'حسب الجهاز',
  readStoredTheme: (value: string | null) =>
    value === 'light' || value === 'dark' || value === 'system' ? value : 'system',
}))
jest.mock('../../wird/useWirdRepository', () => ({ useWirdRepository: jest.fn() }))
jest.mock('../LocationSection', () => ({ LocationSection: () => null }))
jest.mock('../SoundPreviewSection', () => ({ SoundPreviewSection: () => null }))
jest.mock('../useCountdownPreference', () => ({
  useCountdownPreference: () => ({ enabled: false, setEnabled: jest.fn(async () => undefined) }),
}))

const mockedUseSQLiteContext = useSQLiteContext as jest.MockedFunction<typeof useSQLiteContext>
const mockedCreatePreferencesRepository = createPreferencesRepository as jest.MockedFunction<
  typeof createPreferencesRepository
>
const mockedUseWirdRepository = useWirdRepository as jest.MockedFunction<typeof useWirdRepository>
const mockedUseNotificationSettings = useNotificationSettings as jest.MockedFunction<
  typeof useNotificationSettings
>
const mockedUseBackup = useBackup as jest.MockedFunction<typeof useBackup>

const readPreference = jest.fn()
const writePreference = jest.fn()
const setWirdLevel = jest.fn()
const setNotificationEnabled = jest.fn(async () => undefined)
const setNotificationMoment = jest.fn(async () => undefined)
const setNotificationSilentMode = jest.fn(async () => undefined)
const runNotificationAction = jest.fn(async () => undefined)
const isNotificationPending = jest.fn((_key: string) => false)
const notificationSettings = {
  permission: 'granted' as const,
  prefs: { ...DEFAULT_NOTIFICATION_PREFS, enabled: true },
  silentMode: false,
  hasCoordinates: true,
  notificationStatus: {
    state: 'ready' as const,
    message: 'الإشعارات مفعّلة.',
    action: null,
  },
  exactAlarmStatus: {
    state: 'settings-required' as const,
    message: 'اسمح بالمنبّهات الدقيقة من إعدادات أندرويد لضبط مواقيت الصلاة.',
    action: {
      type: 'open-exact-alarm-settings' as const,
      label: 'فتح إعدادات المنبّهات الدقيقة',
    },
  },
  isPending: isNotificationPending,
  setEnabled: setNotificationEnabled,
  setMoment: setNotificationMoment,
  setSilentMode: setNotificationSilentMode,
  runAction: runNotificationAction,
} as unknown as ReturnType<typeof useNotificationSettings>

const backupCounts = {
  onboarding_state: 0,
  wird_versions: 0,
  wird_entries: 0,
  qada_events: 0,
  adhkar_flow_progress: 0,
  app_preferences: 1,
}
const backupPreview = {
  backup: {
    formatVersion: 1 as const,
    schemaVersion: 1,
    exportedAt: '2026-10-18T10:00:00.000Z',
    data: {
      onboarding_state: [],
      wird_versions: [],
      wird_entries: [],
      qada_events: [],
      adhkar_flow_progress: [],
      app_preferences: [],
    },
  },
  counts: backupCounts,
} satisfies BackupPreview
const confirmRestore = jest.fn(async () => ({ ok: true as const, value: backupCounts }))

describe('SettingsRoute', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    setPrayerAlarmSyncOutcome('ok')
    jest.useFakeTimers()
    jest.setSystemTime(new Date('2026-09-20T12:00:00.000Z'))
    mockedUseSQLiteContext.mockReturnValue({} as ReturnType<typeof useSQLiteContext>)
    mockedCreatePreferencesRepository.mockReturnValue({
      read: readPreference,
      write: writePreference,
      clear: jest.fn(),
    })
    readPreference.mockImplementation(async (key: string) => {
      const values: Record<string, string> = {
        [PREFERENCE_KEYS.theme]: 'dark',
        [PREFERENCE_KEYS.calculationMethod]: 'umm_al_qura',
      }
      return values[key] ?? null
    })
    Object.assign(notificationSettings, {
      permission: 'granted',
      prefs: { ...DEFAULT_NOTIFICATION_PREFS, enabled: true },
      silentMode: false,
      hasCoordinates: true,
      notificationStatus: {
        state: 'ready',
        message: 'الإشعارات مفعّلة.',
        action: null,
      },
      exactAlarmStatus: {
        state: 'settings-required',
        message: 'اسمح بالمنبّهات الدقيقة من إعدادات أندرويد لضبط مواقيت الصلاة.',
        action: {
          type: 'open-exact-alarm-settings',
          label: 'فتح إعدادات المنبّهات الدقيقة',
        },
      },
    })
    isNotificationPending.mockReturnValue(false)
    setNotificationEnabled.mockResolvedValue(undefined)
    setNotificationMoment.mockResolvedValue(undefined)
    setNotificationSilentMode.mockResolvedValue(undefined)
    runNotificationAction.mockResolvedValue(undefined)
    mockedUseNotificationSettings.mockReturnValue(notificationSettings)
    mockedUseBackup.mockReturnValue({
      cancelRestore: jest.fn(),
      chooseFile: jest.fn(),
      confirmRestore,
      exportBackup: jest.fn(),
      isBusy: false,
      preview: backupPreview,
      status: null,
    })
    mockedUseWirdRepository.mockReturnValue({
      listVersions: jest.fn(async () => [
        {
          id: 'v1',
          effectiveFrom: '2026-09-20',
          definition: WIRD_LEVELS[0].wird,
          createdAt: 1,
        },
      ]),
      getDayEntries: jest.fn(),
      getMonthEntries: jest.fn(),
      getEntriesInRange: jest.fn(),
      getAllEntries: jest.fn(),
      addVersion: jest.fn(),
      appendEntry: jest.fn(),
      healVersionFromLevels: jest.fn(),
      setWirdLevel,
    })
    setWirdLevel.mockResolvedValue({ ok: true, value: undefined })
  })

  afterEach(() => {
    jest.useRealTimers()
  })

  it('renders persisted controls and writes changes for appearance, method, and tomorrow level', async () => {
    const { unmount } = render(<SettingsRoute />)

    await waitFor(() => expect(screen.getByTestId('settings-screen')).toBeTruthy())
    await waitFor(() =>
      expect(screen.getByTestId('level-level-1').props.accessibilityState.selected).toBe(true),
    )
    expect(screen.getByTestId('theme-dark').props.accessibilityState.selected).toBe(true)
    expect(screen.getByTestId('theme-system').props.accessibilityState.selected).toBe(false)
    expect(screen.getByTestId('method-umm_al_qura').props.accessibilityState.selected).toBe(true)

    fireEvent.press(screen.getByTestId('theme-light'))
    fireEvent.press(screen.getByTestId('theme-system'))
    fireEvent.press(screen.getByTestId('theme-dark'))
    fireEvent.press(screen.getByTestId('method-egyptian'))
    fireEvent.press(screen.getByTestId('level-level-2'))

    await waitFor(() => {
      expect(writePreference).toHaveBeenCalledWith(
        PREFERENCE_KEYS.theme,
        'light',
        expect.any(Number),
      )
      expect(writePreference).toHaveBeenCalledWith(
        PREFERENCE_KEYS.theme,
        'system',
        expect.any(Number),
      )
      expect(writePreference).toHaveBeenCalledWith(
        PREFERENCE_KEYS.theme,
        'dark',
        expect.any(Number),
      )
      expect(writePreference).toHaveBeenCalledWith(
        PREFERENCE_KEYS.calculationMethod,
        'egyptian',
        expect.any(Number),
      )
      expect(setWirdLevel).toHaveBeenCalledWith(
        WIRD_LEVELS[1].wird,
        '2026-09-20',
        expect.any(Number),
      )
      expect(mockSetColorScheme).toHaveBeenCalledWith('system')
      expect(mockSetColorScheme).toHaveBeenCalledWith('dark')
      expect(requestPrayerReschedule).toHaveBeenCalledTimes(1)
      expect(readPreference).not.toHaveBeenCalledWith('nabd:mode')
    })

    unmount()
  })

  it('logs a failed calculation-method write without requesting a reschedule', async () => {
    const cause = new Error('write failed')
    writePreference.mockRejectedValueOnce(cause)
    render(<SettingsRoute />)

    await waitFor(() => expect(screen.getByTestId('method-egyptian')).toBeTruthy())
    fireEvent.press(screen.getByTestId('method-egyptian'))

    await waitFor(() =>
      expect(logger.error).toHaveBeenCalledWith(
        'Native prayer calculation method write failed',
        cause,
        { operation: 'change-calculation-method' },
      ),
    )
    expect(requestPrayerReschedule).not.toHaveBeenCalled()
  })

  it('remounts settings state after a successful backup restore', async () => {
    render(<SettingsRoute />)

    await waitFor(() => expect(screen.getByTestId('backup-preview')).toBeTruthy())
    await act(async () => {
      await fireEvent.press(screen.getByTestId('backup-confirm'))
    })

    await waitFor(() => expect(mockedUseNotificationSettings.mock.calls.length).toBeGreaterThan(1))
    await waitFor(() => expect(screen.getByTestId('settings-screen')).toBeTruthy())
    expect(confirmRestore).toHaveBeenCalledTimes(1)
    expect(requestPrayerReschedule).toHaveBeenCalledTimes(1)
  })

  it('renders the notification controls in the settings section', async () => {
    render(<SettingsRoute />)

    await waitFor(() => expect(screen.getByTestId('settings-notifications')).toBeTruthy())
    expect(screen.getByTestId('notification-enabled').props.value).toBe(true)
    expect(screen.getByTestId('notification-moment-beforeAdhan')).toBeTruthy()
    expect(screen.getByTestId('notification-silent-mode')).toBeTruthy()
    expect(screen.getByTestId('notification-exact-alarm')).toBeTruthy()

    fireEvent(screen.getByTestId('notification-moment-atIqamah'), 'valueChange', false)
    fireEvent(screen.getByTestId('notification-alarm-on-silent'), 'valueChange', true)
    fireEvent.press(screen.getByTestId('notification-exact-alarm-action'))

    expect(setNotificationMoment).toHaveBeenCalledWith('atIqamah', false)
    expect(setNotificationSilentMode).toHaveBeenCalledWith(true)
    expect(runNotificationAction).toHaveBeenCalledWith('open-exact-alarm-settings')
  })

  it('shows a retryable alarm-sync failure and hides it after success', async () => {
    setPrayerAlarmSyncOutcome('failed')
    render(<SettingsRoute />)

    await waitFor(() => expect(screen.getByTestId('notification-alarm-sync-failure')).toBeTruthy())
    expect(screen.getByText(deviceCopy.notifications.syncFailed)).toBeTruthy()
    expect(screen.getByTestId('notification-alarm-sync-retry')).toHaveTextContent(
      deviceCopy.actions.retry,
    )

    fireEvent.press(screen.getByTestId('notification-alarm-sync-retry'))
    expect(requestPrayerReschedule).toHaveBeenCalledTimes(1)

    act(() => setPrayerAlarmSyncOutcome('ok'))
    await waitFor(() => expect(screen.queryByTestId('notification-alarm-sync-failure')).toBeNull())
  })

  it('keeps the exact-alarm settings action visible for degraded sync on API 31 or 32', async () => {
    setPrayerAlarmSyncOutcome('degraded')
    Object.assign(notificationSettings, {
      exactAlarmStatus: {
        state: 'settings-required',
        message: deviceCopy.exactAlarm.settingsRequired,
        action: {
          type: 'open-exact-alarm-settings',
          label: deviceCopy.actions.openExactAlarmSettings,
        },
      },
    })

    await render(<SettingsRoute />)

    await waitFor(() =>
      expect(screen.getByTestId('notification-alarm-sync-degraded-notice')).toBeTruthy(),
    )
    expect(screen.getByTestId('notification-exact-alarm')).toBeTruthy()
    expect(screen.getByText(deviceCopy.exactAlarm.settingsRequired)).toBeTruthy()
    expect(screen.getByTestId('notification-exact-alarm-action')).toHaveTextContent(
      deviceCopy.actions.openExactAlarmSettings,
    )
    expect(screen.queryByTestId('notification-alarm-sync-degraded')).toBeNull()
  })

  it('uses app settings for degraded sync with an unavailable exact alarm on API 33 or newer', async () => {
    setPrayerAlarmSyncOutcome('degraded')
    Object.assign(notificationSettings, {
      exactAlarmStatus: {
        state: 'unavailable',
        message: deviceCopy.exactAlarm.unavailable,
        action: { type: 'open-app-settings', label: deviceCopy.actions.openAppSettings },
      },
    })

    await render(<SettingsRoute />)

    await waitFor(() =>
      expect(screen.getByTestId('notification-alarm-sync-degraded-notice')).toBeTruthy(),
    )
    await waitFor(() => expect(screen.getByTestId('notification-exact-alarm')).toBeTruthy())
    expect(screen.getByText(deviceCopy.exactAlarm.unavailable)).toBeTruthy()
    await fireEvent.press(screen.getByTestId('notification-exact-alarm-action'))

    expect(runNotificationAction).toHaveBeenCalledWith('open-app-settings')
  })

  it('offers retry when degraded sync has no exact-alarm action', async () => {
    setPrayerAlarmSyncOutcome('degraded')
    Object.assign(notificationSettings, {
      exactAlarmStatus: {
        state: 'unavailable',
        message: deviceCopy.exactAlarm.unavailable,
        action: null,
      },
    })

    await render(<SettingsRoute />)

    await waitFor(() => expect(screen.getByTestId('notification-exact-alarm')).toBeTruthy())
    expect(screen.getByTestId('notification-exact-alarm-retry')).toHaveTextContent(
      deviceCopy.actions.retry,
    )
    await fireEvent.press(screen.getByTestId('notification-exact-alarm-retry'))

    expect(requestPrayerReschedule).toHaveBeenCalledTimes(1)
  })

  it('shows the notification permission action and hides exact alarms until permission is granted', async () => {
    Object.assign(notificationSettings, {
      permission: 'denied',
      notificationStatus: {
        state: 'permission-required',
        message: deviceCopy.notifications.permissionRequired,
        action: {
          type: 'request-notification-permission',
          label: deviceCopy.actions.requestNotificationPermission,
        },
      },
    })

    await render(<SettingsRoute />)

    await waitFor(() => expect(screen.getByTestId('notification-action')).toBeTruthy())
    expect(screen.queryByTestId('notification-exact-alarm')).toBeNull()
    await fireEvent.press(screen.getByTestId('notification-action'))

    expect(runNotificationAction).toHaveBeenCalledWith('request-notification-permission')
  })

  it('hides degraded exact-alarm guidance until notification permission is granted', async () => {
    setPrayerAlarmSyncOutcome('degraded')
    Object.assign(notificationSettings, {
      permission: 'denied',
      notificationStatus: {
        state: 'permission-required',
        message: deviceCopy.notifications.permissionRequired,
        action: {
          type: 'request-notification-permission',
          label: deviceCopy.actions.requestNotificationPermission,
        },
      },
    })

    await render(<SettingsRoute />)

    await waitFor(() => expect(screen.getByTestId('notification-status')).toBeTruthy())
    expect(screen.queryByTestId('notification-alarm-sync-degraded')).toBeNull()
    expect(screen.queryByTestId('notification-exact-alarm')).toBeNull()
  })

  it('shows recovery guidance for reboot and clock or time-zone changes', async () => {
    await render(<SettingsRoute />)

    await waitFor(() => expect(screen.getByTestId('notification-lifecycle-guidance')).toBeTruthy())
    expect(screen.getByTestId('notification-reboot-recovery')).toHaveTextContent(
      deviceCopy.notifications.rebootRecovery,
    )
    expect(screen.getByTestId('notification-time-change-recovery')).toHaveTextContent(
      deviceCopy.notifications.timeChangeRecovery,
    )
  })

  it.each(['not-required', 'ready'] as const)(
    'hides the exact-alarm row when it is %s',
    async (access) => {
      Object.assign(notificationSettings, {
        exactAlarmStatus: {
          state: access,
          message: 'المنبّهات الدقيقة متاحة.',
          action: null,
        },
      })

      render(<SettingsRoute />)

      await waitFor(() => expect(screen.getByTestId('settings-notifications')).toBeTruthy())
      expect(screen.queryByTestId('notification-exact-alarm')).toBeNull()
    },
  )

  it('shows the location requirement when coordinates are missing', async () => {
    Object.assign(notificationSettings, { hasCoordinates: false })

    render(<SettingsRoute />)

    await waitFor(() => expect(screen.getByTestId('notification-location-required')).toBeTruthy())
  })

  it('disables only the switch whose write is pending', async () => {
    isNotificationPending.mockImplementation((key) => key === 'atIqamah')

    render(<SettingsRoute />)

    await waitFor(() => expect(screen.getByTestId('notification-moment-atIqamah')).toBeTruthy())
    expect(screen.getByTestId('notification-moment-atIqamah').props.disabled).toBe(true)
    expect(screen.getByTestId('notification-moment-atAdhan').props.disabled).toBe(false)
    expect(screen.getByTestId('notification-enabled').props.disabled).toBe(false)
  })
})
