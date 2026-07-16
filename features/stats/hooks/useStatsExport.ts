'use client'

import { useCallback } from 'react'

import { today } from '@/lib/impure/clock'
import { downloadJson } from '@/lib/impure/download'
import { lastNDays } from '@/lib/pure/day'

import { getEntriesInRange, getVersions } from '../db'
import { rangeCompletion, summarize } from '../logic'

// Exports the user's own data for a window ending today (NBD-31): raw entries plus the
// derived per-day completions and summary, as a downloaded JSON file. Everything comes from
// the local Dexie store — nothing leaves the device except into the user's file.
export function useStatsExport() {
  const exportRange = useCallback(async (daysCount: number, label: string) => {
    const days = lastNDays(today(), daysCount)
    const from = days[0]
    const to = days[days.length - 1]
    const [versions, entries] = await Promise.all([getVersions(), getEntriesInRange(from, to)])
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
