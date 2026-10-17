import {
  bestStreak,
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
import type {
  AreaStat,
  DayCompletion,
  ItemStat,
  QadaEvent,
  RangeSummary,
  WirdRepository,
} from '@nabd/shared'
import { useSQLiteContext } from 'expo-sqlite'
import { Share } from 'react-native'
import { useCallback, useMemo, useState } from 'react'

import { useLiveRepositoryQuery } from '../shell/useLiveRepositoryQuery'
import { logger } from '../observability/logger'
import { createQadaRepository } from '../qada/db'
import { useWirdRepository } from '../wird/useWirdRepository'
import { earliestDay } from './logic'

export const STATS_WINDOW_DAYS = 30
export const CHART_WINDOW_DAYS = 7

type StatsData = {
  completions: DayCompletion[]
  summary: RangeSummary
  todayAreas: AreaStat[]
  itemStats: ItemStat[]
  qada: ReturnType<typeof qadaRemaining>
}

const EMPTY_SUMMARY: RangeSummary = { days: 0, total: 0, done: 0, completedDays: 0 }

type StatsProjection =
  | {
      status: 'ready'
      versions: Awaited<ReturnType<WirdRepository['listVersions']>>
      entries: Awaited<ReturnType<WirdRepository['getEntriesInRange']>>
      allEntries: Awaited<ReturnType<WirdRepository['getAllEntries']>>
      qadaEvents: QadaEvent[]
    }
  | { status: 'error' }

export function useStats(): {
  isLoading: boolean
  error: boolean
  days: string[]
  chartDays: string[]
  data: StatsData
  refresh: () => void
  exportRange: (daysCount: number, label: string) => Promise<void>
} {
  const database = useSQLiteContext()
  const wird = useWirdRepository()
  const qada = useMemo(() => createQadaRepository(database), [database])
  const [today] = useState(() => toDayId(new Date()))
  const days = useMemo(() => lastNDays(today, STATS_WINDOW_DAYS), [today])
  const chartDays = useMemo(() => lastNDays(today, CHART_WINDOW_DAYS), [today])
  const read = useCallback(async (): Promise<StatsProjection> => {
    try {
      const [versions, entries, allEntries, qadaEvents] = await Promise.all([
        wird.listVersions(),
        wird.getEntriesInRange(days[0], days[days.length - 1]),
        wird.getAllEntries(),
        qada.listQadaEvents(),
      ])
      return { status: 'ready', versions, entries, allEntries, qadaEvents }
    } catch (cause: unknown) {
      logger.error('Native stats projection failed', cause)
      return { status: 'error' }
    }
  }, [days, qada, wird])
  const { data: persisted, isLoading, refresh } = useLiveRepositoryQuery(read)

  const exportRange = useCallback(
    async (daysCount: number, label: string) => {
      if (!Number.isInteger(daysCount) || daysCount <= 0) return
      const exportDays = lastNDays(today, daysCount)
      const from = exportDays[0]
      const to = exportDays[exportDays.length - 1]
      if (!from || !to) return
      try {
        const [versions, entries] = await Promise.all([
          wird.listVersions(),
          wird.getEntriesInRange(from, to),
        ])
        const completions = rangeCompletion(versions, entries, exportDays)
        await Share.share({
          title: `nabd-${label}-${to}.json`,
          message: JSON.stringify(
            {
              exportedFor: { from, to, days: daysCount },
              summary: summarize(completions),
              completions,
              entries,
            },
            null,
            2,
          ),
        })
      } catch (cause: unknown) {
        logger.error('Native stats export failed', cause)
      }
    },
    [today, wird],
  )

  const data = useMemo<StatsData>(() => {
    if (!persisted || persisted.status === 'error') {
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

  return {
    isLoading,
    error: persisted?.status === 'error',
    days,
    chartDays,
    data,
    refresh,
    exportRange,
  }
}

export { bestStreak, currentStreak }
