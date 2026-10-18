import { DEFAULT_NOTIFICATION_PREFS, ONBOARDING_COPY, QUESTIONS, WIRD_LEVELS } from '@nabd/shared'
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native'
import { useSQLiteContext } from 'expo-sqlite'

import { deviceCopy } from '../../device/copy'
import { useBatteryOptimization } from '../../device/useBatteryOptimization'
import { useLocationCapability } from '../../device/useLocationCapability'
import { useNotificationSettings } from '../../device/useNotificationSettings'
import { OnboardingGate } from '../OnboardingGate'
import { NATIVE_ONBOARDING_COPY } from '../copy'
import type { OnboardingDatabase } from '../db'

jest.mock('expo-sqlite', () => ({ useSQLiteContext: jest.fn() }))
jest.mock('expo-router', () => ({ useFocusEffect: jest.fn() }))
jest.mock('../../device/useBatteryOptimization', () => ({
  useBatteryOptimization: jest.fn(),
}))
jest.mock('../../device/useLocationCapability', () => ({
  useLocationCapability: jest.fn(),
}))
jest.mock('../../device/useNotificationSettings', () => ({
  useNotificationSettings: jest.fn(),
}))

const mockedUseSQLiteContext = useSQLiteContext as jest.MockedFunction<typeof useSQLiteContext>
const mockedUseBatteryOptimization = useBatteryOptimization as jest.MockedFunction<
  typeof useBatteryOptimization
>
const mockedUseLocationCapability = useLocationCapability as jest.MockedFunction<
  typeof useLocationCapability
>
const mockedUseNotificationSettings = useNotificationSettings as jest.MockedFunction<
  typeof useNotificationSettings
>
const FIXED_DATE = new Date(2026, 7, 10, 0, 30)
const NOW = () => FIXED_DATE

type StateRow = {
  answers_json: string
  selected_level_id: string
  completed_at: number
  effective_from: string
  wird_version_id: string
}
type VersionRow = {
  id: string
  effective_from: string
  definition_json: string
  created_at: number
}

function createPersistedDatabase() {
  let state: StateRow | null = null
  const versions = new Map<string, VersionRow>()
  const database: OnboardingDatabase = {
    getFirstAsync: async <T,>(source: string, ...parameters: (string | number | null)[]) => {
      if (source.includes('onboarding_state')) return state as T | null
      if (source.includes('LIMIT 1')) return ([...versions.values()][0] ?? null) as T | null
      return (versions.get(String(parameters[0])) ?? null) as T | null
    },
    runAsync: jest.fn(
      async (source: string, ...parameters: (string | number | null)[]): Promise<unknown> => {
        if (source.includes('INSERT INTO wird_versions')) {
          versions.set(String(parameters[0]), {
            id: String(parameters[0]),
            effective_from: String(parameters[1]),
            definition_json: String(parameters[2]),
            created_at: Number(parameters[3]),
          })
        }
        if (source.includes('INSERT INTO onboarding_state')) {
          state = {
            answers_json: String(parameters[1]),
            selected_level_id: String(parameters[2]),
            completed_at: Number(parameters[3]),
            effective_from: String(parameters[4]),
            wird_version_id: String(parameters[5]),
          }
        }
        return undefined
      },
    ),
    withExclusiveTransactionAsync: async (task) => task(database),
  }
  return { database, state: () => state }
}

async function renderGate(database: OnboardingDatabase) {
  mockedUseSQLiteContext.mockReturnValue(database as never)
  return render(<OnboardingGate now={NOW} />)
}

async function reachPermissions(database: OnboardingDatabase) {
  const view = await renderGate(database)
  await screen.findByTestId('onboarding-welcome')
  await fireEvent.press(screen.getByTestId('onboarding-begin'))
  for (const question of QUESTIONS) {
    await fireEvent.press(screen.getByTestId(`answer-${question.id}-${question.options[0].id}`))
  }
  await fireEvent.press(screen.getByTestId('onboarding-submit'))
  await screen.findByTestId('onboarding-level')
  await fireEvent.press(screen.getByTestId(`level-${WIRD_LEVELS[0].id}`))
  await fireEvent.press(screen.getByTestId('onboarding-confirm'))
  await screen.findByTestId('onboarding-permissions')
  return view
}

describe('OnboardingGate', () => {
  beforeEach(() => {
    mockedUseBatteryOptimization.mockReturnValue({
      status: 'optimized',
      request: jest.fn(),
    })
    mockedUseLocationCapability.mockReturnValue({
      status: {
        state: 'ready',
        message: deviceCopy.location.ready,
        action: null,
      },
      coordinates: { latitude: 30, longitude: 31 },
      isRefreshing: false,
      refresh: jest.fn(),
      runAction: jest.fn(),
    })
    mockedUseNotificationSettings.mockReturnValue({
      permission: 'undetermined',
      prefs: { ...DEFAULT_NOTIFICATION_PREFS },
      silentMode: false,
      hasCoordinates: true,
      notificationStatus: {
        state: 'permission-required',
        message: deviceCopy.notifications.permissionRequired,
        action: {
          type: 'request-notification-permission',
          label: deviceCopy.actions.requestNotificationPermission,
        },
      },
      exactAlarmStatus: { state: 'not-required', message: '', action: null },
      isPending: jest.fn(() => false),
      setEnabled: jest.fn(),
      setMoment: jest.fn(),
      setSilentMode: jest.fn(),
      runAction: jest.fn(),
    })
  })

  it('renders retryable error and complete welcome content', async () => {
    const loadingDatabase: OnboardingDatabase = {
      getFirstAsync: jest.fn(async () => null),
      runAsync: jest.fn(),
      withExclusiveTransactionAsync: jest.fn(),
    }
    const view = await renderGate(loadingDatabase)
    await screen.findByTestId('onboarding-welcome')
    for (const point of ONBOARDING_COPY.welcomePoints) {
      expect(screen.getByText(point)).toBeTruthy()
    }
    view.unmount()

    const failingDatabase: OnboardingDatabase = {
      ...loadingDatabase,
      getFirstAsync: jest.fn(async () => Promise.reject(new Error('SQLite unavailable'))),
    }
    await renderGate(failingDatabase)
    await screen.findByTestId('gate-error')
    expect(screen.getByRole('button', { name: 'إعادة المحاولة' })).toBeTruthy()
  })

  it('completes the reference questionnaire, permits a manual level, and restores after remount', async () => {
    const persisted = createPersistedDatabase()
    const firstMount = await renderGate(persisted.database)
    await screen.findByTestId('onboarding-welcome')
    await fireEvent.press(screen.getByTestId('onboarding-begin'))

    expect(screen.getAllByRole('radio')).toHaveLength(
      QUESTIONS.reduce((total, question) => total + question.options.length, 0),
    )
    for (const question of QUESTIONS) {
      await fireEvent.press(screen.getByTestId(`answer-${question.id}-${question.options[0].id}`))
    }
    await fireEvent.press(screen.getByTestId('onboarding-submit'))

    await screen.findByTestId('onboarding-level')
    await fireEvent.press(screen.getByTestId(`level-${WIRD_LEVELS[0].id}`))
    expect(screen.getByTestId(`level-${WIRD_LEVELS[0].id}`).props.accessibilityState.checked).toBe(
      true,
    )
    await fireEvent.press(screen.getByTestId('onboarding-confirm'))
    expect(screen.getByTestId('onboarding-permissions')).toBeTruthy()
    expect(persisted.database.runAsync).not.toHaveBeenCalled()
    await fireEvent.press(screen.getByTestId('onboarding-permissions-continue'))
    await screen.findByTestId('onboarding-power')
    await fireEvent.press(screen.getByTestId('onboarding-finish'))
    await fireEvent.press(screen.getByTestId('onboarding-finish'))

    await screen.findByTestId('home-shell')
    expect(screen.getByText(WIRD_LEVELS[0].title)).toBeTruthy()
    expect(persisted.database.runAsync).toHaveBeenCalledTimes(2)
    expect(persisted.state()?.effective_from).toBe('2026-08-10')

    firstMount.unmount()
    await renderGate(persisted.database)
    await waitFor(() => expect(screen.getByTestId('home-shell')).toBeTruthy())
    expect(screen.getByText(WIRD_LEVELS[0].title)).toBeTruthy()
  })

  it('shows permissions before the optimized battery step', async () => {
    const persisted = createPersistedDatabase()
    const view = await renderGate(persisted.database)
    await screen.findByTestId('onboarding-welcome')
    await fireEvent.press(screen.getByTestId('onboarding-begin'))
    for (const question of QUESTIONS) {
      await fireEvent.press(screen.getByTestId(`answer-${question.id}-${question.options[0].id}`))
    }
    await fireEvent.press(screen.getByTestId('onboarding-submit'))
    await screen.findByTestId('onboarding-level')
    await fireEvent.press(screen.getByTestId(`level-${WIRD_LEVELS[0].id}`))
    await fireEvent.press(screen.getByTestId('onboarding-confirm'))

    expect(screen.getByTestId('onboarding-permissions')).toBeTruthy()
    expect(screen.queryByTestId('onboarding-power')).toBeNull()
    await fireEvent.press(screen.getByTestId('onboarding-permissions-continue'))
    expect(screen.getByTestId('onboarding-power')).toBeTruthy()

    view.unmount()
  })

  it.each(['exempt', 'unsupported'] as const)(
    'skips the power step when battery optimization is %s',
    async (status) => {
      mockedUseBatteryOptimization.mockReturnValue({ status, request: jest.fn() })
      const persisted = createPersistedDatabase()
      const view = await reachPermissions(persisted.database)

      expect(screen.getByRole('button', { name: ONBOARDING_COPY.finish })).toBeTruthy()
      await fireEvent.press(screen.getByTestId('onboarding-permissions-continue'))
      await screen.findByTestId('home-shell')
      expect(screen.queryByTestId('onboarding-power')).toBeNull()
      expect(persisted.database.runAsync).toHaveBeenCalledTimes(2)

      view.unmount()
    },
  )

  it('keeps the power step finishable after requesting an exemption', async () => {
    const request = jest.fn()
    mockedUseBatteryOptimization.mockReturnValue({ status: 'optimized', request })
    const persisted = createPersistedDatabase()
    const view = await reachPermissions(persisted.database)

    await fireEvent.press(screen.getByTestId('onboarding-permissions-continue'))
    await screen.findByTestId('onboarding-power')
    await fireEvent.press(screen.getByTestId('onboarding-power-enable'))
    expect(request).toHaveBeenCalledTimes(1)
    await fireEvent.press(screen.getByTestId('onboarding-finish'))
    await screen.findByTestId('home-shell')
    expect(persisted.database.runAsync).toHaveBeenCalledTimes(2)

    view.unmount()
  })

  it('shows the granted location state without a request button', async () => {
    const view = await reachPermissions(createPersistedDatabase().database)

    expect(screen.getByText(ONBOARDING_COPY.locationGranted)).toBeTruthy()
    expect(screen.queryByTestId('onboarding-location')).toBeNull()

    view.unmount()
  })

  it.each([
    ['permission-required', deviceCopy.location.permissionRequired, ONBOARDING_COPY.locationButton],
    ['settings-required', deviceCopy.location.settingsRequired, deviceCopy.actions.openAppSettings],
    ['gps-disabled', deviceCopy.location.gpsDisabled, deviceCopy.actions.openLocationSettings],
  ] as const)('renders the actionable location state %s', async (state, message, actionLabel) => {
    const runAction = jest.fn()
    mockedUseLocationCapability.mockReturnValue({
      status: {
        state,
        message,
        action: {
          type:
            state === 'permission-required'
              ? 'retry-location'
              : state === 'settings-required'
                ? 'open-app-settings'
                : 'open-location-settings',
          label: actionLabel,
        },
      },
      coordinates: null,
      isRefreshing: false,
      refresh: jest.fn(),
      runAction,
    } as never)
    const view = await reachPermissions(createPersistedDatabase().database)

    expect(screen.getByText(message)).toBeTruthy()
    await fireEvent.press(screen.getByTestId('onboarding-location'))
    expect(runAction).toHaveBeenCalledTimes(1)

    view.unmount()
  })

  it('shows all five notification moments with their stored defaults after granting', async () => {
    mockedUseNotificationSettings.mockReturnValue({
      permission: 'granted',
      prefs: { ...DEFAULT_NOTIFICATION_PREFS, enabled: true },
      silentMode: false,
      hasCoordinates: true,
      notificationStatus: { state: 'ready', message: deviceCopy.notifications.ready, action: null },
      exactAlarmStatus: { state: 'not-required', message: '', action: null },
      isPending: jest.fn(() => false),
      setEnabled: jest.fn(),
      setMoment: jest.fn(),
      setSilentMode: jest.fn(),
      runAction: jest.fn(),
    })
    const view = await reachPermissions(createPersistedDatabase().database)

    expect(screen.getByTestId('onboarding-notification-moments')).toBeTruthy()
    const moments = [
      ['beforeAdhan', ONBOARDING_COPY.momentBefore],
      ['atAdhan', ONBOARDING_COPY.momentAdhan],
      ['atIqamah', ONBOARDING_COPY.momentIqamah],
      ['morningAdhkar', ONBOARDING_COPY.momentMorningAdhkar],
      ['eveningAdhkar', ONBOARDING_COPY.momentEveningAdhkar],
    ] as const
    for (const [key, label] of moments) {
      expect(screen.getByText(label)).toBeTruthy()
      expect(screen.getByTestId(`onboarding-moment-${key}`).props.value).toBe(
        DEFAULT_NOTIFICATION_PREFS[key],
      )
    }

    view.unmount()
  })

  it('enables notifications after a denied retry grants permission', async () => {
    const runAction = jest.fn()
    let rerender: ReturnType<typeof render>['rerender'] | undefined
    const deniedNotifications = {
      permission: 'denied' as 'denied' | 'granted',
      prefs: { ...DEFAULT_NOTIFICATION_PREFS, enabled: false },
      silentMode: false,
      hasCoordinates: true,
      notificationStatus: {
        state: 'permission-required' as const,
        message: deviceCopy.notifications.permissionRequired,
        action: {
          type: 'request-notification-permission' as const,
          label: deviceCopy.actions.requestNotificationPermission,
        },
      },
      exactAlarmStatus: { state: 'not-required' as const, message: '', action: null },
      isPending: jest.fn(() => false),
      setEnabled: jest.fn(async (value: boolean) => {
        if (!value) return
        deniedNotifications.permission = 'granted'
        deniedNotifications.prefs.enabled = true
        rerender?.(<OnboardingGate now={NOW} />)
      }),
      setMoment: jest.fn(),
      setSilentMode: jest.fn(),
      runAction,
    }
    mockedUseBatteryOptimization.mockReturnValue({ status: 'exempt', request: jest.fn() })
    mockedUseNotificationSettings.mockReturnValue(deniedNotifications)
    const persisted = createPersistedDatabase()
    const view = await reachPermissions(persisted.database)
    rerender = view.rerender

    expect(screen.getByText(NATIVE_ONBOARDING_COPY.notificationsDenied)).toBeTruthy()
    expect(screen.getByTestId('onboarding-notifications').props.disabled).toBe(true)
    expect(screen.getByTestId('onboarding-notifications').props.accessibilityState.disabled).toBe(
      true,
    )
    await fireEvent.press(screen.getByTestId('onboarding-notifications-retry'))
    expect(deniedNotifications.setEnabled).toHaveBeenCalledWith(true)
    expect(runAction).not.toHaveBeenCalled()
    expect(deniedNotifications.permission).toBe('granted')
    expect(deniedNotifications.prefs.enabled).toBe(true)
    expect(screen.getByTestId('onboarding-notification-moments')).toBeTruthy()
    expect(screen.getAllByRole('switch')).toHaveLength(6)

    view.unmount()
  })

  it('routes blocked notifications to app settings', async () => {
    const runAction = jest.fn()
    mockedUseNotificationSettings.mockReturnValue({
      permission: 'blocked',
      prefs: { ...DEFAULT_NOTIFICATION_PREFS, enabled: false },
      silentMode: false,
      hasCoordinates: true,
      notificationStatus: {
        state: 'settings-required',
        message: deviceCopy.notifications.settingsRequired,
        action: {
          type: 'open-app-settings',
          label: deviceCopy.actions.openAppSettings,
        },
      },
      exactAlarmStatus: { state: 'not-required', message: '', action: null },
      isPending: jest.fn(() => false),
      setEnabled: jest.fn(),
      setMoment: jest.fn(),
      setSilentMode: jest.fn(),
      runAction,
    })
    const view = await reachPermissions(createPersistedDatabase().database)

    expect(screen.getByTestId('onboarding-notifications').props.disabled).toBe(true)
    expect(screen.getByTestId('onboarding-notifications').props.accessibilityState.disabled).toBe(
      true,
    )
    await fireEvent.press(screen.getByTestId('onboarding-notifications-settings'))
    expect(runAction).toHaveBeenCalledWith('open-app-settings')

    view.unmount()
  })
})
