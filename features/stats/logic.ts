import { latestStateByItem, versionInForce } from '@/lib/pure/wird'
import type { DayId, WirdEntry, WirdVersion } from '@/types/wird'

import type { AreaStat, DayCompletion, RangeSummary } from './types'

// Pure statistics. Every figure for a day is computed against the wird version in force on THAT
// day (ADR-0006), which is what keeps history stable: adding a new version (effective later)
// cannot change an earlier day's numbers, because that earlier day still resolves to its own
// version. Data and days are passed in; no I/O, no clock.

function entriesOnDay(entries: WirdEntry[], day: DayId): WirdEntry[] {
  return entries.filter((entry) => entry.day === day)
}

// Completion for a single day, or null if no wird had taken effect yet on that day.
export function dayCompletion(
  versions: WirdVersion[],
  entries: WirdEntry[],
  day: DayId,
): DayCompletion | null {
  const version = versionInForce(versions, day)
  if (!version) return null

  const state = latestStateByItem(entriesOnDay(entries, day))
  const total = version.definition.items.length
  let done = 0
  for (const item of version.definition.items) {
    if (state.get(item.id)) done += 1
  }
  return { day, total, done }
}

// Completion for each day in `days` that has a wird in force (others are skipped).
export function rangeCompletion(
  versions: WirdVersion[],
  entries: WirdEntry[],
  days: DayId[],
): DayCompletion[] {
  const out: DayCompletion[] = []
  for (const day of days) {
    const completion = dayCompletion(versions, entries, day)
    if (completion) out.push(completion)
  }
  return out
}

// Per-area breakdown for one day, in display order (the drill-down view).
export function dayAreaStats(
  versions: WirdVersion[],
  entries: WirdEntry[],
  day: DayId,
): AreaStat[] {
  const version = versionInForce(versions, day)
  if (!version) return []

  const state = latestStateByItem(entriesOnDay(entries, day))
  return [...version.definition.areas]
    .sort((a, b) => a.order - b.order)
    .map((area) => {
      const items = version.definition.items.filter((item) => item.areaId === area.id)
      const done = items.filter((item) => state.get(item.id)).length
      return { areaId: area.id, label: area.label, total: items.length, done }
    })
}

// Rolls a set of day completions up into range totals.
export function summarize(completions: DayCompletion[]): RangeSummary {
  let total = 0
  let done = 0
  let completedDays = 0
  for (const completion of completions) {
    total += completion.total
    done += completion.done
    if (completion.total > 0 && completion.done === completion.total) completedDays += 1
  }
  return { days: completions.length, total, done, completedDays }
}
