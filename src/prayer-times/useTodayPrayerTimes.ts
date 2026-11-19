import { PRAYER_LABELS, COPY as PRAYER_TIMES_COPY } from './copy'
import {
  computeDayTimes,
  DEFAULT_METHOD_ID,
  isCalculationMethodId,
  statusLine,
  timelineStatus,
} from './logic'
import type { CalculationMethodId, DayPrayerTimes } from './logic'
import type { TimePoint } from './types'
import { useFocusEffect } from 'expo-router'
import { useSQLiteContext } from 'expo-sqlite'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { AppState } from 'react-native'

import { useLocationCapability } from '../device/useLocationCapability'
import { subscribeTimeChange } from '../device/exactAlarm'
import { requestPrayerReschedule } from '../device/prayerAlarms'
import { logger } from '../observability/logger'
import { createPreferencesRepository, PREFERENCE_KEYS } from '../preferences/db'
import { currentTimeZone, dateForCalendarDayInTimeZone } from './logic'

const STATUS_REFRESH_MS = 60_000
const PRAYER_ORDER = ['fajr', 'sunrise', 'dhuhr', 'asr', 'maghrib', 'isha'] as const

export type TodayPrayerTimesOptions = {
  now?: () => number
  today?: () => Date
}

function prayerPoints(times: DayPrayerTimes): TimePoint[] {
  return PRAYER_ORDER.map((id) => ({ id, label: PRAYER_LABELS[id], at: times[id] }))
}

export function useTodayPrayerTimes({ now = Date.now, today }: TodayPrayerTimesOptions = {}) {
  const database = useSQLiteContext()
  const preferences = useMemo(() => createPreferencesRepository(database), [database])
  const location = useLocationCapability()
  const [methodId, setMethodId] = useState<CalculationMethodId>(DEFAULT_METHOD_ID)
  const [, setClockTick] = useState(0)

  // The status line counts minutes, so re-render once a minute while mounted.
  useEffect(() => {
    const timer = setInterval(() => setClockTick((tick) => tick + 1), STATUS_REFRESH_MS)
    return () => clearInterval(timer)
  }, [])

  useEffect(() => {
    const refreshClock = () => setClockTick((tick) => tick + 1)
    const appStateSubscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') refreshClock()
    })
    const unsubscribeTimeChange = subscribeTimeChange(refreshClock)

    return () => {
      appStateSubscription.remove()
      unsubscribeTimeChange()
    }
  }, [])

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
  const timeZone = currentTimeZone()
  const date = today ? today() : dateForCalendarDayInTimeZone(instant, timeZone)
  const times = location.coordinates ? computeDayTimes(location.coordinates, date, methodId) : null
  const tomorrowTimes = location.coordinates
    ? computeDayTimes(
        location.coordinates,
        dateForCalendarDayInTimeZone(instant, timeZone, 1),
        methodId,
      )
    : null
  const points = times
    ? [
        ...prayerPoints(times),
        ...(tomorrowTimes
          ? [{ id: 'tomorrow-fajr', label: PRAYER_TIMES_COPY.tomorrowFajr, at: tomorrowTimes.fajr }]
          : []),
      ]
    : []
  const currentPoint = [...points].reverse().find((point) => point.at <= instant)
  const nextPrayer = points.find((point) => point.id !== 'sunrise' && point.at > instant)
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
    currentPoint,
    date,
    instant,
    methodId,
    nextPrayer,
    points,
    prayerStatus,
    times,
    timeline,
  }
}
