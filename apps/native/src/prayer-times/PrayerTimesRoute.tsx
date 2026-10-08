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
import type { CalculationMethodId, DayPrayerTimes, TimePoint } from '@nabd/shared'
import { useSQLiteContext } from 'expo-sqlite'
import { useEffect, useMemo, useState } from 'react'
import { ActivityIndicator, Pressable, View } from 'react-native'

import { PageHeader } from '../shell/PageHeader'
import { ScreenContainer } from '../shell/ScreenContainer'
import { Text } from '../shell/Text'
import { logger } from '../observability/logger'
import { createPreferencesRepository, PREFERENCE_KEYS } from '../preferences/db'
import { useLocationCapability } from '../device/useLocationCapability'
import { requestPrayerReschedule } from '../device/prayerAlarms'

const PRAYER_ORDER = ['fajr', 'sunrise', 'dhuhr', 'asr', 'maghrib', 'isha'] as const

type PrayerTimesRouteProps = {
  now?: () => number
  today?: () => Date
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
  const { status: locationStatus, coordinates, isRefreshing, runAction } = useLocationCapability()
  const [methodId, setMethodId] = useState<CalculationMethodId>(DEFAULT_METHOD_ID)

  useEffect(() => {
    let active = true
    void preferences
      .read(PREFERENCE_KEYS.calculationMethod)
      .then((method) => {
        if (!active) return
        setMethodId(isCalculationMethodId(method) ? method : DEFAULT_METHOD_ID)
      })
      .catch((cause: unknown) => {
        logger.error('Native prayer time preferences load failed', cause)
      })

    return () => {
      active = false
    }
  }, [preferences])

  const instant = now()
  const date = today ? today() : new Date(instant)
  const times = coordinates ? computeDayTimes(coordinates, date, methodId) : null
  const tomorrowTimes = coordinates ? computeDayTimes(coordinates, nextDay(date), methodId) : null
  const points = times
    ? [
        ...prayerPoints(times),
        ...(tomorrowTimes
          ? [{ id: 'tomorrow-fajr', label: PRAYER_TIMES_COPY.tomorrowFajr, at: tomorrowTimes.fajr }]
          : []),
      ]
    : []
  const timeline = timelineStatus(points, instant)
  const prayerStatus = statusLine(timeline)
  const showLocationMessage = locationStatus.state !== 'ready'

  async function changeMethod(methodId: CalculationMethodId) {
    setMethodId(methodId)
    try {
      await preferences.write(PREFERENCE_KEYS.calculationMethod, methodId, now())
      requestPrayerReschedule()
    } catch (cause: unknown) {
      logger.error('Native prayer calculation method write failed', cause, {
        operation: 'change-calculation-method',
      })
    }
  }

  return (
    <ScreenContainer testID="prayer-times-screen">
      <View className="gap-6">
        <PageHeader backHref="/" title={shellCopy.nav.prayerTimes} />
        <View className="gap-3" testID="prayer-methods">
          <Text className="font-display text-label text-start text-muted-foreground">
            {SETTINGS_COPY.prayerMethod.title}
          </Text>
          <View className="gap-2">
            {CALCULATION_METHODS.map((method) => (
              <Pressable
                accessibilityRole="radio"
                accessibilityState={{ selected: method.id === methodId }}
                className={`rounded-card border px-4 py-3 ${method.id === methodId ? 'border-primary bg-primary' : 'border-border bg-surface'}`}
                key={method.id}
                onPress={() => void changeMethod(method.id)}
                testID={`prayer-method-${method.id}`}
              >
                <Text
                  className={
                    method.id === methodId
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
        <View
          className="gap-3 rounded-card border border-border bg-surface p-4 shadow-card-sm"
          testID="prayer-times-location-card"
        >
          <View className="flex-row items-center gap-2">
            {isRefreshing ? (
              <ActivityIndicator size="small" testID="prayer-times-location-refreshing" />
            ) : null}
          </View>
          {showLocationMessage ? (
            <Text
              className="text-small text-start text-muted-foreground"
              testID="prayer-times-location-message"
            >
              {locationStatus.message}
            </Text>
          ) : null}
          {locationStatus.action ? (
            <Pressable
              accessibilityRole="button"
              accessibilityState={{ disabled: isRefreshing }}
              className={`rounded-button border border-primary bg-primary/10 px-4 py-3 ${isRefreshing ? 'opacity-50' : ''}`}
              disabled={isRefreshing}
              onPress={() => void runAction()}
              testID="prayer-times-location-action"
            >
              <Text className="text-body text-center font-body-medium text-primary">
                {locationStatus.action.label}
              </Text>
            </Pressable>
          ) : null}
        </View>
        {times ? (
          <View className="gap-3" testID="prayer-times-table">
            <Text className="text-body text-start text-primary" testID="prayer-status">
              {prayerStatus ?? ''}
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
