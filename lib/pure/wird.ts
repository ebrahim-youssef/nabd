import type { DayId, WirdEntry, WirdVersion } from '@/types/wird'

import { compareDayId } from './day'

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
