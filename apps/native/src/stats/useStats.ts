import {
  bestStreak,
  compareDayId,
  currentStreak,
  dayAreaStats,
  daysInRange,
  itemStats,
  lastNDays,
  qadaRemaining,
  rangeCompletion,
  summarize,
  toDayId,
  versionInForce,
} from '@nabd/shared'
import type { DayCompletion, ItemStat, RangeSummary, AreaStat, QadaEvent } from '@nabd/shared'
import { useSQLiteContext } from 'expo-sqlite'
import { useCallback, useMemo, useState } from 'react'

import { useLiveRepositoryQuery } from '../app/useLiveRepositoryQuery'
import { createQadaRepository } from '../qada/db'
import { useWirdRepository } from '../wird/useWirdRepository'

export const STATS_WINDOW_DAYS = 7

type StatsData = {
  completions: DayCompletion[]
  summary: RangeSummary
  todayAreas: AreaStat[]
  itemStats: ItemStat[]
  qada: ReturnType<typeof qadaRemaining>
}

const EMPTY_SUMMARY: RangeSummary = { days: 0, total: 0, done: 0, completedDays: 0 }

function earliestDay(
  versions: { effectiveFrom: string }[],
  entries: { day: string }[],
  today: string,
): string {
  let earliest = today
  for (const version of versions)
    if (compareDayId(version.effectiveFrom, earliest) < 0) earliest = version.effectiveFrom
  for (const entry of entries) if (compareDayId(entry.day, earliest) < 0) earliest = entry.day
  return compareDayId(earliest, today) > 0 ? today : earliest
}

export function useStats(): {
  isLoading: boolean
  days: string[]
  data: StatsData
  refresh: () => void
} {
  const database = useSQLiteContext()
  const wird = useWirdRepository()
  const qada = useMemo(() => createQadaRepository(database), [database])
  const [today] = useState(() => toDayId(new Date()))
  const days = useMemo(() => lastNDays(today, STATS_WINDOW_DAYS), [today])
  const read = useCallback(async () => {
    const [versions, entries, allEntries, qadaEvents] = await Promise.all([
      wird.listVersions(),
      wird.getEntriesInRange(days[0], days[days.length - 1]),
      wird.getAllEntries(),
      qada.listQadaEvents(),
    ])
    return { versions, entries, allEntries, qadaEvents }
  }, [days, qada, wird])
  const { data: persisted, isLoading, refresh } = useLiveRepositoryQuery(read)

  const data = useMemo<StatsData>(() => {
    if (!persisted) {
      return {
        completions: [],
        summary: EMPTY_SUMMARY,
        todayAreas: [],
        itemStats: [],
        qada: qadaRemaining([] as QadaEvent[]),
      }
    }

    const completions = rangeCompletion(persisted.versions, persisted.entries, days)
    const current = versionInForce(persisted.versions, today)
    const historyDays = daysInRange(
      earliestDay(persisted.versions, persisted.allEntries, today),
      today,
    )
    return {
      completions,
      summary: summarize(completions),
      todayAreas: dayAreaStats(persisted.versions, persisted.entries, today),
      itemStats: current
        ? itemStats(
            persisted.versions,
            persisted.allEntries,
            current.definition.items,
            historyDays,
            today,
          )
        : [],
      qada: qadaRemaining(persisted.qadaEvents),
    }
  }, [days, persisted, today])

  return { isLoading, days, data, refresh }
}

export { bestStreak, currentStreak }
