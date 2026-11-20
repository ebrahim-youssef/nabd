import { TriangleAlert } from 'lucide-react-native'
import { useRouter } from 'expo-router'
import { useSQLiteContext } from 'expo-sqlite'
import { useColorScheme } from 'nativewind'
import { useEffect, useMemo, useState, useSyncExternalStore } from 'react'
import { AppState, View } from 'react-native'

import { WIRD_LEVELS } from '../content/levels'
import { deviceCopy } from '../device/copy'
import { devicePlatform, type CountdownNotificationResult } from '../device/platform'
import {
  getPrayerAlarmSyncOutcome,
  requestPrayerReschedule,
  subscribePrayerAlarmSyncOutcome,
} from '../device/prayerAlarms'
import {
  useNotificationSettings,
  type NotificationMomentKey,
} from '../device/useNotificationSettings'
import { useRefreshWirdDay } from '../day-plan/WirdTodayProvider'
import { logger } from '../observability/logger'
import { createPreferencesRepository, PREFERENCE_KEYS } from '../preferences/db'
import {
  DEFAULT_NATIVE_THEME,
  readStoredTheme,
  type NativeThemePreference,
} from '../preferences/theme'
import {
  CALCULATION_METHODS,
  DEFAULT_METHOD_ID,
  type CalculationMethodId,
} from '../prayer-times/logic'
import { MethodSheet } from '../prayer-times/MethodSheet'
import { ScreenContainer } from '../shell/ScreenContainer'
import { PageHeader } from '../shell/PageHeader'
import { Text } from '../shell/Text'
import { ListGroup } from '../ui/ListGroup'
import { ListRow } from '../ui/ListRow'
import { SectionHeader } from '../ui/SectionHeader'
import { SegmentedControl } from '../ui/SegmentedControl'
import { StatusCard } from '../ui/StatusCard'
import { SwitchRow } from '../ui/SwitchRow'
import { useWirdLevel } from '../wird/useWirdLevel'
import { BatterySection } from './BatterySection'
import { NATIVE_SETTINGS_COPY } from './constants'
import { SETTINGS_COPY, SETTINGS_LAYOUT_COPY as COPY } from './copy'
import { CountdownToggle } from './CountdownToggle'
import { LocationSection } from './LocationSection'
import { SoundPreviewSection } from './SoundPreviewSection'

const THEME_OPTIONS: { value: NativeThemePreference; label: string }[] = [
  { value: 'light', label: SETTINGS_COPY.appearance.light },
  { value: 'dark', label: SETTINGS_COPY.appearance.dark },
  { value: 'system', label: NATIVE_SETTINGS_COPY.systemTheme },
]
const MOMENTS: { key: NotificationMomentKey; label: string; description: string }[] = [
  {
    key: 'beforeAdhan',
    label: SETTINGS_COPY.notifications.beforeAdhan,
    description: COPY.beforeAdhan,
  },
  { key: 'atAdhan', label: SETTINGS_COPY.notifications.atAdhan, description: COPY.atAdhan },
  { key: 'atIqamah', label: SETTINGS_COPY.notifications.atIqamah, description: COPY.atIqamah },
  {
    key: 'morningAdhkar',
    label: SETTINGS_COPY.notifications.morningAdhkar,
    description: COPY.morningAdhkar,
  },
  {
    key: 'eveningAdhkar',
    label: SETTINGS_COPY.notifications.eveningAdhkar,
    description: COPY.eveningAdhkar,
  },
]

export function SettingsRoute() {
  const database = useSQLiteContext()
  const preferences = useMemo(() => createPreferencesRepository(database), [database])
  const router = useRouter()
  const { setColorScheme } = useColorScheme()
  const refreshWirdDay = useRefreshWirdDay()
  const { currentLevelId } = useWirdLevel()
  const notifications = useNotificationSettings()
  const sync = useSyncExternalStore(subscribePrayerAlarmSyncOutcome, getPrayerAlarmSyncOutcome)
  const [theme, setTheme] = useState<NativeThemePreference>(DEFAULT_NATIVE_THEME)
  const [methodId, setMethodId] = useState<CalculationMethodId>(DEFAULT_METHOD_ID)
  const [hydrated, setHydrated] = useState(false)
  const [methodVisible, setMethodVisible] = useState(false)
  const [countdownStatus, setCountdownStatus] = useState<CountdownNotificationResult | null>(null)

  useEffect(() => {
    let active = true
    void Promise.all([
      preferences.read(PREFERENCE_KEYS.theme),
      preferences.read(PREFERENCE_KEYS.calculationMethod),
    ]).then(([storedTheme, method]) => {
      if (!active) return
      const nextTheme = readStoredTheme(storedTheme)
      setTheme(nextTheme)
      setColorScheme(nextTheme)
      setMethodId(
        CALCULATION_METHODS.some((entry) => entry.id === method)
          ? (method as CalculationMethodId)
          : DEFAULT_METHOD_ID,
      )
      setHydrated(true)
    })
    return () => {
      active = false
    }
  }, [preferences, setColorScheme])

  useEffect(() => {
    const readStatus = () => setCountdownStatus(devicePlatform.getCountdownNotificationStatus())
    readStatus()
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') readStatus()
    })
    return () => subscription.remove()
  }, [])

  function changeTheme(value: NativeThemePreference) {
    setTheme(value)
    setColorScheme(value)
    void preferences.write(PREFERENCE_KEYS.theme, value, Date.now())
  }
  async function changeMethod(value: CalculationMethodId) {
    setMethodId(value)
    try {
      await preferences.write(PREFERENCE_KEYS.calculationMethod, value, Date.now())
      refreshWirdDay()
      requestPrayerReschedule()
    } catch (cause: unknown) {
      logger.error('Native prayer calculation method write failed', cause, {
        operation: 'change-calculation-method',
      })
    }
  }

  const permissionBlocked = notifications.permission === 'blocked'
  const permissionRequired = notifications.permission === 'denied'
  const exactBlocked =
    notifications.prefs.enabled &&
    notifications.permission === 'granted' &&
    notifications.exactAlarmStatus.state !== 'ready' &&
    notifications.exactAlarmStatus.state !== 'not-required'
  const syncFailed = notifications.prefs.enabled && sync === 'failed'
  const countdownBlocked = countdownStatus === 'channel-blocked'
  const detailsDisabled = !notifications.prefs.enabled || notifications.permission !== 'granted'
  const alarmDisabled = detailsDisabled || exactBlocked || syncFailed
  const reason =
    permissionBlocked || permissionRequired
      ? notifications.notificationStatus.message
      : exactBlocked
        ? notifications.exactAlarmStatus.message
        : syncFailed
          ? deviceCopy.notifications.syncFailed
          : COPY.notificationsOff
  const status =
    permissionBlocked || permissionRequired
      ? {
          message: notifications.notificationStatus.message,
          action: notifications.notificationStatus.action
            ? {
                label: notifications.notificationStatus.action.label,
                onPress: () =>
                  void notifications.runAction(notifications.notificationStatus.action!.type),
              }
            : undefined,
        }
      : exactBlocked
        ? {
            message: notifications.exactAlarmStatus.message,
            action: notifications.exactAlarmStatus.action
              ? {
                  label: notifications.exactAlarmStatus.action.label,
                  onPress: () =>
                    void notifications.runAction(notifications.exactAlarmStatus.action!.type),
                }
              : sync === 'degraded'
                ? { label: deviceCopy.actions.retry, onPress: requestPrayerReschedule }
                : undefined,
          }
        : syncFailed
          ? {
              message: deviceCopy.notifications.syncFailed,
              action: { label: deviceCopy.actions.retry, onPress: requestPrayerReschedule },
            }
          : countdownBlocked
            ? {
                message: NATIVE_SETTINGS_COPY.notifications.countdownBlocked,
                action: {
                  label: deviceCopy.actions.openAppSettings,
                  onPress: () => void notifications.runAction('open-app-settings'),
                },
              }
            : null
  const level = WIRD_LEVELS.find((entry) => entry.id === currentLevelId)
  const duration = level?.description.split(' — ').pop()?.replace(/\.$/, '')
  const levelValue = level ? `${level.title} · ${duration}` : undefined

  return (
    <ScreenContainer testID="settings-screen">
      <View className="gap-6">
        <PageHeader backHref="/more" directBack title={COPY.title} />
        {!hydrated ? <Text className="text-body text-start text-ink">{COPY.loading}</Text> : null}
        <View className="gap-3">
          <SectionHeader title={SETTINGS_COPY.appearance.themeTitle} />
          <SegmentedControl
            options={THEME_OPTIONS}
            value={theme}
            onChange={changeTheme}
            accessibilityLabel={SETTINGS_COPY.appearance.themeTitle}
          />
        </View>
        <View className="gap-3">
          <SectionHeader title={COPY.wird} />
          <ListGroup>
            <ListRow
              label={SETTINGS_COPY.level.title}
              value={levelValue}
              onPress={() => router.push('/level')}
              testID="settings-level-row"
            />
          </ListGroup>
        </View>
        <View className="gap-3">
          <SectionHeader title={SETTINGS_COPY.groups.prayerTimes} />
          <ListGroup>
            <ListRow
              label={SETTINGS_COPY.prayerMethod.title}
              value={CALCULATION_METHODS.find((method) => method.id === methodId)?.label}
              onPress={() => setMethodVisible(true)}
              testID="settings-method-row"
            />
            <LocationSection />
          </ListGroup>
          <MethodSheet
            visible={methodVisible}
            onClose={() => setMethodVisible(false)}
            methodId={methodId}
            onSelect={(id) => void changeMethod(id)}
          />
        </View>
        <View className="gap-3">
          <SectionHeader title={SETTINGS_COPY.groups.notifications} />
          {status ? (
            <StatusCard
              tone="warn"
              icon={TriangleAlert}
              message={status.message}
              action={status.action}
            />
          ) : null}
          <ListGroup>
            <SwitchRow
              label={SETTINGS_COPY.notifications.enable}
              description={COPY.masterDescription}
              value={notifications.prefs.enabled}
              onValueChange={(value) => void notifications.setEnabled(value)}
              disabled={permissionBlocked || notifications.isPending('enabled')}
              disabledReason={
                permissionBlocked ? notifications.notificationStatus.message : undefined
              }
            />
            {MOMENTS.map((moment) => (
              <SwitchRow
                key={moment.key}
                label={moment.label}
                description={moment.description}
                value={notifications.prefs[moment.key]}
                onValueChange={(value) => void notifications.setMoment(moment.key, value)}
                disabled={alarmDisabled || notifications.isPending(moment.key)}
                disabledReason={alarmDisabled ? reason : undefined}
              />
            ))}
            <CountdownToggle
              disabled={detailsDisabled || countdownBlocked}
              disabledReason={
                countdownBlocked
                  ? NATIVE_SETTINGS_COPY.notifications.countdownBlocked
                  : detailsDisabled
                    ? reason
                    : undefined
              }
            />
            <SwitchRow
              label={NATIVE_SETTINGS_COPY.notifications.silentTitle}
              description={NATIVE_SETTINGS_COPY.notifications.silentBody}
              value={notifications.silentMode}
              onValueChange={(value) => void notifications.setSilentMode(value)}
              disabled={alarmDisabled || notifications.isPending('silentMode')}
              disabledReason={alarmDisabled ? reason : undefined}
            />
          </ListGroup>
          {!notifications.hasCoordinates ? (
            <Text className="font-sans text-meta text-mute">
              {SETTINGS_COPY.notifications.locationRequired}
            </Text>
          ) : null}
          {notifications.prefs.enabled && notifications.permission === 'granted' ? (
            <View className="gap-2">
              {sync === 'degraded' ? (
                <Text className="font-sans text-meta text-mute">
                  {deviceCopy.notifications.syncDegradedNotice}
                </Text>
              ) : null}
              <Text className="font-sans text-meta text-mute">
                {deviceCopy.notifications.recoveryHeading}
              </Text>
              <Text className="font-sans text-meta text-mute">
                {deviceCopy.notifications.rebootRecovery}
              </Text>
              <Text className="font-sans text-meta text-mute">
                {deviceCopy.notifications.timeChangeRecovery}
              </Text>
            </View>
          ) : null}
        </View>
        <BatterySection />
        <SoundPreviewSection />
        <View className="gap-3">
          <SectionHeader title={COPY.data} />
          <ListGroup>
            <ListRow
              label={COPY.backup}
              description={COPY.backupDescription}
              onPress={() => router.push('/backup')}
            />
          </ListGroup>
        </View>
      </View>
    </ScreenContainer>
  )
}
