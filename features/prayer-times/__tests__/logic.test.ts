import { describe, expect, it } from 'vitest'

import {
  AFTER_WINDOW_MS,
  formatDuration,
  notificationMoments,
  statusLine,
  timelineStatus,
} from '../logic'
import type { TimePoint } from '../types'

const MINUTE = 60_000
const HOUR = 60 * MINUTE

const points: TimePoint[] = [
  { id: 'fajr', label: 'الفجر', at: 4 * HOUR },
  { id: 'sunrise', label: 'الشروق', at: 7 * HOUR },
  { id: 'dhuhr', label: 'الظهر', at: 13 * HOUR },
]

describe('timelineStatus', () => {
  it('announces a point for the window after it', () => {
    const status = timelineStatus(points, 4 * HOUR + 10 * MINUTE)
    expect(status).toMatchObject({ kind: 'since', minutes: 10 })
    expect(status?.kind === 'since' && status.point.id).toBe('fajr')
  })

  it('switches to the next countdown once the window passes', () => {
    const status = timelineStatus(points, 4 * HOUR + AFTER_WINDOW_MS + MINUTE)
    expect(status).toMatchObject({ kind: 'until' })
    expect(status?.kind === 'until' && status.point.id).toBe('sunrise')
  })

  it('counts down to the first point before anything has struck', () => {
    const status = timelineStatus(points, 2 * HOUR)
    expect(status?.kind === 'until' && status.point.id).toBe('fajr')
  })

  it('treats the sunrise window like any other point', () => {
    const status = timelineStatus(points, 7 * HOUR + 5 * MINUTE)
    expect(status?.kind === 'since' && status.point.id).toBe('sunrise')
  })

  it('is null with nothing recent or upcoming', () => {
    expect(timelineStatus(points, 24 * HOUR)).toBeNull()
  })
})

describe('formatDuration', () => {
  it('formats minutes, hours, and mixes in Arabic-Indic', () => {
    expect(formatDuration(5 * MINUTE)).toBe('٥ دقيقة')
    expect(formatDuration(HOUR)).toBe('ساعة')
    expect(formatDuration(2 * HOUR)).toBe('ساعتين')
    expect(formatDuration(HOUR + 20 * MINUTE)).toBe('ساعة و٢٠ دقيقة')
    expect(formatDuration(3 * HOUR + MINUTE)).toBe('٣ ساعات و١ دقيقة')
  })

  it('never shows zero minutes', () => {
    expect(formatDuration(1000)).toBe('١ دقيقة')
  })
})

describe('notificationMoments (ADR-0009)', () => {
  const times = { fajr: 4 * HOUR, sunrise: 7 * HOUR, dhuhr: 13 * HOUR }
  const offsets = { fajr: 15, dhuhr: 15 }
  const allOn = { beforeAdhan: true, atAdhan: true, atIqamah: true }

  it('emits before/adhan/iqamah per prayer, sorted, sunrise excluded', () => {
    const moments = notificationMoments(times, offsets, allOn, 15, 0)
    expect(moments.map((m) => `${m.prayerId}:${m.kind}`)).toEqual([
      'fajr:before',
      'fajr:adhan',
      'fajr:iqamah',
      'dhuhr:before',
      'dhuhr:adhan',
      'dhuhr:iqamah',
    ])
    expect(moments[0].at).toBe(4 * HOUR - 15 * MINUTE)
    expect(moments[2].at).toBe(4 * HOUR + 15 * MINUTE)
  })

  it('honors the per-moment toggles', () => {
    const moments = notificationMoments(
      times,
      offsets,
      { beforeAdhan: false, atAdhan: true, atIqamah: false },
      15,
      0,
    )
    expect(moments.every((m) => m.kind === 'adhan')).toBe(true)
  })

  it('drops moments already in the past', () => {
    const moments = notificationMoments(times, offsets, allOn, 15, 5 * HOUR)
    expect(moments.every((m) => m.at > 5 * HOUR)).toBe(true)
    expect(moments.map((m) => m.prayerId)).toEqual(['dhuhr', 'dhuhr', 'dhuhr'])
  })
})

describe('statusLine', () => {
  it('says أذّن for prayers and الشروق for sunrise', () => {
    expect(statusLine({ kind: 'since', point: points[0], minutes: 12 })).toBe(
      'أذّن الفجر منذ ١٢ دقيقة',
    )
    expect(statusLine({ kind: 'since', point: points[1], minutes: 3 })).toBe('الشروق منذ ٣ دقيقة')
  })

  it('counts down to the next point', () => {
    expect(statusLine({ kind: 'until', point: points[2], ms: 45 * MINUTE })).toBe(
      'باقي ٤٥ دقيقة على الظهر',
    )
  })

  it('is null for a null status', () => {
    expect(statusLine(null)).toBeNull()
  })
})
