import { describe, expect, it } from 'vitest'

import {
  AFTER_WINDOW_MS,
  buildAlarmPayloads,
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

describe('notificationMoments (ADR-0009 + NBD-61)', () => {
  const times = { fajr: 4 * HOUR, sunrise: 7 * HOUR, dhuhr: 13 * HOUR }
  const timesFull = { ...times, asr: 16 * HOUR }
  const offsets = { fajr: 15, dhuhr: 15 }
  const offsetsFull = { ...offsets, asr: 15 }
  const allOn = {
    beforeAdhan: true,
    atAdhan: true,
    atIqamah: true,
    morningAdhkar: false,
    eveningAdhkar: false,
  }
  const ADHKAR = 30

  it('emits before/adhan/iqamah per prayer, sorted, sunrise excluded', () => {
    const moments = notificationMoments(times, offsets, allOn, 15, 0, 0)
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
      {
        beforeAdhan: false,
        atAdhan: true,
        atIqamah: false,
        morningAdhkar: false,
        eveningAdhkar: false,
      },
      15,
      0,
      0,
    )
    expect(moments.every((m) => m.kind === 'adhan')).toBe(true)
  })

  it('drops moments already in the past', () => {
    const moments = notificationMoments(times, offsets, allOn, 15, 0, 5 * HOUR)
    expect(moments.every((m) => m.at > 5 * HOUR)).toBe(true)
    expect(moments.map((m) => m.prayerId)).toEqual(['dhuhr', 'dhuhr', 'dhuhr'])
  })

  it('emits adhkar moments when morningAdhkar/eveningAdhkar are on', () => {
    const moments = notificationMoments(
      timesFull,
      offsetsFull,
      {
        beforeAdhan: false,
        atAdhan: false,
        atIqamah: false,
        morningAdhkar: true,
        eveningAdhkar: true,
      },
      ADHKAR,
      ADHKAR,
      0,
    )
    expect(moments).toHaveLength(2)
    expect(moments[0].kind).toBe('adhkar')
    expect(moments[0].prayerId).toBe('morning')
    expect(moments[0].at).toBe(4 * HOUR + (15 + ADHKAR) * MINUTE)
    expect(moments[1].kind).toBe('adhkar')
    expect(moments[1].prayerId).toBe('evening')
    expect(moments[1].at).toBe(16 * HOUR + (15 + ADHKAR) * MINUTE)
  })

  it('omits adhkar moments when toggled off', () => {
    const moments = notificationMoments(
      timesFull,
      offsetsFull,
      {
        beforeAdhan: false,
        atAdhan: false,
        atIqamah: false,
        morningAdhkar: false,
        eveningAdhkar: false,
      },
      ADHKAR,
      ADHKAR,
      0,
    )
    expect(moments.some((m) => m.kind === 'adhkar')).toBe(false)
  })

  it('filters past adhkar moments', () => {
    const moments = notificationMoments(
      timesFull,
      offsetsFull,
      {
        beforeAdhan: false,
        atAdhan: false,
        atIqamah: false,
        morningAdhkar: true,
        eveningAdhkar: true,
      },
      ADHKAR,
      ADHKAR,
      4 * HOUR + (15 + ADHKAR + 1) * MINUTE,
    )
    expect(moments).toHaveLength(1)
    expect(moments[0].prayerId).toBe('evening')
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

describe('buildAlarmPayloads (NBD-46 + NBD-61)', () => {
  const labels = { fajr: 'الفجر', dhuhr: 'الظهر' }
  const copy = {
    before: (label: string) => ({ title: `اقترب وقت ${label}`, body: 'b' }),
    adhan: (label: string) => ({ title: `حان وقت ${label}`, body: 'a' }),
    iqamah: (label: string) => ({ title: `إقامة ${label}`, body: 'i' }),
    adhkar: (label: string) => ({ title: `تذكير ${label}`, body: '' }),
  }

  it('maps moments to channel keys — fajr adhan gets its own channel', () => {
    const payloads = buildAlarmPayloads(
      [
        { at: 60_000, kind: 'adhan', prayerId: 'fajr' },
        { at: 120_000, kind: 'adhan', prayerId: 'dhuhr' },
        { at: 180_000, kind: 'before', prayerId: 'dhuhr' },
        { at: 240_000, kind: 'iqamah', prayerId: 'dhuhr' },
      ],
      labels,
      copy,
    )
    expect(payloads.map((p) => p.channelKey)).toEqual(['adhanFajr', 'adhan', 'before', 'iqamah'])
    expect(payloads[0].title).toBe('حان وقت الفجر')
  })

  it('ids are stable and collision-free across kinds in the same minute', () => {
    const sameMinute = buildAlarmPayloads(
      [
        { at: 60_000, kind: 'before', prayerId: 'dhuhr' },
        { at: 60_000, kind: 'adhan', prayerId: 'dhuhr' },
        { at: 60_000, kind: 'iqamah', prayerId: 'dhuhr' },
      ],
      labels,
      copy,
    )
    const ids = sameMinute.map((p) => p.id)
    expect(new Set(ids).size).toBe(3)
    // Stable: same input, same ids.
    const again = buildAlarmPayloads(
      [{ at: 60_000, kind: 'before', prayerId: 'dhuhr' }],
      labels,
      copy,
    )
    expect(again[0].id).toBe(sameMinute[0].id)
  })

  it('adhkar moment gets adhkarReminder channel and the correct label', () => {
    const labelsWithAdhkar = { ...labels, morning: 'أذكار الصباح', evening: 'أذكار المساء' }
    const copyWithAdhkar = {
      ...copy,
      adhkar: (label: string) => ({
        title: `تذكير ${label}`,
        body: `حان وقت ${label} — لا تنسَ وِردك.`,
      }),
    }
    const payloads = buildAlarmPayloads(
      [
        { at: 300_000, kind: 'adhkar', prayerId: 'morning' },
        { at: 360_000, kind: 'adhkar', prayerId: 'evening' },
      ],
      labelsWithAdhkar,
      copyWithAdhkar,
    )
    expect(payloads.map((p) => p.channelKey)).toEqual(['adhkarReminder', 'adhkarReminder'])
    expect(payloads[0].title).toBe('تذكير أذكار الصباح')
    expect(payloads[1].title).toBe('تذكير أذكار المساء')
  })

  it('adhkar id uses slot 3 and is distinct from other kinds at same minute', () => {
    const labelsWith = { ...labels, morning: 'أذكار الصباح' }
    const copyWith = {
      ...copy,
      adhkar: (label: string) => ({ title: `تذكير ${label}`, body: '' }),
    }
    const payloads = buildAlarmPayloads(
      [
        { at: 60_000, kind: 'before', prayerId: 'dhuhr' },
        { at: 60_000, kind: 'adhkar', prayerId: 'morning' },
      ],
      labelsWith,
      copyWith,
    )
    const ids = payloads.map((p) => p.id)
    expect(new Set(ids).size).toBe(2)
    // Slot 3 means the adhkar id ≡ 3 (mod 4), before is 0
    expect(ids[0]! % 4).toBe(0)
    expect(ids[1]! % 4).toBe(3)
  })
})
