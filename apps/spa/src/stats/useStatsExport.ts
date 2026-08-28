import { useCallback } from 'react'

import { lastNDays, rangeCompletion, summarize, toDayId } from '@nabd/shared'

import { downloadJson } from '../download'
import { getEntriesInRange, listVersions } from '../wird/db'

// Exports the user's own data for a window ending today (NBD-31): raw entries plus the derived
// per-day completions and summary, as a downloaded JSON file. Everything comes from the local Dexie
// store — nothing leaves the device except into the user's file.
export function useStatsExport() {
  const exportRange = useCallback(async (daysCount: number, label: string) => {
    const days = lastNDays(toDayId(new Date()), daysCount)
    const from = days[0]
    const to = days[days.length - 1]
    const [versions, entries] = await Promise.all([listVersions(), getEntriesInRange(from, to)])
    const completions = rangeCompletion(versions, entries, days)
    downloadJson(`nabd-${label}-${to}.json`, {
      exportedFor: { from, to, days: daysCount },
      summary: summarize(completions),
      completions,
      entries,
    })
  }, [])

  return { exportRange }
}
