import { useLiveQuery } from 'dexie-react-hooks'
import { useState } from 'react'

import { compareDayId, daysInRange, itemStats, toDayId, versionInForce } from '@nabd/shared'
import type { DayId, ItemStat } from '@nabd/shared'

import { getAllEntries, listVersions } from '../wird/db'

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
// versions and all entries — not a range — because an item's streak and misses are reckoned over
// its whole lifetime, so history stays correct through wird changes (a dropped item's streak
// bridges; past days never move).
export function useItemStats(): ItemStatsState {
  const [today] = useState(() => toDayId(new Date()))

  const data = useLiveQuery(async () => {
    const [versions, entries] = await Promise.all([listVersions(), getAllEntries()])
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
