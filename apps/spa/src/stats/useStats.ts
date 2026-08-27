import { useLiveQuery } from 'dexie-react-hooks'

import { dayAreaStats, rangeCompletion, summarize } from '@nabd/shared'
import type { AreaStat, DayCompletion, DayId, RangeSummary } from '@nabd/shared'

import { getEntriesInRange, listVersions } from '../wird/db'

type StatsState = {
  isLoading: boolean
  completions: DayCompletion[]
  summary: RangeSummary
  todayAreas: AreaStat[]
}

const EMPTY_SUMMARY: RangeSummary = { days: 0, total: 0, done: 0, completedDays: 0 }

// Live statistics over `days` (oldest first; the last item is treated as "today" for the area
// drill-down). Reads versions and the entries in range through the wird repository — statistics own
// no persistence and never write — then derives everything purely, so a check-off shows up
// immediately and past days stay fixed when the wird changes.
export function useStats(days: DayId[]): StatsState {
  const from = days[0]
  const to = days[days.length - 1]

  const data = useLiveQuery(async () => {
    const [versions, entries] = await Promise.all([listVersions(), getEntriesInRange(from, to)])
    return { versions, entries }
  }, [from, to])

  if (!data) {
    return { isLoading: true, completions: [], summary: EMPTY_SUMMARY, todayAreas: [] }
  }

  const completions = rangeCompletion(data.versions, data.entries, days)
  return {
    isLoading: false,
    completions,
    summary: summarize(completions),
    todayAreas: dayAreaStats(data.versions, data.entries, to),
  }
}
