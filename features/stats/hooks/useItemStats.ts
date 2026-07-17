'use client'

import { useLiveQuery } from 'dexie-react-hooks'
import { useState } from 'react'

import { today as readToday } from '@/lib/impure/clock'
import { compareDayId, daysInRange } from '@/lib/pure/day'
import { versionInForce } from '@/lib/pure/wird'
import type { DayId } from '@/types/wird'

import { getAllEntries, getVersions } from '../db'
import { itemStats } from '../logic'
import type { ItemStat } from '../types'

type ItemStatsState = { isLoading: boolean; stats: ItemStat[] }

// The earliest day the user has any wird history — where per-item reckoning starts.
function earliestDay(
  versions: { effectiveFrom: DayId }[],
  entries: { day: DayId }[],
): DayId | null {
  let earliest: DayId | null = null
  for (const version of versions) {
    if (earliest === null || compareDayId(version.effectiveFrom, earliest) < 0) {
      earliest = version.effectiveFrom
    }
  }
  for (const entry of entries) {
    if (earliest === null || compareDayId(entry.day, earliest) < 0) earliest = entry.day
  }
  return earliest
}

// Per-item history (NBD-47) for the CURRENT wird's items, derived live from Dexie. Reads all
// versions + entries and computes each item's streak/consistency/misses purely, so history
// stays correct through wird changes (a dropped item's streak bridges; past days never move).
export function useItemStats(): ItemStatsState {
  const [today] = useState(() => readToday())

  const data = useLiveQuery(async () => {
    const [versions, entries] = await Promise.all([getVersions(), getAllEntries()])
    return { versions, entries }
  }, [])

  if (!data) return { isLoading: true, stats: [] }

  const current = versionInForce(data.versions, today)
  if (!current) return { isLoading: false, stats: [] }

  const start = earliestDay(data.versions, data.entries) ?? today
  // A version effective in the future would put start after today — clamp so the range is valid.
  const from = compareDayId(start, today) > 0 ? today : start
  const days = daysInRange(from, today)
  return {
    isLoading: false,
    stats: itemStats(data.versions, data.entries, current.definition.items, days, today),
  }
}
