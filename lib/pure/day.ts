import type { DayId } from '@/types/wird'

// Pure day helpers. A DayId is the local calendar day 'YYYY-MM-DD'. The current day comes from
// the impure clock (lib/impure/clock) — these functions only transform values passed in, so
// they stay testable with zero mocks.

const DAY_ID_PATTERN = /^\d{4}-\d{2}-\d{2}$/

// Formats a Date to a DayId in the machine's local timezone. Local (not UTC) is deliberate: a
// wird belongs to the user's calendar day, not the server's.
export function toDayId(date: Date): DayId {
  const year = date.getFullYear()
  const month = `${date.getMonth() + 1}`.padStart(2, '0')
  const day = `${date.getDate()}`.padStart(2, '0')
  return `${year}-${month}-${day}`
}

export function isDayId(value: string): value is DayId {
  return DAY_ID_PATTERN.test(value)
}

// Lexicographic comparison works for 'YYYY-MM-DD' and matches chronological order. Returns
// negative if a < b, 0 if equal, positive if a > b.
export function compareDayId(a: DayId, b: DayId): number {
  return a < b ? -1 : a > b ? 1 : 0
}
