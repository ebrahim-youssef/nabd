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

// Weekday of a DayId, 0=Sunday … 6=Saturday. Computed in UTC from the date parts, so it is
// timezone- and DST-proof (a DayId is already the user's local calendar day).
export function weekdayOf(day: DayId): number {
  const [year, month, dayOfMonth] = day.split('-').map(Number)
  return new Date(Date.UTC(year, month - 1, dayOfMonth)).getUTCDay()
}

// The calendar month of a DayId, as 'YYYY-MM' (the aggregation window for monthly goals,
// ADR-0008).
export function monthOf(day: DayId): string {
  return day.slice(0, 7)
}

const MS_PER_DAY = 86_400_000

// The calendar day after `day`. Steps in UTC from the date parts, so it is DST-safe.
export function nextDay(day: DayId): DayId {
  const [year, month, dayOfMonth] = day.split('-').map(Number)
  const date = new Date(Date.UTC(year, month - 1, dayOfMonth) + MS_PER_DAY)
  const y = date.getUTCFullYear()
  const m = `${date.getUTCMonth() + 1}`.padStart(2, '0')
  const d = `${date.getUTCDate()}`.padStart(2, '0')
  return `${y}-${m}-${d}`
}

// The `n` calendar days ending at `today`, oldest first (e.g. lastNDays('2026-07-14', 7) →
// 2026-07-08 … 2026-07-14). Steps in UTC so it is DST-safe: it only counts calendar days, never
// wall-clock hours.
export function lastNDays(today: DayId, n: number): DayId[] {
  const [year, month, day] = today.split('-').map(Number)
  const base = Date.UTC(year, month - 1, day)
  const days: DayId[] = []
  for (let offset = n - 1; offset >= 0; offset -= 1) {
    const date = new Date(base - offset * MS_PER_DAY)
    // Format from UTC parts to match the UTC stepping above (avoids a near-midnight tz shift).
    const y = date.getUTCFullYear()
    const m = `${date.getUTCMonth() + 1}`.padStart(2, '0')
    const d = `${date.getUTCDate()}`.padStart(2, '0')
    days.push(`${y}-${m}-${d}`)
  }
  return days
}
