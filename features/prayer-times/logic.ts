import { toArabicIndic } from '@/lib/pure/format'

import type { TimePoint, TimelineStatus } from './types'

// Pure timeline math (ADR-0009): time points + `now` in, status out. No clock, no I/O.

// How long a time point is announced ("أذّن … منذ") before switching to the next countdown.
export const AFTER_WINDOW_MS = 30 * 60 * 1000

const MS_PER_MINUTE = 60_000
const MINUTES_PER_HOUR = 60

// The status the sub-header shows at `now`: the most recent point within the announce
// window wins; otherwise count down to the next point. Null when `points` has nothing
// upcoming and nothing recent (caller includes tomorrow's fajr so this stays rare).
export function timelineStatus(points: TimePoint[], now: number): TimelineStatus {
  const sorted = [...points].sort((a, b) => a.at - b.at)
  for (let i = sorted.length - 1; i >= 0; i -= 1) {
    const point = sorted[i]
    if (point.at <= now && now - point.at <= AFTER_WINDOW_MS) {
      return { kind: 'since', point, minutes: Math.floor((now - point.at) / MS_PER_MINUTE) }
    }
  }
  const next = sorted.find((point) => point.at > now)
  return next ? { kind: 'until', point: next, ms: next.at - now } : null
}

// 'باقي ٥٥ دقيقة' / 'باقي ساعة و٢٠ دقيقة' style duration, Arabic-Indic.
export function formatDuration(ms: number): string {
  const totalMinutes = Math.max(1, Math.ceil(ms / MS_PER_MINUTE))
  const hours = Math.floor(totalMinutes / MINUTES_PER_HOUR)
  const minutes = totalMinutes % MINUTES_PER_HOUR
  if (hours === 0) return `${toArabicIndic(minutes)} دقيقة`
  const hourPart = hours === 1 ? 'ساعة' : hours === 2 ? 'ساعتين' : `${toArabicIndic(hours)} ساعات`
  return minutes === 0 ? hourPart : `${hourPart} و${toArabicIndic(minutes)} دقيقة`
}

// The full sub-header line for a status.
export function statusLine(status: TimelineStatus): string | null {
  if (!status) return null
  if (status.kind === 'since') {
    const since = status.minutes <= 1 ? 'منذ دقيقة' : `منذ ${toArabicIndic(status.minutes)} دقيقة`
    return status.point.id === 'sunrise' ? `الشروق ${since}` : `أذّن ${status.point.label} ${since}`
  }
  const target = status.point.id === 'sunrise' ? 'الشروق' : status.point.label
  return `باقي ${formatDuration(status.ms)} على ${target}`
}
