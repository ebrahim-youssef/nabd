import type { CalculationMethodId } from '../prayer-times/logic'
import type { TimelineStatus } from '../prayer-times/types'
import type { Coords } from './types'
import { PRAYER_LABELS } from '../prayer-times/copy'
import {
  AFTER_WINDOW_MS,
  computeDayTimes,
  DEFAULT_METHOD_ID,
  statusLine,
  timelineStatus,
} from '../prayer-times/logic'

// The Kotlin worker cannot compute prayer times, so the payload carries a month ahead; every
// app open replaces it, and it only lapses if the app stays closed for the whole month.
const COUNTDOWN_DAY_COUNT = 30
const PRAYER_IDS = ['fajr', 'sunrise', 'dhuhr', 'asr', 'maghrib', 'isha'] as const

export type CountdownPrayerId = (typeof PRAYER_IDS)[number]

export type CountdownBoundary = {
  id: CountdownPrayerId
  label: string
  at: number
  sunrise: boolean
}

export type CountdownPayload =
  | {
      kind: 'since'
      point: CountdownBoundary
      minutes: number
      text: string
    }
  | {
      kind: 'until'
      point: CountdownBoundary
      ms: number
      text: string
    }

function localCalendarDate(now: number, dayOffset: number): Date {
  const date = new Date(now)
  date.setHours(12, 0, 0, 0)
  date.setDate(date.getDate() + dayOffset)
  return date
}

export function boundaries(
  now: number,
  coordinates: Coords,
  method: CalculationMethodId = DEFAULT_METHOD_ID,
): CountdownBoundary[] {
  const cutoff = now - AFTER_WINDOW_MS
  const points: CountdownBoundary[] = []

  for (let dayOffset = 0; dayOffset < COUNTDOWN_DAY_COUNT; dayOffset += 1) {
    const times = computeDayTimes(coordinates, localCalendarDate(now, dayOffset), method)
    for (const id of PRAYER_IDS) {
      const at = times[id]
      if (at >= cutoff) {
        points.push({
          id,
          label: PRAYER_LABELS[id],
          at,
          sunrise: id === 'sunrise',
        })
      }
    }
  }

  return points.sort((first, second) => first.at - second.at)
}

function strictTimelineStatus(points: CountdownBoundary[], now: number): TimelineStatus {
  return timelineStatus(
    points.filter((point) => point.at > now || now - point.at < AFTER_WINDOW_MS),
    now,
  )
}

export function currentCountdown(
  points: CountdownBoundary[],
  now: number,
): CountdownPayload | null {
  const status = strictTimelineStatus(points, now)
  if (!status) return null

  const point = status.point as CountdownBoundary
  const text = statusLine(status)
  if (text === null) return null

  return status.kind === 'since'
    ? { kind: 'since', point, minutes: status.minutes, text }
    : { kind: 'until', point, ms: status.ms, text }
}
