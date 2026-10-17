import { compareDayId, toArabicIndic } from '@nabd/shared'
import type { DayId } from '@nabd/shared'

const PERCENT = 100
const ARABIC_WEEKDAY_FORMATTER = new Intl.DateTimeFormat('ar-EG', {
  timeZone: 'UTC',
  weekday: 'long',
})

export function completionPercent(done: number, total: number): number {
  return total > 0 ? Math.round((done / total) * PERCENT) : 0
}

export function formatCompletion(done: number, total: number): string {
  return `${toArabicIndic(done)}/${toArabicIndic(total)}`
}

export function formatArabicWeekday(day: DayId): string {
  return ARABIC_WEEKDAY_FORMATTER.format(new Date(`${day}T00:00:00.000Z`))
}

export function earliestDay(
  versions: readonly { effectiveFrom: DayId }[],
  entries: readonly { day: DayId }[],
  today: DayId,
): DayId {
  let earliest = today
  for (const version of versions) {
    if (compareDayId(version.effectiveFrom, earliest) < 0) earliest = version.effectiveFrom
  }
  for (const entry of entries) if (compareDayId(entry.day, earliest) < 0) earliest = entry.day
  return compareDayId(earliest, today) > 0 ? today : earliest
}
