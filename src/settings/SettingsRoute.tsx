import type { CalculationMethodId } from '../prayer-times/logic'
import { WIRD_LEVELS } from '../content/levels'
import { CALCULATION_METHODS, DEFAULT_METHOD_ID } from '../prayer-times/logic'
import { SETTINGS_COPY } from './copy'
import { useRouter } from 'expo-router'
import { useSQLiteContext } from 'expo-sqlite'
import { useColorScheme } from 'nativewind'
import { useEffect, useMemo, useState, useSyncExternalStore } from 'react'
import { Pressable, Switch, View } from 'react-native'

import { ScreenContainer } from '../shell/ScreenContainer'
import { Text } from '../shell/Text'
import { logger } from '../observability/logger'
import { deviceCopy } from '../device/copy'
import { createPreferencesRepository, PREFERENCE_KEYS } from '../preferences/db'
import {
  getPrayerAlarmSyncOutcome,
  requestPrayerReschedule,
  subscribePrayerAlarmSyncOutcome,
} from '../device/prayerAlarms'
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
import { BatterySection } from './BatterySection'
import { CountdownToggle } from './CountdownToggle'
import { useRefreshWirdDay, useWirdToday } from '../day-plan/WirdTodayProvider'
import { LocationSection } from './LocationSection'
import { SoundPreviewSection } from './SoundPreviewSection'
import { useWirdLevel } from '../wird/useWirdLevel'
import type { DayId } from '../wird/types'
import { BackupSection } from '../backup/BackupSection'
import { MethodSheet } from '../prayer-times/MethodSheet'
import { ListGroup } from '../ui/ListGroup'
import { ListRow } from '../ui/ListRow'

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
      className={`rounded-card border p-3 ${selected ? 'border-accent bg-accent/10' : 'border-line bg-surface'} ${disabled ? 'opacity-50' : ''}`}
      disabled={disabled}
      onPress={onPress}
      testID={testID}
    >
      <Text className="text-body text-start text-ink">{label}</Text>
      {description ? (
        <Text className="text-meta mt-1 text-start text-ink">{description}</Text>
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
      className="rounded-button border border-accent bg-accent/10 px-4 py-3"
      onPress={onPress}
      testID={testID}
    >
      <Text className="text-body text-center font-sans-medium text-accent">{label}</Text>
    </Pressable>
  )
}

export function SettingsRoute() {
  const today = useWirdToday()
  const refreshWirdDay = useRefreshWirdDay()
  const [refreshKey, setRefreshKey] = useState(0)

  return (
    <SettingsContent
      key={refreshKey}
      today={today}
      onRestored={() => {
        refreshWirdDay()
        requestPrayerReschedule()
        setRefreshKey((current) => current + 1)
      }}
    />
  )
}

function SettingsContent({ onRestored, today }: { onRestored: () => void; today: DayId }) {
  const database = useSQLiteContext()
  const router = useRouter()
  const { setColorScheme } = useColorScheme()
  const preferences = useMemo(() => createPreferencesRepository(database), [database])
  const { currentLevelId, canChangeLevel, changeLevel, isLoading: isLevelLoading } = useWirdLevel()
  const notificationSettings = useNotificationSettings()
  const refreshWirdDay = useRefreshWirdDay()
  const prayerAlarmSyncOutcome = useSyncExternalStore(
    subscribePrayerAlarmSyncOutcome,
    getPrayerAlarmSyncOutcome,
  )
  const [methodSheetVisible, setMethodSheetVisible] = useState(false)
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
  ): Promise<void> {
    return preferences.write(key, value, updatedAt)
  }

  function changeTheme(theme: NativeThemePreference, updatedAt: number) {
    setState((previous) => ({ ...previous, theme }))
    setColorScheme(theme)
    void writePreference(PREFERENCE_KEYS.theme, theme, updatedAt)
  }

  async function changeMethod(methodId: CalculationMethodId, updatedAt: number) {
    setState((previous) => ({ ...previous, methodId }))
    try {
      await writePreference(PREFERENCE_KEYS.calculationMethod, methodId, updatedAt)
      refreshWirdDay()
      requestPrayerReschedule()
    } catch (cause: unknown) {
      logger.error('Native prayer calculation method write failed', cause, {
        operation: 'change-calculation-method',
      })
    }
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
  const showPrayerAlarmSyncDegraded =
    showNotificationDetails && prayerAlarmSyncOutcome === 'degraded'
  const showPrayerAlarmSyncFailure =
    notificationSettings.prefs.enabled && prayerAlarmSyncOutcome === 'failed'

  return (
    <ScreenContainer testID="settings-screen">
      <View className="gap-6">
        <Text
          accessibilityRole="header"
          className="font-display text-sheet-title text-start text-accent"
        >
          الإعدادات
        </Text>
        {!hydrated ? (
          <Text className="text-body text-start text-ink">جارٍ تحميل الإعدادات…</Text>
        ) : null}

        <View className="gap-3" testID="settings-appearance">
          <Text className="font-sans-bold text-chip text-start text-ink">
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

        <View testID="settings-prayer-method">
          <ListGroup>
            <ListRow
              label={SETTINGS_COPY.prayerMethod.title}
              value={CALCULATION_METHODS.find((method) => method.id === state.methodId)?.label}
              onPress={() => setMethodSheetVisible(true)}
              testID="settings-method-row"
            />
          </ListGroup>
          <MethodSheet
            visible={methodSheetVisible}
            onClose={() => setMethodSheetVisible(false)}
            methodId={state.methodId}
            onSelect={(id) => void changeMethod(id, Date.now())}
          />
        </View>
        <LocationSection />

        <View className="gap-3" testID="settings-notifications">
          <Text className="font-sans-bold text-chip text-start text-ink">
            {SETTINGS_COPY.groups.notifications}
          </Text>
          <Text
            accessibilityRole="header"
            className="font-display text-sheet-title text-start text-accent"
          >
            {SETTINGS_COPY.notifications.heading}
          </Text>
          <View
            className="gap-3 rounded-card border border-line bg-surface p-4"
            testID="notification-settings"
          >
            <View
              className="flex-row items-center justify-between gap-3"
              testID="notification-master-row"
            >
              <Text className="text-body text-start text-ink">
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
              <Text className="text-meta text-start text-ink" testID="notification-status-message">
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
            <CountdownToggle
              notificationPermission={notificationSettings.permission}
              notificationsEnabled={notificationSettings.prefs.enabled}
            />
            {!notificationSettings.hasCoordinates ? (
              <Text
                className="text-meta text-start text-ink"
                testID="notification-location-required"
              >
                {SETTINGS_COPY.notifications.locationRequired}
              </Text>
            ) : null}
            {showPrayerAlarmSyncFailure ? (
              <View className="gap-2" testID="notification-alarm-sync-failure">
                <Text
                  className="text-meta text-start text-ink"
                  testID="notification-alarm-sync-failure-message"
                >
                  {deviceCopy.notifications.syncFailed}
                </Text>
                <ActionButton
                  label={deviceCopy.actions.retry}
                  onPress={requestPrayerReschedule}
                  testID="notification-alarm-sync-retry"
                />
              </View>
            ) : null}
          </View>
          {showNotificationDetails ? (
            <View className="gap-3">
              <View className="gap-2" testID="notification-moments">
                {NOTIFICATION_MOMENTS.map((moment) => {
                  const pending = notificationSettings.isPending(moment.key)
                  return (
                    <View
                      className={`flex-row items-center justify-between gap-3 rounded-card border p-3 ${notificationSettings.prefs[moment.key] ? 'border-accent bg-accent/10' : 'border-line bg-surface'}`}
                      key={moment.key}
                    >
                      <Text className="text-meta text-start text-ink">{moment.label}</Text>
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
                className="flex-row items-start justify-between gap-3 rounded-card border border-line bg-surface p-4"
                testID="notification-silent-mode"
              >
                <View className="flex-1 gap-1">
                  <Text className="text-body text-start text-ink">
                    {NATIVE_SETTINGS_COPY.notifications.silentTitle}
                  </Text>
                  <Text className="text-meta text-start text-ink">
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
              {showPrayerAlarmSyncDegraded ? (
                <Text
                  className="text-meta text-start text-ink"
                  testID="notification-alarm-sync-degraded-notice"
                >
                  {deviceCopy.notifications.syncDegradedNotice}
                </Text>
              ) : null}
              {showExactAlarm || showPrayerAlarmSyncDegraded ? (
                <View
                  className="gap-2 rounded-card border border-line bg-surface p-4"
                  testID="notification-exact-alarm"
                >
                  <Text className="text-meta text-start text-ink">{exactAlarmStatus.message}</Text>
                  {exactAlarmAction ? (
                    <ActionButton
                      label={exactAlarmAction.label}
                      onPress={() => void notificationSettings.runAction(exactAlarmAction.type)}
                      testID="notification-exact-alarm-action"
                    />
                  ) : showPrayerAlarmSyncDegraded ? (
                    <ActionButton
                      label={deviceCopy.actions.retry}
                      onPress={requestPrayerReschedule}
                      testID="notification-exact-alarm-retry"
                    />
                  ) : null}
                </View>
              ) : null}
              <View className="gap-2" testID="notification-lifecycle-guidance">
                <Text className="text-meta text-start text-ink">
                  {deviceCopy.notifications.recoveryHeading}
                </Text>
                <Text
                  className="text-meta text-start text-ink"
                  testID="notification-reboot-recovery"
                >
                  {deviceCopy.notifications.rebootRecovery}
                </Text>
                <Text
                  className="text-meta text-start text-ink"
                  testID="notification-time-change-recovery"
                >
                  {deviceCopy.notifications.timeChangeRecovery}
                </Text>
              </View>
            </View>
          ) : null}
        </View>

        <BatterySection />

        <SoundPreviewSection />

        <View className="gap-3" testID="settings-level">
          <Text className="font-sans-bold text-chip text-start text-ink">
            {SETTINGS_COPY.level.title}
          </Text>
          <Text className="text-body text-start text-ink">{SETTINGS_COPY.level.label}</Text>
          <View className="gap-2" accessibilityRole="radiogroup">
            {WIRD_LEVELS.map((level) => (
              <OptionButton
                key={level.id}
                label={level.title}
                description={level.description}
                selected={!isLevelLoading && canChangeLevel && currentLevelId === level.id}
                disabled={isLevelLoading || !canChangeLevel}
                onPress={() => void changeLevel(level.id, today, Date.now())}
                testID={`level-${level.id}`}
              />
            ))}
          </View>
          <Text className="text-meta text-start text-ink">{SETTINGS_COPY.level.hint}</Text>
        </View>

        <View className="gap-2" testID="settings-links">
          <Text className="font-sans-bold text-chip text-start text-ink">
            {SETTINGS_COPY.links.title}
          </Text>
          {[
            ['/prayer-times', 'مواقيت الصلاة', 'settings-link-prayer-times'],
            ['/more', 'المزيد', 'settings-link-libraries'],
            ['/stats', 'الإحصائيات', 'settings-link-stats'],
          ].map(([href, label, testID]) => (
            <Pressable
              accessibilityRole="button"
              className="rounded-card border border-line bg-surface p-3"
              key={href}
              onPress={() => router.push(href)}
              testID={testID}
            >
              <Text className="text-body text-start text-accent">{label}</Text>
            </Pressable>
          ))}
        </View>
        <BackupSection onRestored={onRestored} />
      </View>
    </ScreenContainer>
  )
}
