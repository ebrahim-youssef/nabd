import {
  CALCULATION_METHODS,
  computeDayTimes,
  DEFAULT_METHOD_ID,
  isCalculationMethodId,
  PRAYER_LABELS,
  PRAYER_TIMES_COPY,
  SETTINGS_COPY,
  shellCopy,
  statusLine,
  timelineStatus,
  toArabicIndic,
} from '@nabd/shared'
import type { Coords, CalculationMethodId, DayPrayerTimes, TimePoint } from '@nabd/shared'
import { useSQLiteContext } from 'expo-sqlite'
import { useEffect, useMemo, useState } from 'react'
import { Pressable, Text, View } from 'react-native'

import { PageHeader } from '../app/PageHeader'
import { ScreenContainer } from '../app/ScreenContainer'
import { deviceCopy } from '../device/copy'
import { createPreferencesRepository, PREFERENCE_KEYS } from '../preferences/db'
import { useDeviceCapabilities } from '../device/useDeviceCapabilities'
import { usePrayerSchedule } from '../device/usePrayerSchedule'

const PRAYER_ORDER = ['fajr', 'sunrise', 'dhuhr', 'asr', 'maghrib', 'isha'] as const

type PrayerTimesRouteProps = {
  now?: () => number
  today?: () => Date
}

type HydratedState = {
  methodId: CalculationMethodId
  coords: Coords | null
}

function parseCoords(latitude: string | null, longitude: string | null): Coords | null {
  if (
    latitude === null ||
    longitude === null ||
    latitude.trim() === '' ||
    longitude.trim() === ''
  ) {
    return null
  }
  const parsed = { latitude: Number(latitude), longitude: Number(longitude) }
  return Number.isFinite(parsed.latitude) &&
    Number.isFinite(parsed.longitude) &&
    parsed.latitude >= -90 &&
    parsed.latitude <= 90 &&
    parsed.longitude >= -180 &&
    parsed.longitude <= 180
    ? parsed
    : null
}

function formatPrayerTime(at: number): string {
  const date = new Date(at)
  return `${toArabicIndic(date.getHours())}:${toArabicIndic(date.getMinutes()).padStart(2, '٠')}`
}

function prayerPoints(times: DayPrayerTimes): TimePoint[] {
  return PRAYER_ORDER.map((id) => ({ id, label: PRAYER_LABELS[id], at: times[id] }))
}

function nextDay(date: Date): Date {
  const next = new Date(date)
  next.setDate(next.getDate() + 1)
  return next
}

export function PrayerTimesRoute({ now = Date.now, today }: PrayerTimesRouteProps = {}) {
  const database = useSQLiteContext()
  const preferences = useMemo(() => createPreferencesRepository(database), [database])
  const device = useDeviceCapabilities()
  const schedule = usePrayerSchedule()
  const [hydrated, setHydrated] = useState(false)
  const [state, setState] = useState<HydratedState>({
    methodId: DEFAULT_METHOD_ID,
    coords: null,
  })
  const [routeError, setRouteError] = useState<unknown>()

  useEffect(() => {
    let active = true
    void Promise.all([
      preferences.read(PREFERENCE_KEYS.calculationMethod),
      preferences.read(PREFERENCE_KEYS.latitude),
      preferences.read(PREFERENCE_KEYS.longitude),
    ])
      .then(([method, latitude, longitude]) => {
        if (!active) return
        setState({
          methodId: isCalculationMethodId(method) ? method : DEFAULT_METHOD_ID,
          coords: parseCoords(latitude, longitude),
        })
        setHydrated(true)
      })
      .catch(() => {
        if (active) setHydrated(true)
      })

    return () => {
      active = false
    }
  }, [preferences])

  const instant = now()
  const date = today ? today() : new Date(instant)
  const coords = state.coords ?? (device.cachedLocation
    ? { latitude: device.cachedLocation.latitude, longitude: device.cachedLocation.longitude }
    : null)
  const times = coords ? computeDayTimes(coords, date, state.methodId) : null
  const tomorrowTimes = coords
    ? computeDayTimes(coords, nextDay(date), state.methodId)
    : null
  const points = times
    ? [
        ...prayerPoints(times),
        ...(tomorrowTimes
          ? [{ id: 'tomorrow-fajr', label: PRAYER_TIMES_COPY.tomorrowFajr, at: tomorrowTimes.fajr }]
          : []),
      ]
    : []
  const timeline = timelineStatus(points, instant)
  const status = statusLine(timeline)
  const locationAction = device.status?.location.action

  async function changeMethod(methodId: CalculationMethodId) {
    const previousMethodId = state.methodId
    setState((previous) => ({ ...previous, methodId }))
    try {
      await preferences.write(PREFERENCE_KEYS.calculationMethod, methodId, now())
      await schedule.sync()
      setRouteError(undefined)
    } catch (cause) {
      setState((previous) => ({ ...previous, methodId: previousMethodId }))
      try {
        await preferences.write(PREFERENCE_KEYS.calculationMethod, previousMethodId, now())
      } catch {
        // Keep the in-memory rollback and surface the original failure.
      }
      setRouteError(cause)
    }
  }

  async function requestLocation() {
    try {
      const result = await device.requestLocation()
      if (result.ok) {
        setState((previous) => ({ ...previous, coords: result.coords }))
        await schedule.sync()
        setRouteError(undefined)
      }
    } catch (cause) {
      setRouteError(cause)
    }
  }

  function handleLocationAction(type: NonNullable<typeof locationAction>['type']) {
    if (type === 'retry-location') void requestLocation()
    else void device.handleAction(type)
  }

  return (
    <ScreenContainer testID="prayer-times-screen">
      <View className="gap-6">
        <PageHeader backHref="/" title={shellCopy.nav.prayerTimes} />
        <View className="gap-3" testID="prayer-methods">
          <Text className="text-label text-start text-muted-foreground">
            {SETTINGS_COPY.prayerMethod.title}
          </Text>
          <View className="gap-2">
            {CALCULATION_METHODS.map((method) => (
              <Pressable
                accessibilityRole="radio"
                accessibilityState={{ selected: method.id === state.methodId }}
                className={`rounded-card border px-4 py-3 ${method.id === state.methodId ? 'border-primary bg-primary' : 'border-border bg-surface'}`}
                key={method.id}
                onPress={() => void changeMethod(method.id)}
                testID={`prayer-method-${method.id}`}
              >
                <Text
                  className={
                    method.id === state.methodId
                      ? 'text-body text-on-primary'
                      : 'text-body text-foreground'
                  }
                >
                  {method.label}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>
        {hydrated && !coords ? (
          <View
            className="gap-2 rounded-card border border-border bg-surface p-4"
            testID="prayer-times-no-location"
          >
            <Text className="text-body text-start text-foreground">
              {PRAYER_TIMES_COPY.enableLocation}
            </Text>
            <Text className="text-small text-start text-muted-foreground">
              {device.status?.location.message ?? deviceCopy.settings.locationChecking}
            </Text>
            {locationAction ? (
              <Pressable
                accessibilityRole="button"
                className="rounded-card border border-primary bg-primary/10 p-3"
                onPress={() => handleLocationAction(locationAction.type)}
                testID="prayer-times-location-action"
              >
                <Text className="text-body text-start text-primary">
                  {locationAction.label}
                </Text>
              </Pressable>
            ) : (
              <Pressable
                accessibilityRole="button"
                className="rounded-card border border-primary bg-primary/10 p-3"
                disabled={device.isRequestingLocation}
                onPress={() => void requestLocation()}
                testID="prayer-times-request-location"
              >
                <Text className="text-body text-start text-primary">{deviceCopy.settings.requestLocation}</Text>
              </Pressable>
            )}
          </View>
        ) : null}
        {coords && device.status?.location && device.status.location.state !== 'ready' && device.status.location.state !== 'offline-cache' ? (
          <View className="gap-2 rounded-card border border-border bg-surface p-4" testID="prayer-times-location-status">
            <Text className="text-body text-start text-foreground">
              {device.status.location.message}
            </Text>
            {locationAction ? (
              <Pressable
                accessibilityRole="button"
                className="rounded-card border border-primary bg-primary/10 p-3"
                onPress={() => handleLocationAction(locationAction.type)}
                testID="prayer-times-location-action"
              >
                <Text className="text-body text-start text-primary">
                  {locationAction.label}
                </Text>
              </Pressable>
            ) : null}
          </View>
        ) : null}
        {coords && device.cachedLocation?.city ? (
          <Text className="text-small text-start text-muted-foreground" testID="prayer-times-city">
            {device.cachedLocation.city}
          </Text>
        ) : null}
        {device.actionError ? (
          <View className="gap-2 rounded-card border border-border bg-surface p-4" testID="prayer-times-location-error">
            <Text className="text-small text-start text-muted-foreground">
              {deviceCopy.errors.actionFailed}
            </Text>
            <Pressable
              accessibilityRole="button"
              className="rounded-card border border-primary bg-primary/10 p-3"
              onPress={() => void device.retryLastAction()}
              testID="prayer-times-location-error-retry"
            >
              <Text className="text-body text-start text-primary">
                {deviceCopy.actions.retryDeviceAction}
              </Text>
            </Pressable>
          </View>
        ) : null}
        {routeError ? (
          <Text className="text-small text-start text-muted-foreground" testID="prayer-times-action-error">
            {deviceCopy.errors.actionFailed}
          </Text>
        ) : null}
        {hydrated && times ? (
          <View className="gap-3" testID="prayer-times-table">
            <Text className="text-body text-start text-primary" testID="prayer-status">
              {status ?? ''}
            </Text>
            <View className="gap-2">
              {points.map((point) => (
                <View
                  accessibilityState={{ selected: timeline?.point.id === point.id }}
                  className={`flex-row items-center justify-between rounded-card border px-4 py-3 ${timeline?.point.id === point.id ? 'border-primary bg-primary/10' : 'border-border bg-surface'}`}
                  key={point.id}
                  testID={`prayer-row-${point.id}`}
                >
                  <Text className="text-body text-start text-foreground">{point.label}</Text>
                  <Text className="text-body text-start text-primary">
                    {formatPrayerTime(point.at)}
                  </Text>
                </View>
              ))}
            </View>
          </View>
        ) : null}
      </View>
    </ScreenContainer>
  )
}
