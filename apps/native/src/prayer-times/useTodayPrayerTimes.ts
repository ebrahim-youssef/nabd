import {
  computeDayTimes,
  DEFAULT_METHOD_ID,
  isCalculationMethodId,
  PRAYER_LABELS,
  PRAYER_TIMES_COPY,
  statusLine,
  timelineStatus,
} from '@nabd/shared'
import type { CalculationMethodId, DayPrayerTimes, TimePoint } from '@nabd/shared'
import { useFocusEffect } from 'expo-router'
import { useSQLiteContext } from 'expo-sqlite'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

import { useLocationCapability } from '../device/useLocationCapability'
import { requestPrayerReschedule } from '../device/prayerAlarms'
import { logger } from '../observability/logger'
import { createPreferencesRepository, PREFERENCE_KEYS } from '../preferences/db'

const PRAYER_ORDER = ['fajr', 'sunrise', 'dhuhr', 'asr', 'maghrib', 'isha'] as const

export type TodayPrayerTimesOptions = {
  now?: () => number
  today?: () => Date
}

function prayerPoints(times: DayPrayerTimes): TimePoint[] {
  return PRAYER_ORDER.map((id) => ({ id, label: PRAYER_LABELS[id], at: times[id] }))
}

function nextDay(date: Date): Date {
  const next = new Date(date)
  next.setDate(next.getDate() + 1)
  return next
}

export function useTodayPrayerTimes({ now = Date.now, today }: TodayPrayerTimesOptions = {}) {
  const database = useSQLiteContext()
  const preferences = useMemo(() => createPreferencesRepository(database), [database])
  const location = useLocationCapability()
  const [methodId, setMethodId] = useState<CalculationMethodId>(DEFAULT_METHOD_ID)

  const readMethod = useCallback(() => {
    let active = true
    void preferences
      .read(PREFERENCE_KEYS.calculationMethod)
      .then((method) => {
        if (active) setMethodId(isCalculationMethodId(method) ? method : DEFAULT_METHOD_ID)
      })
      .catch((cause: unknown) => {
        logger.error('Native prayer time preferences load failed', cause)
      })

    return () => {
      active = false
    }
  }, [preferences])

  useEffect(() => readMethod(), [readMethod])

  const hasFocused = useRef(false)
  useFocusEffect(
    useCallback(() => {
      if (hasFocused.current) return readMethod()
      hasFocused.current = true
      return undefined
    }, [readMethod]),
  )

  const instant = now()
  const date = today ? today() : new Date(instant)
  const times = location.coordinates ? computeDayTimes(location.coordinates, date, methodId) : null
  const tomorrowTimes = location.coordinates
    ? computeDayTimes(location.coordinates, nextDay(date), methodId)
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
  const prayerStatus = statusLine(timeline)

  const changeMethod = useCallback(
    async (nextMethodId: CalculationMethodId): Promise<void> => {
      setMethodId(nextMethodId)
      try {
        await preferences.write(PREFERENCE_KEYS.calculationMethod, nextMethodId, now())
        requestPrayerReschedule()
      } catch (cause: unknown) {
        logger.error('Native prayer calculation method write failed', cause, {
          operation: 'change-calculation-method',
        })
      }
    },
    [now, preferences],
  )

  return {
    ...location,
    changeMethod,
    methodId,
    points,
    prayerStatus,
    times,
    timeline,
  }
}
