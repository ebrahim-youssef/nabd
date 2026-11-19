import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react-native'
import { AppState } from 'react-native'
import { SettingsRoute } from '../SettingsRoute'
import { deviceCopy } from '../../device/copy'
import { requestPrayerReschedule, setPrayerAlarmSyncOutcome } from '../../device/prayerAlarms'
import { useNotificationSettings } from '../../device/useNotificationSettings'
import { logger } from '../../observability/logger'
import { NATIVE_SETTINGS_COPY } from '../constants'
import { SETTINGS_COPY } from '../copy'

const mockDatabase = {}
const mockPush = jest.fn()
const mockRead = jest.fn(async (_key: string): Promise<string | null> => null)
const mockWrite = jest.fn(async (_key: string, _value: string, _updatedAt: number) => undefined)
const mockEnabled = jest.fn()
const mockMoment = jest.fn()
const mockSilent = jest.fn()
const mockAction = jest.fn()
const mockSetColor = jest.fn()
const mockRefreshWirdDay = jest.fn()
const mockCountdownStatus = jest.fn(() => 'posted')
const mockIsPending = jest.fn((_key: string) => false)
const mockNotifications = {
  permission: 'granted',
  prefs: {
    enabled: true,
    beforeAdhan: false,
    atAdhan: false,
    atIqamah: false,
    morningAdhkar: false,
    eveningAdhkar: false,
  },
  silentMode: false,
  hasCoordinates: true,
  notificationStatus: { state: 'ready', message: 'ready', action: null },
  exactAlarmStatus: { state: 'ready', message: 'ready', action: null },
  isPending: mockIsPending,
  setEnabled: mockEnabled,
  setMoment: mockMoment,
  setSilentMode: mockSilent,
  runAction: mockAction,
}
jest.mock('lucide-react-native', () => ({
  TriangleAlert: () => null,
  ChevronLeft: () => null,
  Check: () => null,
  ArrowRight: () => null,
}))
jest.mock('expo-router', () => ({
  useRouter: () => ({ push: mockPush }),
  useFocusEffect: jest.fn(),
}))
jest.mock('expo-sqlite', () => ({ useSQLiteContext: () => mockDatabase }))
jest.mock('nativewind', () => ({ useColorScheme: () => ({ setColorScheme: mockSetColor }) }))
jest.mock('../../preferences/db', () => ({
  PREFERENCE_KEYS: { theme: 'theme', calculationMethod: 'method' },
  createPreferencesRepository: () => ({ read: mockRead, write: mockWrite }),
}))
jest.mock('../../device/useNotificationSettings', () => ({ useNotificationSettings: jest.fn() }))
jest.mock('../../device/platform', () => ({
  devicePlatform: { getCountdownNotificationStatus: () => mockCountdownStatus() },
}))
jest.mock('../../device/prayerAlarms', () => ({
  ...jest.requireActual('../../device/prayerAlarms'),
  requestPrayerReschedule: jest.fn(),
}))
jest.mock('../../day-plan/WirdTodayProvider', () => ({
  useRefreshWirdDay: () => mockRefreshWirdDay,
}))
jest.mock('../../observability/logger', () => ({ logger: { error: jest.fn() } }))
jest.mock('../../wird/useWirdLevel', () => ({
  useWirdLevel: () => ({ currentLevelId: 'level-1' }),
}))
jest.mock('../LocationSection', () => ({ LocationSection: () => null }))
jest.mock('../SoundPreviewSection', () => ({ SoundPreviewSection: () => null }))
jest.mock('../BatterySection', () => ({ BatterySection: () => null }))
jest.mock('../useCountdownPreference', () => ({
  useCountdownPreference: () => ({ enabled: false, setEnabled: jest.fn() }),
}))

// The two preference reads resolve after several renders; under the parallel full run that
// outlasts the default one-second waitFor.
const SETTINGS_LOAD_TIMEOUT_MS = 5_000

function waitForSettingsLoaded() {
  return waitFor(() => expect(screen.queryByText('جارٍ تحميل الإعدادات…')).toBeNull(), {
    timeout: SETTINGS_LOAD_TIMEOUT_MS,
  })
}

describe('SettingsRoute', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    jest.spyOn(AppState, 'addEventListener').mockImplementation(() => ({ remove: jest.fn() }))
    mockRead.mockReset().mockResolvedValue(null)
    mockWrite.mockReset().mockResolvedValue(undefined)
    mockIsPending.mockReset().mockReturnValue(false)
    mockCountdownStatus.mockReset().mockReturnValue('posted')
    mockRefreshWirdDay.mockReset()
    setPrayerAlarmSyncOutcome('ok')
    jest.mocked(useNotificationSettings).mockReturnValue(mockNotifications as never)
  })

  afterEach(() => {
    jest.restoreAllMocks()
  })
  it('writes the selected theme and opens the level page', async () => {
    render(<SettingsRoute />)
    await waitForSettingsLoaded()
    fireEvent.press(screen.getByRole('radio', { name: 'ليلي' }))
    expect(mockWrite).toHaveBeenCalledWith('theme', 'dark', expect.any(Number))
    fireEvent.press(screen.getByTestId('settings-level-row'))
    expect(mockPush).toHaveBeenCalledWith('/level')
  })
  it('writes each notification preference', () => {
    render(<SettingsRoute />)
    fireEvent.press(screen.getByRole('switch', { name: SETTINGS_COPY.notifications.enable }))
    for (const key of [
      'beforeAdhan',
      'atAdhan',
      'atIqamah',
      'morningAdhkar',
      'eveningAdhkar',
    ] as const) {
      fireEvent.press(screen.getByRole('switch', { name: SETTINGS_COPY.notifications[key] }))
      expect(mockMoment).toHaveBeenCalledWith(key, true)
    }
    fireEvent.press(screen.getByRole('switch', { name: 'التنبيه ولو كان الجهاز صامتًا' }))
    expect(mockEnabled).toHaveBeenCalledWith(false)
    expect(mockSilent).toHaveBeenCalledWith(true)
  })
  it('shows the permission action and disables affected switches with a reason', () => {
    jest.mocked(useNotificationSettings).mockReturnValue({
      ...mockNotifications,
      permission: 'blocked',
      notificationStatus: {
        state: 'blocked',
        message: 'افتح الإعدادات',
        action: { label: 'فتح الإعدادات', type: 'open-app-settings' },
      },
    } as never)
    render(<SettingsRoute />)
    expect(screen.getAllByText('افتح الإعدادات').length).toBeGreaterThan(1)
    expect(
      screen.getByRole('switch', { name: SETTINGS_COPY.notifications.atAdhan }).props
        .accessibilityState.disabled,
    ).toBe(true)
    fireEvent.press(screen.getByRole('button', { name: 'فتح الإعدادات' }))
    expect(mockAction).toHaveBeenCalledWith('open-app-settings')
  })

  it('loads persisted theme and method and writes changes to both', async () => {
    mockRead.mockImplementation(async (key) => {
      if (key === 'theme') return 'dark'
      if (key === 'method') return 'umm_al_qura'
      return null
    })
    render(<SettingsRoute />)
    await waitFor(() => expect(screen.getByRole('radio', { name: 'ليلي' })).toBeChecked())
    expect(
      within(screen.getByTestId('settings-method-row')).getByText('أم القرى (مكة المكرمة)'),
    ).toBeTruthy()
    for (const [label, value] of [
      ['فاتح', 'light'],
      ['حسب الجهاز', 'system'],
      ['ليلي', 'dark'],
    ]) {
      fireEvent.press(screen.getByRole('radio', { name: label }))
      expect(mockWrite).toHaveBeenCalledWith('theme', value, expect.any(Number))
    }
    expect(mockSetColor).toHaveBeenCalledWith('system')
    expect(mockSetColor).toHaveBeenCalledWith('dark')
    fireEvent.press(screen.getByTestId('settings-method-row'))
    fireEvent.press(screen.getByRole('radio', { name: 'الهيئة المصرية العامة للمساحة' }))
    await waitFor(() =>
      expect(mockWrite).toHaveBeenCalledWith('method', 'egyptian', expect.any(Number)),
    )
    expect(requestPrayerReschedule).toHaveBeenCalledTimes(1)
    expect(mockRead).not.toHaveBeenCalledWith('nabd:mode')
  })

  it('logs a failed calculation-method write without requesting a reschedule', async () => {
    const cause = new Error('write failed')
    mockRead.mockResolvedValue(null)
    mockWrite.mockRejectedValueOnce(cause)
    render(<SettingsRoute />)
    await waitForSettingsLoaded()
    fireEvent.press(screen.getByTestId('settings-method-row'))
    fireEvent.press(screen.getByRole('radio', { name: 'الهيئة المصرية العامة للمساحة' }))
    await waitFor(() =>
      expect(logger.error).toHaveBeenCalledWith(
        'Native prayer calculation method write failed',
        cause,
        {
          operation: 'change-calculation-method',
        },
      ),
    )
    expect(requestPrayerReschedule).not.toHaveBeenCalled()
    expect(mockRefreshWirdDay).not.toHaveBeenCalled()
  })

  it('refreshes the wird day after a successful method save', async () => {
    const steps: string[] = []
    mockRead.mockResolvedValue(null)
    mockWrite.mockImplementation(async () => {
      steps.push('saved')
      return undefined
    })
    mockRefreshWirdDay.mockImplementation(() => {
      steps.push('refreshed')
    })
    render(<SettingsRoute />)
    await waitForSettingsLoaded()
    fireEvent.press(screen.getByTestId('settings-method-row'))
    fireEvent.press(screen.getByRole('radio', { name: 'الهيئة المصرية العامة للمساحة' }))
    await waitFor(() => expect(steps).toEqual(['saved', 'refreshed']))
    expect(requestPrayerReschedule).toHaveBeenCalledTimes(1)
    mockRefreshWirdDay.mockReset()
  })

  it('shows a retryable scheduling failure and removes it after success', async () => {
    setPrayerAlarmSyncOutcome('failed')
    render(<SettingsRoute />)
    expect(screen.getAllByText(deviceCopy.notifications.syncFailed).length).toBeGreaterThan(0)
    fireEvent.press(screen.getByRole('button', { name: deviceCopy.actions.retry }))
    expect(requestPrayerReschedule).toHaveBeenCalledTimes(1)
    act(() => setPrayerAlarmSyncOutcome('ok'))
    await waitFor(() => expect(screen.queryByText(deviceCopy.notifications.syncFailed)).toBeNull())
  })

  it('offers exact-alarm settings for degraded sync on API 31 or 32', () => {
    setPrayerAlarmSyncOutcome('degraded')
    jest.mocked(useNotificationSettings).mockReturnValue({
      ...mockNotifications,
      exactAlarmStatus: {
        state: 'settings-required',
        message: deviceCopy.exactAlarm.settingsRequired,
        action: {
          type: 'open-exact-alarm-settings',
          label: deviceCopy.actions.openExactAlarmSettings,
        },
      },
    } as never)
    render(<SettingsRoute />)
    expect(screen.getByText(deviceCopy.notifications.syncDegradedNotice)).toBeTruthy()
    expect(screen.getAllByText(deviceCopy.exactAlarm.settingsRequired).length).toBeGreaterThan(0)
    fireEvent.press(screen.getByRole('button', { name: deviceCopy.actions.openExactAlarmSettings }))
    expect(mockAction).toHaveBeenCalledWith('open-exact-alarm-settings')
  })

  it('opens app settings for degraded sync and unavailable exact alarms on API 33 or newer', () => {
    setPrayerAlarmSyncOutcome('degraded')
    jest.mocked(useNotificationSettings).mockReturnValue({
      ...mockNotifications,
      exactAlarmStatus: {
        state: 'unavailable',
        message: deviceCopy.exactAlarm.unavailable,
        action: { type: 'open-app-settings', label: deviceCopy.actions.openAppSettings },
      },
    } as never)
    render(<SettingsRoute />)
    expect(screen.getByText(deviceCopy.notifications.syncDegradedNotice)).toBeTruthy()
    expect(screen.getAllByText(deviceCopy.exactAlarm.unavailable).length).toBeGreaterThan(0)
    fireEvent.press(screen.getByRole('button', { name: deviceCopy.actions.openAppSettings }))
    expect(mockAction).toHaveBeenCalledWith('open-app-settings')
  })

  it('offers retry when degraded sync has no exact-alarm action', () => {
    setPrayerAlarmSyncOutcome('degraded')
    jest.mocked(useNotificationSettings).mockReturnValue({
      ...mockNotifications,
      exactAlarmStatus: {
        state: 'unavailable',
        message: deviceCopy.exactAlarm.unavailable,
        action: null,
      },
    } as never)
    render(<SettingsRoute />)
    fireEvent.press(screen.getByRole('button', { name: deviceCopy.actions.retry }))
    expect(requestPrayerReschedule).toHaveBeenCalledTimes(1)
  })

  it('offers the notification permission action before showing exact-alarm guidance', () => {
    setPrayerAlarmSyncOutcome('degraded')
    jest.mocked(useNotificationSettings).mockReturnValue({
      ...mockNotifications,
      permission: 'denied',
      notificationStatus: {
        state: 'permission-required',
        message: deviceCopy.notifications.permissionRequired,
        action: {
          type: 'request-notification-permission',
          label: deviceCopy.actions.requestNotificationPermission,
        },
      },
      exactAlarmStatus: {
        state: 'settings-required',
        message: deviceCopy.exactAlarm.settingsRequired,
        action: {
          type: 'open-exact-alarm-settings',
          label: deviceCopy.actions.openExactAlarmSettings,
        },
      },
    } as never)
    render(<SettingsRoute />)
    expect(screen.queryByText(deviceCopy.exactAlarm.settingsRequired)).toBeNull()
    expect(screen.queryByText(deviceCopy.notifications.syncDegradedNotice)).toBeNull()
    fireEvent.press(
      screen.getByRole('button', { name: deviceCopy.actions.requestNotificationPermission }),
    )
    expect(mockAction).toHaveBeenCalledWith('request-notification-permission')
  })

  it('shows recovery guidance for reboot and clock or time-zone changes', () => {
    render(<SettingsRoute />)
    expect(screen.getByText(deviceCopy.notifications.recoveryHeading)).toBeTruthy()
    expect(screen.getByText(deviceCopy.notifications.rebootRecovery)).toBeTruthy()
    expect(screen.getByText(deviceCopy.notifications.timeChangeRecovery)).toBeTruthy()
  })

  it.each(['ready', 'not-required'] as const)('hides exact-alarm guidance when %s', (state) => {
    jest.mocked(useNotificationSettings).mockReturnValue({
      ...mockNotifications,
      exactAlarmStatus: { state, message: 'المنبّهات متاحة', action: null },
    } as never)
    render(<SettingsRoute />)
    expect(screen.queryByText('المنبّهات متاحة')).toBeNull()
  })

  it('shows the location requirement when coordinates are missing', () => {
    jest.mocked(useNotificationSettings).mockReturnValue({
      ...mockNotifications,
      hasCoordinates: false,
    } as never)
    render(<SettingsRoute />)
    expect(screen.getByText(SETTINGS_COPY.notifications.locationRequired)).toBeTruthy()
  })

  it('disables only the switch whose write is pending', () => {
    mockIsPending.mockImplementation((key) => key === 'atIqamah')
    render(<SettingsRoute />)
    expect(
      screen.getByRole('switch', { name: SETTINGS_COPY.notifications.atIqamah }),
    ).toBeDisabled()
    expect(screen.getByRole('switch', { name: SETTINGS_COPY.notifications.atAdhan })).toBeEnabled()
    expect(screen.getByRole('switch', { name: SETTINGS_COPY.notifications.enable })).toBeEnabled()
  })

  it('shows the blocked countdown warning and disables its switch with a reason', async () => {
    mockCountdownStatus.mockReturnValue('channel-blocked')
    render(<SettingsRoute />)
    await waitFor(() =>
      expect(
        screen.getAllByText(NATIVE_SETTINGS_COPY.notifications.countdownBlocked).length,
      ).toBeGreaterThan(1),
    )
    expect(
      screen.getByRole('switch', { name: NATIVE_SETTINGS_COPY.notifications.countdownTitle }),
    ).toBeDisabled()
    fireEvent.press(screen.getByRole('button', { name: deviceCopy.actions.openAppSettings }))
    expect(mockAction).toHaveBeenCalledWith('open-app-settings')
  })

  it('hides the blocked countdown warning when the channel is available', () => {
    render(<SettingsRoute />)
    expect(screen.queryByText(NATIVE_SETTINGS_COPY.notifications.countdownBlocked)).toBeNull()
    expect(
      screen.getByRole('switch', { name: NATIVE_SETTINGS_COPY.notifications.countdownTitle }),
    ).toBeEnabled()
  })

  it('rereads countdown status when the app becomes active', async () => {
    const listeners: ((
      state: 'active' | 'background' | 'inactive' | 'unknown' | 'extension',
    ) => void)[] = []
    const spy = jest.spyOn(AppState, 'addEventListener').mockImplementation((_event, listener) => {
      listeners.push(listener)
      return { remove: jest.fn() }
    })
    const view = render(<SettingsRoute />)
    mockCountdownStatus.mockReturnValue('channel-blocked')
    act(() => listeners.forEach((listener) => listener('active')))
    await waitFor(() =>
      expect(
        screen.getAllByText(NATIVE_SETTINGS_COPY.notifications.countdownBlocked).length,
      ).toBeGreaterThan(1),
    )
    expect(mockCountdownStatus).toHaveBeenCalledTimes(2)
    view.unmount()
    spy.mockRestore()
  })

  it('disables countdown when notification permission is denied', () => {
    jest.mocked(useNotificationSettings).mockReturnValue({
      ...mockNotifications,
      permission: 'denied',
      notificationStatus: {
        state: 'permission-required',
        message: deviceCopy.notifications.permissionRequired,
        action: null,
      },
    } as never)
    render(<SettingsRoute />)
    expect(
      screen.getByRole('switch', { name: NATIVE_SETTINGS_COPY.notifications.countdownTitle }),
    ).toBeDisabled()
  })

  it('disables countdown when notifications are switched off', () => {
    jest.mocked(useNotificationSettings).mockReturnValue({
      ...mockNotifications,
      prefs: { ...mockNotifications.prefs, enabled: false },
    } as never)
    render(<SettingsRoute />)
    expect(
      screen.getByRole('switch', { name: NATIVE_SETTINGS_COPY.notifications.countdownTitle }),
    ).toBeDisabled()
  })
})
