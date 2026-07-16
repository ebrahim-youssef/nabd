import type { DayId, WirdEntry, WirdItem, WirdVersion } from '@/types/wird'

import { compareDayId, monthOf, weekdayOf } from './day'

// Pure, feature-agnostic wird resolution shared by the wird checklist and the statistics
// feature (a feature's logic.ts may not import another feature's logic, so the common bits live
// here in /lib/pure). No I/O, no clock.

// The version in force on `day` is the one with the greatest effectiveFrom that is ≤ day
// (ADR-0006 §2). Ties on effectiveFrom (an edit re-applied the same day) break to the later
// createdAt. Returns null when no version has taken effect yet.
export function versionInForce(versions: WirdVersion[], day: DayId): WirdVersion | null {
  let best: WirdVersion | null = null
  for (const version of versions) {
    if (compareDayId(version.effectiveFrom, day) > 0) continue
    if (best === null) {
      best = version
      continue
    }
    const byDay = compareDayId(version.effectiveFrom, best.effectiveFrom)
    if (byDay > 0 || (byDay === 0 && version.createdAt > best.createdAt)) {
      best = version
    }
  }
  return best
}

// Whether `item` is due on `day` (ADR-0008): weekdays items exist only on their days;
// everything else (daily, monthly-goal, no schedule) is due every day.
export function isScheduledOn(item: WirdItem, day: DayId): boolean {
  if (item.schedule?.type !== 'weekdays') return true
  return item.schedule.days.includes(weekdayOf(day))
}

// Done-days for a monthly-goal item within `month` ('YYYY-MM'): per calendar day, the latest
// event wins (ADR-0006 §3); a day counts when that final state is done.
export function monthlyDoneDays(entries: WirdEntry[], itemId: string, month: string): number {
  const latestByDay = new Map<string, { at: number; done: boolean }>()
  for (const entry of entries) {
    if (entry.itemId !== itemId || monthOf(entry.day) !== month) continue
    const seen = latestByDay.get(entry.day)
    if (!seen || entry.at > seen.at) latestByDay.set(entry.day, { at: entry.at, done: entry.done })
  }
  let done = 0
  for (const state of latestByDay.values()) {
    if (state.done) done += 1
  }
  return done
}

// Collapses append-only entry events to the current done-state per item: the latest event
// (greatest `at`) per itemId wins.
export function latestStateByItem(entries: WirdEntry[]): Map<string, boolean> {
  const latestAt = new Map<string, number>()
  const state = new Map<string, boolean>()
  for (const entry of entries) {
    const seen = latestAt.get(entry.itemId)
    if (seen === undefined || entry.at > seen) {
      latestAt.set(entry.itemId, entry.at)
      state.set(entry.itemId, entry.done)
    }
  }
  return state
}
