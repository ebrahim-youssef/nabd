import {
  CALCULATION_METHODS,
  DEFAULT_METHOD_ID,
  SETTINGS_COPY,
  WIRD_LEVELS,
  shellCopy,
  toDayId,
  type CalculationMethodId,
  type Mode,
  type Theme,
} from '@nabd/shared'
import { useRouter } from 'expo-router'
import { useSQLiteContext } from 'expo-sqlite'
import { useColorScheme } from 'nativewind'
import { useEffect, useMemo, useState } from 'react'
import { Pressable, Text, View } from 'react-native'

import { ScreenContainer } from '../app/ScreenContainer'
import { deviceCopy } from '../device/copy'
import {
  createPreferencesRepository,
  PREFERENCE_KEYS,
  readStoredMode,
  readStoredTheme,
} from '../preferences/db'
import type { DeviceAction, DeviceActionType } from '../device/types'
import { useDeviceCapabilities } from '../device/useDeviceCapabilities'
import { usePrayerSchedule } from '../device/usePrayerSchedule'
import { useWirdLevel } from '../wird/useWirdLevel'

type SettingsState = {
  theme: Theme
  mode: Mode
  methodId: CalculationMethodId
}

const THEME_OPTIONS: readonly { id: Theme; label: string }[] = [
  { id: 'light', label: SETTINGS_COPY.appearance.light },
  { id: 'dark', label: SETTINGS_COPY.appearance.dark },
]

const MODE_OPTIONS: readonly { id: Mode; label: string; description: string }[] = [
  {
    id: 'classic',
    label: SETTINGS_COPY.appearance.classic.title,
    description: SETTINGS_COPY.appearance.classic.description,
  },
  {
    id: 'modern',
    label: SETTINGS_COPY.appearance.modern.title,
    description: SETTINGS_COPY.appearance.modern.description,
  },
]

function OptionButton({
  label,
  selected,
  onPress,
  testID,
  description,
  disabled = false,
}: {
  label: string
  selected: boolean
  onPress: () => void
  testID: string
  description?: string
  disabled?: boolean
}) {
  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityState={{ selected, disabled }}
      className={`rounded-card border p-3 ${selected ? 'border-primary bg-primary/10' : 'border-border bg-surface'} ${disabled ? 'opacity-50' : ''}`}
      disabled={disabled}
      onPress={onPress}
      testID={testID}
    >
      <Text className="text-body text-start text-foreground">{label}</Text>
      {description ? (
        <Text className="text-small mt-1 text-start text-muted-foreground">{description}</Text>
      ) : null}
    </Pressable>
  )
}

export function SettingsRoute() {
  const database = useSQLiteContext()
  const router = useRouter()
  const { setColorScheme } = useColorScheme()
  const preferences = useMemo(() => createPreferencesRepository(database), [database])
  const { currentLevelId, canChangeLevel, changeLevel, isLoading: isLevelLoading } = useWirdLevel()
  const device = useDeviceCapabilities()
  const schedule = usePrayerSchedule()
  const [hydrated, setHydrated] = useState(false)
  const [hydrationError, setHydrationError] = useState<unknown>()
  const [actionError, setActionError] = useState<unknown>()
  const [state, setState] = useState<SettingsState>({
    theme: 'light',
    mode: 'classic',
    methodId: DEFAULT_METHOD_ID,
  })

  useEffect(() => {
    let active = true
    void Promise.all([
      preferences.read(PREFERENCE_KEYS.theme),
      preferences.read(PREFERENCE_KEYS.mode),
      preferences.read(PREFERENCE_KEYS.calculationMethod),
    ])
      .then(([theme, mode, method]) => {
        if (!active) return
        const nextTheme = readStoredTheme(theme)
        setState({
          theme: nextTheme,
          mode: readStoredMode(mode),
          methodId: CALCULATION_METHODS.some((entry) => entry.id === method)
            ? (method as CalculationMethodId)
            : DEFAULT_METHOD_ID,
        })
        setColorScheme(nextTheme)
        setHydrated(true)
      })
      .catch((cause: unknown) => {
        if (!active) return
        setState({ theme: 'light', mode: 'classic', methodId: DEFAULT_METHOD_ID })
        setColorScheme('light')
        setHydrationError(cause)
        setHydrated(true)
      })
    return () => {
      active = false
    }
  }, [preferences, setColorScheme])

  function writePreference(
    key: (typeof PREFERENCE_KEYS)[keyof typeof PREFERENCE_KEYS],
    value: string,
    updatedAt: number,
  ) {
    void preferences.write(key, value, updatedAt)
  }

  function changeTheme(theme: Theme, updatedAt: number) {
    setState((previous) => ({ ...previous, theme }))
    setColorScheme(theme)
    writePreference(PREFERENCE_KEYS.theme, theme, updatedAt)
  }

  function changeMode(mode: Mode, updatedAt: number) {
    setState((previous) => ({ ...previous, mode }))
    writePreference(PREFERENCE_KEYS.mode, mode, updatedAt)
  }

  async function changeMethod(methodId: CalculationMethodId, updatedAt: number) {
    const previousMethodId = state.methodId
    setState((previous) => ({ ...previous, methodId }))
    try {
      await preferences.write(PREFERENCE_KEYS.calculationMethod, methodId, updatedAt)
      await schedule.sync()
      setActionError(undefined)
    } catch (cause) {
      setState((previous) => ({ ...previous, methodId: previousMethodId }))
      try {
        await preferences.write(PREFERENCE_KEYS.calculationMethod, previousMethodId, updatedAt)
      } catch {
        // Keep the in-memory rollback and surface the original failure.
      }
      setActionError(cause)
    }
  }

  async function handleNotificationAction(type: DeviceActionType) {
    if (type === 'enable-notifications') {
      await schedule.setNotificationEnabled(true)
      return
    }
    await device.handleAction(type)
  }

  async function handleLocationAction(type: DeviceActionType) {
    if (type === 'retry-location') {
      const result = await device.requestLocation()
      if (result.ok) await schedule.sync()
      return
    }
    await device.handleAction(type)
    if (type === 'open-location-settings') {
      await device.refresh()
      await schedule.sync()
    }
  }

  return (
    <ScreenContainer testID="settings-screen">
      <View className="gap-6">
        <Text accessibilityRole="header" className="text-title text-start text-primary">
          {shellCopy.nav.settings}
        </Text>
        {!hydrated ? (
          <Text className="text-body text-start text-muted-foreground">{deviceCopy.settings.loading}</Text>
        ) : null}
        {hydrationError ? (
          <Text className="text-body text-start text-muted-foreground" testID="settings-hydration-error">
            {deviceCopy.errors.preferencesReadFailed}
          </Text>
        ) : null}
        {actionError ? (
          <Text className="text-body text-start text-muted-foreground" testID="settings-action-error">
            {deviceCopy.errors.actionFailed}
          </Text>
        ) : null}

        <View className="gap-3" testID="settings-appearance">
          <Text className="text-label text-start text-muted-foreground">
            {SETTINGS_COPY.appearance.themeTitle}
          </Text>
          <View className="gap-2" accessibilityRole="radiogroup">
            {THEME_OPTIONS.map((option) => (
              <OptionButton
                key={option.id}
                label={option.label}
                selected={state.theme === option.id}
                onPress={() => changeTheme(option.id, Date.now())}
                testID={`theme-${option.id}`}
              />
            ))}
          </View>
        </View>

        <View className="gap-3" testID="settings-display-mode">
          <Text className="text-label text-start text-muted-foreground">
            {SETTINGS_COPY.appearance.title}
          </Text>
          <View className="gap-2" accessibilityRole="radiogroup">
            {MODE_OPTIONS.map((option) => (
              <OptionButton
                key={option.id}
                label={option.label}
                description={option.description}
                selected={state.mode === option.id}
                onPress={() => changeMode(option.id, Date.now())}
                testID={`mode-${option.id}`}
              />
            ))}
          </View>
        </View>

        <View className="gap-3" testID="settings-prayer-method">
          <Text className="text-label text-start text-muted-foreground">
            {SETTINGS_COPY.prayerMethod.title}
          </Text>
          <View className="gap-2" accessibilityRole="radiogroup">
            {CALCULATION_METHODS.map((method) => (
              <OptionButton
                key={method.id}
                label={method.label}
                selected={state.methodId === method.id}
                onPress={() => void changeMethod(method.id, Date.now())}
                testID={`method-${method.id}`}
              />
            ))}
          </View>
        </View>

        <View className="gap-3" testID="settings-level">
          <Text className="text-label text-start text-muted-foreground">
            {SETTINGS_COPY.level.title}
          </Text>
          <Text className="text-body text-start text-foreground">{SETTINGS_COPY.level.label}</Text>
          <View className="gap-2" accessibilityRole="radiogroup">
            {WIRD_LEVELS.map((level) => (
              <OptionButton
                key={level.id}
                label={level.title}
                description={level.description}
                selected={!isLevelLoading && canChangeLevel && currentLevelId === level.id}
                disabled={isLevelLoading || !canChangeLevel}
                onPress={() => void changeLevel(level.id, toDayId(new Date()), Date.now())}
                testID={`level-${level.id}`}
              />
            ))}
          </View>
          <Text className="text-small text-start text-muted-foreground">
            {SETTINGS_COPY.level.hint}
          </Text>
        </View>

        <View className="gap-3" testID="settings-device">
          <Text className="text-label text-start text-muted-foreground">
            {deviceCopy.settings.deviceHeading}
          </Text>
          <DeviceStatusRow
            testID="device-notifications-status"
            label={deviceCopy.settings.notificationsLabel}
            message={device.status?.notifications.message ?? deviceCopy.settings.notificationsChecking}
            action={device.status?.notifications.action}
            onAction={handleNotificationAction}
          />
          {schedule.error ? (
            <Text className="text-small text-start text-muted-foreground" testID="settings-schedule-error">
              {deviceCopy.errors.scheduleRejected}
            </Text>
          ) : null}
          <Pressable
            accessibilityRole="switch"
            accessibilityState={{ checked: schedule.notificationPrefs.enabled }}
            className="rounded-card border border-border bg-surface p-3"
            onPress={() => void schedule.setNotificationEnabled(!schedule.notificationPrefs.enabled)}
            testID="device-notifications-toggle"
          >
            <Text className="text-body text-start text-foreground">
              {schedule.notificationPrefs.enabled
                ? deviceCopy.settings.notificationsEnabled
                : deviceCopy.settings.notificationsDisabled}
            </Text>
          </Pressable>
          {(
            [
              ['beforeAdhan', deviceCopy.settings.beforeAdhan],
              ['atAdhan', deviceCopy.settings.atAdhan],
              ['atIqamah', deviceCopy.settings.atIqamah],
              ['morningAdhkar', deviceCopy.settings.morningAdhkar],
              ['eveningAdhkar', deviceCopy.settings.eveningAdhkar],
            ] as const
          ).map(([key, label]) => (
            <Pressable
              accessibilityRole="switch"
              accessibilityState={{ checked: schedule.notificationPrefs[key] }}
              className="rounded-card border border-border bg-surface p-3"
              key={key}
              onPress={() => void schedule.setNotificationMoment(key, !schedule.notificationPrefs[key])}
              testID={`device-notification-${key}`}
            >
              <Text className="text-body text-start text-foreground">{label}</Text>
            </Pressable>
          ))}
          <Pressable
            accessibilityRole="switch"
            accessibilityState={{ checked: schedule.alarmOnSilent }}
            className="rounded-card border border-border bg-surface p-3"
            onPress={() => void schedule.setAlarmOnSilent(!schedule.alarmOnSilent)}
            testID="device-alarm-on-silent"
          >
            <Text className="text-body text-start text-foreground">{deviceCopy.settings.silentMode}</Text>
          </Pressable>
          <DeviceStatusRow
            testID="device-exact-alarm-status"
            label={deviceCopy.settings.exactAlarmLabel}
            message={device.status?.exactAlarm.message ?? deviceCopy.settings.exactAlarmChecking}
            action={device.status?.exactAlarm.action}
            onAction={device.handleAction}
          />
          <DeviceStatusRow
            testID="device-countdown-status"
            label={deviceCopy.settings.countdownLabel}
            message={device.status?.countdown.message ?? deviceCopy.settings.countdownChecking}
            action={device.status?.countdown.action}
            onAction={device.handleAction}
          />
          <Pressable
            accessibilityRole="switch"
            accessibilityState={{ checked: device.snapshot?.countdown.enabled ?? false }}
            className="rounded-card border border-border bg-surface p-3"
            onPress={() => void schedule.setCountdownEnabled(!(device.snapshot?.countdown.enabled ?? false))}
            testID="device-countdown-toggle"
          >
            <Text className="text-body text-start text-foreground">
              {device.snapshot?.countdown.enabled
                ? deviceCopy.settings.countdownEnabled
                : deviceCopy.settings.countdownDisabled}
            </Text>
          </Pressable>
          <DeviceStatusRow
            testID="device-battery-status"
            label={deviceCopy.settings.batteryLabel}
            message={device.status?.battery.message ?? deviceCopy.settings.batteryChecking}
            action={device.status?.battery.action}
            onAction={device.handleAction}
          />
          {device.status?.location ? (
            <DeviceStatusRow
              testID="device-location-status"
              label={deviceCopy.settings.locationLabel}
              message={device.status.location.message}
              action={device.status.location.action}
              onAction={handleLocationAction}
            />
          ) : null}
          {device.actionError ? (
            <View className="gap-2 rounded-card border border-border bg-surface p-3" testID="settings-device-action-error">
              <Text className="text-small text-start text-muted-foreground">
                {deviceCopy.errors.actionFailed}
              </Text>
              <Pressable
                accessibilityRole="button"
                className="rounded-card border border-primary bg-primary/10 p-3"
                onPress={() =>
                  void device.retryLastAction().then((action) => {
                    if (action === 'retry-location' || action === 'open-location-settings') {
                      return schedule.sync()
                    }
                    return undefined
                  })
                }
                testID="settings-device-action-retry"
              >
                <Text className="text-body text-start text-primary">
                  {deviceCopy.actions.retryDeviceAction}
                </Text>
              </Pressable>
            </View>
          ) : null}
        </View>

        <View className="gap-2" testID="settings-links">
          <Text className="text-label text-start text-muted-foreground">
            {SETTINGS_COPY.links.title}
          </Text>
          {[
            ['/prayer-times', shellCopy.nav.prayerTimes, 'settings-link-prayer-times'],
            ['/libraries', shellCopy.nav.libraries, 'settings-link-libraries'],
            ['/stats', shellCopy.nav.stats, 'settings-link-stats'],
          ].map(([href, label, testID]) => (
            <Pressable
              accessibilityRole="button"
              className="rounded-card border border-border bg-surface p-3"
              key={href}
              onPress={() => router.push(href)}
              testID={testID}
            >
              <Text className="text-body text-start text-primary">{label}</Text>
            </Pressable>
          ))}
        </View>
      </View>
    </ScreenContainer>
  )
}

function DeviceStatusRow({
  testID,
  label,
  message,
  action,
  onAction,
}: {
  testID: string
  label: string
  message: string
  action: DeviceAction | null | undefined
  onAction: (type: DeviceActionType) => Promise<unknown>
}) {
  return (
    <View className="gap-2 rounded-card border border-border bg-surface p-3" testID={testID}>
      <Text className="text-body text-start text-foreground">{label}</Text>
      <Text className="text-small text-start text-muted-foreground">{message}</Text>
      {action ? (
        <Pressable
          accessibilityRole="button"
          className="rounded-card border border-primary bg-primary/10 p-3"
          onPress={() => void onAction(action.type)}
          testID={`${testID}-action`}
        >
          <Text className="text-body text-start text-primary">{action.label}</Text>
        </Pressable>
      ) : null}
    </View>
  )
}
