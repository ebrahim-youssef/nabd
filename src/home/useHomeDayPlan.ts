import { useSQLiteContext } from 'expo-sqlite'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { AppState } from 'react-native'

import { buildDayPlan, dailyLines } from '../day-plan/logic'
import type { DayPlan } from '../day-plan/types'
import { useWirdToday } from '../day-plan/WirdTodayProvider'
import { useLocationCapability } from '../device/useLocationCapability'
import { monthOf } from '../lib/day'
import { versionInForce } from '../lib/wird'
import { logger } from '../observability/logger'
import { createPreferencesRepository, PREFERENCE_KEYS } from '../preferences/db'
import {
  computeDayTimes,
  currentTimeZone,
  dateForCalendarDayInTimeZone,
  DEFAULT_METHOD_ID,
  isCalculationMethodId,
} from '../prayer-times/logic'
import type { DayPrayerTimes } from '../prayer-times/logic'
import { useLiveRepositoryQuery } from '../shell/useLiveRepositoryQuery'
import type { PersistedOnboarding } from '../onboarding/db'
import { useWirdRepository } from '../wird/useWirdRepository'
import type { DayId, WirdVersion } from '../wird/types'

const PLAN_REFRESH_INTERVAL_MS = 60_000
const MONTH_WIDTH = 2
const DAY_WIDTH = 2
const NUMBER_PADDING = '0'

export type HomeDayPlan = {
  day: DayId
  plan: DayPlan
  status: 'loading' | 'ready' | 'failed'
  versionId: string | null
  refresh: () => void
  now: number
  times: DayPrayerTimes | null
  nextFajr: number | null
  coordinates: { latitude: number; longitude: number } | null
  runLocationAction: () => Promise<void>
  dailyLines: ReturnType<typeof dailyLines>
  prayerActionReview: { day: DayId; at: number } | null
  markPrayerActionReviewSeen: (at: number) => Promise<void>
}

export function useHomeDayPlan(persisted: PersistedOnboarding): HomeDayPlan {
  const day = useWirdToday()
  const database = useSQLiteContext()
  const preferences = useMemo(() => createPreferencesRepository(database), [database])
  const repository = useWirdRepository()
  const location = useLocationCapability()
  const [now, setNow] = useState(Date.now)
  const [methodId, setMethodId] = useState(DEFAULT_METHOD_ID)

  useEffect(() => {
    let isActive = true
    void preferences
      .read(PREFERENCE_KEYS.calculationMethod)
      .then((value) => {
        if (isActive && isCalculationMethodId(value)) setMethodId(value)
      })
      .catch((cause: unknown) => {
        logger.error('Native Home calculation method preference load failed', cause)
      })
    return () => {
      isActive = false
    }
  }, [preferences])

  useEffect(() => {
    const refresh = () => setNow(Date.now())
    const timer = setInterval(refresh, PLAN_REFRESH_INTERVAL_MS)
    const appState = AppState.addEventListener('change', (state) => {
      if (state === 'active') refresh()
    })
    return () => {
      clearInterval(timer)
      appState.remove()
    }
  }, [])

  const read = useCallback(async () => {
    try {
      await repository.healVersionFromLevels({ today: day })
    } catch (cause: unknown) {
      logger.error(`Native Home version healing failed for day ${day}`, cause)
    }
    const [versions, entries, monthEntries] = await Promise.all([
      repository.listVersions(),
      repository.getDayEntries(day),
      repository.getMonthEntries(monthOf(day)),
    ])
    const version = versionInForce(versions, day) ?? persisted.activeWird
    return { entries, monthEntries, version }
  }, [day, persisted.activeWird, repository])
  const { data, isLoading, hasError, refresh } = useLiveRepositoryQuery(read)
  const readPrayerActionReview = useCallback(async () => {
    try {
      const seenAtValue = await preferences.read(PREFERENCE_KEYS.prayerActionReviewSeenAt)
      return await repository.readLatestStaleAction(parsePrayerActionReviewSeenAt(seenAtValue))
    } catch (cause: unknown) {
      logger.error('Native Home prayer action review read failed', cause)
      return null
    }
  }, [preferences, repository])
  const { data: prayerActionReview, refresh: refreshPrayerActionReview } =
    useLiveRepositoryQuery(readPrayerActionReview)
  const markPrayerActionReviewSeen = useCallback(
    async (at: number) => {
      try {
        await preferences.write(PREFERENCE_KEYS.prayerActionReviewSeenAt, String(at), Date.now())
        refreshPrayerActionReview()
      } catch (cause: unknown) {
        logger.error(`Native Home prayer action review preference write failed at ${at}`, cause)
      }
    },
    [preferences, refreshPrayerActionReview],
  )
  const timeZone = currentTimeZone()
  const todayDate = dateForCalendarDayInTimeZone(now, timeZone)
  const localToday = [
    todayDate.getFullYear(),
    String(todayDate.getMonth() + 1).padStart(MONTH_WIDTH, NUMBER_PADDING),
    String(todayDate.getDate()).padStart(DAY_WIDTH, NUMBER_PADDING),
  ].join('-')
  const dayOffset = localToday === day ? 0 : -1
  const dayDate = dateForCalendarDayInTimeZone(now, timeZone, dayOffset)
  const tomorrowDate = dateForCalendarDayInTimeZone(now, timeZone, dayOffset + 1)
  const times = location.coordinates
    ? computeDayTimes(location.coordinates, dayDate, methodId)
    : null
  const nextFajr = location.coordinates
    ? computeDayTimes(location.coordinates, tomorrowDate, methodId).fajr
    : null
  const version: WirdVersion = data?.version ?? persisted.activeWird
  const plan = buildDayPlan({
    now,
    day,
    times,
    nextFajr,
    definition: version.definition,
    entries: data?.entries ?? [],
    monthEntries: data?.monthEntries ?? [],
  })
  const dailyLineContent = dailyLines(day)
  const status: HomeDayPlan['status'] =
    data && !hasError ? 'ready' : isLoading && !hasError ? 'loading' : 'failed'

  return {
    day,
    plan,
    status,
    versionId: data?.version.id ?? null,
    refresh,
    now,
    times,
    nextFajr,
    coordinates: location.coordinates,
    runLocationAction: () => location.runAction(),
    dailyLines: dailyLineContent,
    prayerActionReview: prayerActionReview ?? null,
    markPrayerActionReviewSeen,
  }
}

function parsePrayerActionReviewSeenAt(value: string | null): number {
  if (value === null || !/^\d+$/.test(value)) return 0
  const parsed = Number(value)
  return Number.isSafeInteger(parsed) && parsed >= 0 ? parsed : 0
}
