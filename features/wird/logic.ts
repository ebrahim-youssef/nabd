import { compareDayId } from '@/lib/pure/day'
import type { DayId, WirdDefinition, WirdEntry, WirdVersion } from '@/types/wird'

import type { ChecklistAreaView } from './types'

// Pure wird logic: given data (versions, entries, day) it derives the checklist view. No I/O,
// no clock — the day and the data are passed in. This is where the versioned-wird correctness
// lives, so it is tested directly.

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

// Resolves a wird definition + a day's entries into the grouped, ordered checklist view.
export function buildChecklist(
  definition: WirdDefinition,
  entries: WirdEntry[],
): ChecklistAreaView[] {
  const state = latestStateByItem(entries)
  const areas = [...definition.areas].sort((a, b) => a.order - b.order)
  return areas.map((area) => ({
    id: area.id,
    label: area.label,
    order: area.order,
    items: definition.items
      .filter((item) => item.areaId === area.id)
      .map((item) => ({
        id: item.id,
        label: item.label,
        kind: item.kind,
        target: item.target,
        done: state.get(item.id) ?? false,
      })),
  }))
}
