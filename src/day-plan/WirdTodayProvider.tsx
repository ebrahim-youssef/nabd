import type { ReactNode } from 'react'
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import { AppState } from 'react-native'
import { useSQLiteContext } from 'expo-sqlite'

import type { DayId } from '../wird/types'
import { logger } from '../observability/logger'
import { PREFERENCE_KEYS, createPreferencesRepository } from '../preferences/db'
import { useLocationCapability } from '../device/useLocationCapability'
import { subscribeTimeChange } from '../device/exactAlarm'
import {
  computeDayTimes,
  currentTimeZone,
  dateForCalendarDayInTimeZone,
  DEFAULT_METHOD_ID,
  isCalculationMethodId,
} from '../prayer-times/logic'
import type { CalculationMethodId } from '../prayer-times/logic'
import { isUsableDayTimes, resolveWirdDay } from './logic'

const MINUTE_MS = 60_000
const READINESS_TIMEOUT_MS = 3_000
const WirdTodayContext = createContext<DayId | null>(null)
const WirdTodayRefreshContext = createContext<(() => void) | null>(null)

function nextLocalMidnight(date: Date): number {
  const midnight = new Date(date)
  midnight.setHours(24, 0, 0, 0)
  return midnight.getTime()
}

export function WirdTodayProvider({ children }: { children: ReactNode }) {
  const database = useSQLiteContext()
  const preferences = useMemo(() => createPreferencesRepository(database), [database])
  const location = useLocationCapability()
  const refreshLocation = location.refresh
  const [now, setNow] = useState(Date.now)
  const [methodId, setMethodId] = useState<CalculationMethodId>(DEFAULT_METHOD_ID)
  const [hasLoadedMethod, setHasLoadedMethod] = useState(false)
  const [locationReadTimedOut, setLocationReadTimedOut] = useState(false)
  const [methodReadTimedOut, setMethodReadTimedOut] = useState(false)
  const isMounted = useRef(false)
  const [hasBeenReady, setHasBeenReady] = useState(false)

  useEffect(() => {
    isMounted.current = true
    return () => {
      isMounted.current = false
    }
  }, [])

  const refreshMethod = useCallback(() => {
    void preferences
      .read(PREFERENCE_KEYS.calculationMethod)
      .then((value) => {
        if (!isMounted.current) return
        setMethodId(isCalculationMethodId(value) ? value : DEFAULT_METHOD_ID)
        setHasLoadedMethod(true)
      })
      .catch((cause: unknown) => {
        logger.error('Native wird-day calculation preference load failed', cause)
        if (isMounted.current) setHasLoadedMethod(true)
      })
  }, [preferences])

  const refreshWirdDay = useCallback(() => {
    setNow(Date.now())
    refreshMethod()
    void refreshLocation({ force: false })
  }, [refreshLocation, refreshMethod])

  useEffect(() => {
    const refreshNow = () => setNow(Date.now())
    const timer = setInterval(refreshNow, MINUTE_MS)
    const appState = AppState.addEventListener('change', (state) => {
      if (state === 'active') refreshWirdDay()
    })
    const unsubscribeTimeChange = subscribeTimeChange(refreshWirdDay)
    refreshMethod()
    return () => {
      clearInterval(timer)
      appState.remove()
      unsubscribeTimeChange()
    }
  }, [refreshMethod, refreshWirdDay])

  useEffect(() => {
    if (location.hasReadCache || locationReadTimedOut) return
    const timer = setTimeout(() => {
      logger.error(
        'Native wird-day readiness timed out waiting for saved-location cache read',
        new Error('Saved-location cache read did not settle before the readiness timeout'),
        { read: 'location-cache' },
      )
      setLocationReadTimedOut(true)
    }, READINESS_TIMEOUT_MS)
    return () => clearTimeout(timer)
  }, [location.hasReadCache, locationReadTimedOut])

  useEffect(() => {
    if (hasLoadedMethod || methodReadTimedOut) return
    const timer = setTimeout(() => {
      logger.error(
        'Native wird-day readiness timed out waiting for calculation-method preference read',
        new Error('Calculation-method preference read did not settle before the readiness timeout'),
        { read: 'calculation-method-preference' },
      )
      setMethodReadTimedOut(true)
    }, READINESS_TIMEOUT_MS)
    return () => clearTimeout(timer)
  }, [hasLoadedMethod, methodReadTimedOut])

  const timeZone = currentTimeZone()
  const date = dateForCalendarDayInTimeZone(now, timeZone)
  const coordinates = location.hasReadCache ? location.coordinates : null
  const times = coordinates ? computeDayTimes(coordinates, date, methodId) : null
  const nextDayTimes =
    coordinates && times && now >= times.fajr
      ? computeDayTimes(coordinates, dateForCalendarDayInTimeZone(now, timeZone, 1), methodId)
      : null
  const hasUsableTimes = isUsableDayTimes(times)
  const day = resolveWirdDay(now, times)
  const nextBoundaryAt =
    hasUsableTimes && times
      ? now < times.fajr
        ? times.fajr
        : (nextDayTimes?.fajr ?? times.fajr)
      : nextLocalMidnight(date)

  useEffect(() => {
    const timer = setTimeout(() => setNow(Date.now()), Math.max(0, nextBoundaryAt - now))
    return () => clearTimeout(timer)
  }, [nextBoundaryAt, now])

  const isReady =
    (location.hasReadCache || locationReadTimedOut) && (hasLoadedMethod || methodReadTimedOut)
  if (isReady && !hasBeenReady) setHasBeenReady(true)
  if (!isReady && !hasBeenReady) return null
  return (
    <WirdTodayRefreshContext.Provider value={refreshWirdDay}>
      <WirdTodayContext.Provider value={day}>{children}</WirdTodayContext.Provider>
    </WirdTodayRefreshContext.Provider>
  )
}

export function useWirdToday(): DayId {
  const day = useContext(WirdTodayContext)
  if (!day) throw new Error('useWirdToday must be used inside WirdTodayProvider')
  return day
}

export function useRefreshWirdDay(): () => void {
  const refresh = useContext(WirdTodayRefreshContext)
  if (!refresh) throw new Error('useRefreshWirdDay must be used inside WirdTodayProvider')
  return refresh
}
