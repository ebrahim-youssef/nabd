import { useSQLiteContext } from 'expo-sqlite'
import { useCallback, useEffect, useMemo, useState } from 'react'

import { buildDayPlan } from '../day-plan/logic'
import type { DayPlan } from '../day-plan/types'
import { useWirdToday } from '../day-plan/WirdTodayProvider'
import { useLocationCapability } from '../device/useLocationCapability'
import { compareDayId, monthOf, nextDay } from '../lib/day'
import { versionInForce } from '../lib/wird'
import { logger } from '../observability/logger'
import { PREFERENCE_KEYS, createPreferencesRepository } from '../preferences/db'
import { computeDayTimes, DEFAULT_METHOD_ID, isCalculationMethodId } from '../prayer-times/logic'
import { useLiveRepositoryQuery } from '../shell/useLiveRepositoryQuery'
import { useWirdRepository } from '../wird/useWirdRepository'
import type { DayId, WirdDefinition } from '../wird/types'

const PLAN_REFRESH_INTERVAL_MS = 60_000
const MONTH_INDEX_OFFSET = 1
const DATE_LABEL_NOON_HOUR = 12
const EMPTY_DEFINITION: WirdDefinition = { areas: [], items: [] }

export type TodayDayPlan = {
  currentDay: DayId
  plan: DayPlan
  observation?: unknown
  versionId: string | null
  status: 'loading' | 'ready' | 'failed' | 'unavailable'
  earliestVersionDay: DayId | null
  refresh: () => void
}

export function useTodayDayPlan(day: DayId): TodayDayPlan {
  const currentDay = useWirdToday()
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
        logger.error('Native Today calculation method preference load failed', cause)
      })
    return () => {
      isActive = false
    }
  }, [preferences])

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), PLAN_REFRESH_INTERVAL_MS)
    return () => clearInterval(timer)
  }, [])

  const read = useCallback(async () => {
    try {
      await repository.healVersionFromLevels({ today: currentDay })
    } catch (cause: unknown) {
      logger.error(`Native Today version healing failed for day ${currentDay}`, cause)
    }
    const [versions, entries, monthEntries] = await Promise.all([
      repository.listVersions(),
      repository.getDayEntries(day),
      repository.getMonthEntries(monthOf(day)),
    ])
    return { versions, entries, monthEntries }
  }, [currentDay, day, repository])
  const { data, isLoading, hasError, refresh } = useLiveRepositoryQuery(read)
  const date = dateForDay(day)
  const nextDate = dateForDay(nextDay(day))
  const times = location.coordinates ? computeDayTimes(location.coordinates, date, methodId) : null
  const nextFajr = location.coordinates
    ? computeDayTimes(location.coordinates, nextDate, methodId).fajr
    : null
  const version = data ? (versionInForce(data.versions, day) ?? null) : null
  const earliestVersionDay =
    data?.versions.reduce<DayId | null>(
      (earliest, candidate) =>
        earliest === null || compareDayId(candidate.effectiveFrom, earliest) < 0
          ? candidate.effectiveFrom
          : earliest,
      null,
    ) ?? null
  const status: TodayDayPlan['status'] = data
    ? hasError
      ? 'failed'
      : version
        ? 'ready'
        : 'unavailable'
    : hasError
      ? 'failed'
      : isLoading
        ? 'loading'
        : 'failed'
  const plan = buildDayPlan({
    now,
    day,
    times,
    nextFajr,
    definition: version?.definition ?? EMPTY_DEFINITION,
    entries: data?.entries ?? [],
    monthEntries: data?.monthEntries ?? [],
  })

  return {
    currentDay,
    plan,
    observation: data,
    versionId: version?.id ?? null,
    status,
    earliestVersionDay,
    refresh,
  }
}

function dateForDay(day: DayId): Date {
  const [year, month, dayOfMonth] = day.split('-').map(Number)
  return new Date(year, month - MONTH_INDEX_OFFSET, dayOfMonth, DATE_LABEL_NOON_HOUR)
}
