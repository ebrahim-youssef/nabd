import { compareDayId, weekdayOf } from './day'
import type { DayId, WirdEntry, WirdItem, WirdVersion } from '../wird/types'

export function versionInForce(versions: WirdVersion[], day: DayId): WirdVersion | null {
  let best: WirdVersion | null = null
  for (const version of versions) {
    if (compareDayId(version.effectiveFrom, day) > 0) continue
    if (best === null) {
      best = version
      continue
    }
    const byDay = compareDayId(version.effectiveFrom, best.effectiveFrom)
    if (byDay > 0 || (byDay === 0 && version.createdAt > best.createdAt)) best = version
  }
  return best
}

export function isScheduledOn(item: WirdItem, day: DayId): boolean {
  if (item.schedule?.type !== 'weekdays') return true
  return item.schedule.days.includes(weekdayOf(day))
}

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
