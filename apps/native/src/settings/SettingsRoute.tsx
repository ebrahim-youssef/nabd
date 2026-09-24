import {
  CALCULATION_METHODS,
  DEFAULT_METHOD_ID,
  SETTINGS_COPY,
  WIRD_LEVELS,
  shellCopy,
  toDayId,
  type CalculationMethodId,
} from '@nabd/shared'
import { useRouter } from 'expo-router'
import { useSQLiteContext } from 'expo-sqlite'
import { useColorScheme } from 'nativewind'
import { useEffect, useMemo, useState } from 'react'
import { Pressable, Switch, View } from 'react-native'

import { ScreenContainer } from '../shell/ScreenContainer'
import { Text } from '../shell/Text'
import { createPreferencesRepository, PREFERENCE_KEYS } from '../preferences/db'
import {
  useNotificationSettings,
  type NotificationMomentKey,
} from '../device/useNotificationSettings'
import {
  DEFAULT_NATIVE_THEME,
  readStoredTheme,
  type NativeThemePreference,
} from '../preferences/theme'
import { NATIVE_SETTINGS_COPY } from './constants'
import { useWirdLevel } from '../wird/useWirdLevel'

type SettingsState = {
  theme: NativeThemePreference
  methodId: CalculationMethodId
}

const THEME_OPTIONS: readonly { id: NativeThemePreference; label: string }[] = [
  { id: 'light', label: SETTINGS_COPY.appearance.light },
  { id: 'dark', label: SETTINGS_COPY.appearance.dark },
  { id: 'system', label: NATIVE_SETTINGS_COPY.systemTheme },
]

const NOTIFICATION_MOMENTS: readonly { key: NotificationMomentKey; label: string }[] = [
  { key: 'beforeAdhan', label: SETTINGS_COPY.notifications.beforeAdhan },
  { key: 'atAdhan', label: SETTINGS_COPY.notifications.atAdhan },
  { key: 'atIqamah', label: SETTINGS_COPY.notifications.atIqamah },
  { key: 'morningAdhkar', label: SETTINGS_COPY.notifications.morningAdhkar },
  { key: 'eveningAdhkar', label: SETTINGS_COPY.notifications.eveningAdhkar },
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

function ActionButton({
  label,
  onPress,
  testID,
}: {
  label: string
  onPress: () => void
  testID: string
}) {
  return (
    <Pressable
      accessibilityRole="button"
      className="rounded-button border border-primary bg-primary/10 px-4 py-3"
      onPress={onPress}
      testID={testID}
    >
      <Text className="text-body text-center font-body-medium text-primary">{label}</Text>
    </Pressable>
  )
}

export function SettingsRoute() {
  const database = useSQLiteContext()
  const router = useRouter()
  const { setColorScheme } = useColorScheme()
  const preferences = useMemo(() => createPreferencesRepository(database), [database])
  const { currentLevelId, canChangeLevel, changeLevel, isLoading: isLevelLoading } = useWirdLevel()
  const notificationSettings = useNotificationSettings()
  const [hydrated, setHydrated] = useState(false)
  const [state, setState] = useState<SettingsState>({
    theme: DEFAULT_NATIVE_THEME,
    methodId: DEFAULT_METHOD_ID,
  })

  useEffect(() => {
    let active = true
    void Promise.all([
      preferences.read(PREFERENCE_KEYS.theme),
      preferences.read(PREFERENCE_KEYS.calculationMethod),
    ]).then(([theme, method]) => {
      if (!active) return
      const nextTheme = readStoredTheme(theme)
      setState({
        theme: nextTheme,
        methodId: CALCULATION_METHODS.some((entry) => entry.id === method)
          ? (method as CalculationMethodId)
          : DEFAULT_METHOD_ID,
      })
      setColorScheme(nextTheme)
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

  function changeTheme(theme: NativeThemePreference, updatedAt: number) {
    setState((previous) => ({ ...previous, theme }))
    setColorScheme(theme)
    writePreference(PREFERENCE_KEYS.theme, theme, updatedAt)
  }

  function changeMethod(methodId: CalculationMethodId, updatedAt: number) {
    setState((previous) => ({ ...previous, methodId }))
    writePreference(PREFERENCE_KEYS.calculationMethod, methodId, updatedAt)
  }

  const notificationStatus = notificationSettings.notificationStatus
  const notificationAction = notificationStatus.action
  const exactAlarmStatus = notificationSettings.exactAlarmStatus
  const exactAlarmAction = exactAlarmStatus.action
  const showNotificationDetails =
    notificationSettings.prefs.enabled && notificationSettings.permission === 'granted'
  const showExactAlarm =
    showNotificationDetails &&
    exactAlarmStatus.state !== 'not-required' &&
    exactAlarmStatus.state !== 'ready'

  return (
    <ScreenContainer testID="settings-screen">
      <View className="gap-6">
        <Text
          accessibilityRole="header"
          className="font-display text-title text-start text-primary"
        >
          {shellCopy.nav.settings}
        </Text>
        {!hydrated ? (
          <Text className="text-body text-start text-muted-foreground">جارٍ تحميل الإعدادات…</Text>
        ) : null}

        <View className="gap-3" testID="settings-appearance">
          <Text className="font-display text-label text-start text-muted-foreground">
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

        <View className="gap-3" testID="settings-prayer-method">
          <Text className="font-display text-label text-start text-muted-foreground">
            {SETTINGS_COPY.prayerMethod.title}
          </Text>
          <View className="gap-2" accessibilityRole="radiogroup">
            {CALCULATION_METHODS.map((method) => (
              <OptionButton
                key={method.id}
                label={method.label}
                selected={state.methodId === method.id}
                onPress={() => changeMethod(method.id, Date.now())}
                testID={`method-${method.id}`}
              />
            ))}
          </View>
        </View>

        <View className="gap-3" testID="settings-notifications">
          <Text className="font-display text-label text-start text-muted-foreground">
            {SETTINGS_COPY.groups.notifications}
          </Text>
          <Text
            accessibilityRole="header"
            className="font-display text-title text-start text-primary"
          >
            {SETTINGS_COPY.notifications.heading}
          </Text>
          <View
            className="gap-3 rounded-card border border-border bg-surface p-4"
            testID="notification-settings"
          >
            <View
              className="flex-row items-center justify-between gap-3"
              testID="notification-master-row"
            >
              <Text className="text-body text-start text-foreground">
                {SETTINGS_COPY.notifications.enable}
              </Text>
              <Switch
                accessibilityLabel={SETTINGS_COPY.notifications.enable}
                accessibilityRole="switch"
                accessibilityState={{
                  disabled: notificationSettings.isPending('enabled'),
                }}
                disabled={notificationSettings.isPending('enabled')}
                onValueChange={(value) => void notificationSettings.setEnabled(value)}
                testID="notification-enabled"
                value={notificationSettings.prefs.enabled}
              />
            </View>
            <View className="gap-2" testID="notification-status">
              <Text
                className="text-small text-start text-muted-foreground"
                testID="notification-status-message"
              >
                {notificationStatus.message}
              </Text>
              {notificationAction ? (
                <ActionButton
                  label={notificationAction.label}
                  onPress={() => void notificationSettings.runAction(notificationAction.type)}
                  testID="notification-action"
                />
              ) : null}
            </View>
            {!notificationSettings.hasCoordinates ? (
              <Text
                className="text-small text-start text-muted-foreground"
                testID="notification-location-required"
              >
                {SETTINGS_COPY.notifications.locationRequired}
              </Text>
            ) : null}
          </View>
          {showNotificationDetails ? (
            <View className="gap-3">
              <View className="gap-2" testID="notification-moments">
                {NOTIFICATION_MOMENTS.map((moment) => {
                  const pending = notificationSettings.isPending(moment.key)
                  return (
                    <View
                      className={`flex-row items-center justify-between gap-3 rounded-card border p-3 ${notificationSettings.prefs[moment.key] ? 'border-primary bg-primary/10' : 'border-border bg-surface'}`}
                      key={moment.key}
                    >
                      <Text className="text-small text-start text-foreground">{moment.label}</Text>
                      <Switch
                        accessibilityLabel={moment.label}
                        accessibilityRole="switch"
                        accessibilityState={{ disabled: pending }}
                        disabled={pending}
                        onValueChange={(value) =>
                          void notificationSettings.setMoment(moment.key, value)
                        }
                        testID={`notification-moment-${moment.key}`}
                        value={notificationSettings.prefs[moment.key]}
                      />
                    </View>
                  )
                })}
              </View>
              <View
                className="flex-row items-start justify-between gap-3 rounded-card border border-border bg-surface p-4"
                testID="notification-silent-mode"
              >
                <View className="flex-1 gap-1">
                  <Text className="text-body text-start text-foreground">
                    {NATIVE_SETTINGS_COPY.notifications.silentTitle}
                  </Text>
                  <Text className="text-small text-start text-muted-foreground">
                    {NATIVE_SETTINGS_COPY.notifications.silentBody}
                  </Text>
                </View>
                <Switch
                  accessibilityLabel={NATIVE_SETTINGS_COPY.notifications.silentTitle}
                  accessibilityRole="switch"
                  accessibilityState={{
                    disabled: notificationSettings.isPending('silentMode'),
                  }}
                  disabled={notificationSettings.isPending('silentMode')}
                  onValueChange={(value) => void notificationSettings.setSilentMode(value)}
                  testID="notification-alarm-on-silent"
                  value={notificationSettings.silentMode}
                />
              </View>
              {showExactAlarm ? (
                <View
                  className="gap-2 rounded-card border border-border bg-surface p-4"
                  testID="notification-exact-alarm"
                >
                  <Text className="text-small text-start text-muted-foreground">
                    {exactAlarmStatus.message}
                  </Text>
                  {exactAlarmAction ? (
                    <ActionButton
                      label={exactAlarmAction.label}
                      onPress={() => void notificationSettings.runAction(exactAlarmAction.type)}
                      testID="notification-exact-alarm-action"
                    />
                  ) : null}
                </View>
              ) : null}
            </View>
          ) : null}
        </View>

        <View className="gap-3" testID="settings-level">
          <Text className="font-display text-label text-start text-muted-foreground">
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
