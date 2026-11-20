import { previousDay } from '../../lib/day'
import { isScheduledOn } from '../../lib/wird'
import { computeDayTimes } from '../../prayer-times/logic'
import { WIRD_LEVELS } from '../../content/levels'
import { ADHKAR_LIBRARY } from '../../content/adhkar'
import { DAILY_ADHKAR_CATEGORY } from '../../content/daily-adhkar'
import { INTENTIONS_LIBRARY } from '../../content/intentions'
import { buildDayPlan, dailyLines, isUsableDayTimes, nightTimings, resolveWirdDay } from '../logic'
import { GENERAL_ADHKAR } from '../../content/general-adhkar'
import type { DayPrayerTimes } from '../../prayer-times/logic'
import type { DayId, WirdDefinition, WirdEntry } from '../../wird/types'

const HOUR = 3_600_000
const DAY: DayId = '2026-06-10'
const FAJR = Date.parse('2026-06-10T04:00:00+03:00')
const times: DayPrayerTimes = {
  fajr: FAJR,
  sunrise: Date.parse('2026-06-10T05:30:00+03:00'),
  dhuhr: Date.parse('2026-06-10T12:00:00+03:00'),
  asr: Date.parse('2026-06-10T15:30:00+03:00'),
  maghrib: Date.parse('2026-06-10T18:30:00+03:00'),
  isha: Date.parse('2026-06-10T20:00:00+03:00'),
}
const nextFajr = Date.parse('2026-06-11T04:00:00+03:00')

function entry(itemId: string, done: boolean, day = DAY): WirdEntry {
  return { id: `${itemId}-${done}`, day, versionId: 'v1', itemId, done, at: FAJR }
}

describe('resolveWirdDay', () => {
  it('uses Fajr as a half-open boundary and falls back to local midnight for unusable times', () => {
    expect(resolveWirdDay(FAJR - 1, times)).toBe(previousDay(DAY))
    expect(resolveWirdDay(FAJR, times)).toBe(DAY)
    expect(resolveWirdDay(FAJR + 1, times)).toBe(DAY)
    expect(resolveWirdDay(Date.parse('2026-06-10T00:30:00+03:00'), times)).toBe(previousDay(DAY))
    expect(resolveWirdDay(FAJR, null)).toBe(DAY)
    expect(resolveWirdDay(FAJR, { ...times, fajr: Number.NaN })).toBe(DAY)
  })

  it('validates finite, strictly ordered prayer times', () => {
    expect(isUsableDayTimes(times)).toBe(true)
    expect(isUsableDayTimes({ ...times, isha: times.maghrib })).toBe(false)
    expect(isUsableDayTimes({ ...times, sunrise: Number.POSITIVE_INFINITY })).toBe(false)
  })

  it('steps calendar dates across daylight saving transitions', () => {
    const previousTimezone = process.env.TZ
    process.env.TZ = 'Europe/Berlin'
    const beforeDst = Date.parse('2026-03-29T00:30:00+01:00')
    const marchTimes = { ...times, fajr: Date.parse('2026-03-29T05:00:00+02:00') }
    expect(resolveWirdDay(beforeDst, marchTimes)).toBe('2026-03-28')
    expect(previousDay('2026-03-29')).toBe('2026-03-28')
    process.env.TZ = previousTimezone
  })
})

describe('nightTimings', () => {
  it('uses actual next-day Fajr and rounds to whole milliseconds', () => {
    expect(nightTimings(times.maghrib, nextFajr)).toEqual({
      middleOfNight: times.maghrib + 4.75 * HOUR,
      lastThird: times.maghrib + (2 * (9.5 * HOUR)) / 3,
    })
    const dstMaghrib = Date.parse('2026-03-29T19:00:00+02:00')
    const dstNextFajr = Date.parse('2026-03-30T06:00:00+02:00')
    expect(nightTimings(dstMaghrib, dstNextFajr).middleOfNight).toBe(dstMaghrib + 5.5 * HOUR)
  })
})

describe('buildDayPlan', () => {
  const level = WIRD_LEVELS.find(({ id }) => id === 'level-3')!
  const definition: WirdDefinition = {
    ...level.wird,
    items: [
      ...level.wird.items,
      { id: 'ghair-rawatib-fajr', areaId: 'prayers', label: 'غير راتبة', kind: 'checkbox' },
      {
        id: 'weekday-only',
        areaId: 'quran',
        label: 'أسبوعي',
        kind: 'checkbox',
        schedule: { type: 'weekdays', days: [0] },
      },
      { id: 'future-item', areaId: 'quran', label: 'مستقبل', kind: 'checkbox' },
    ],
  }

  it('places all level items, orders prayer blocks, and applies Friday copy', () => {
    const friday = '2026-06-12' as DayId
    const plan = buildDayPlan({
      now: times.dhuhr,
      day: friday,
      times,
      nextFajr,
      definition,
      entries: [],
    })
    expect(plan.blocks).toHaveLength(5)
    expect(plan.blocks.find(({ id }) => id === 'dhuhr')?.label).toBe('الجمعة / الظهر')
    expect(plan.blocks.find(({ id }) => id === 'fajr')?.items[0].id).toBe('ghair-rawatib-fajr')
    const listed = [
      ...plan.blocks.flatMap(({ items }) => items),
      ...plan.timedActs.flatMap(({ items }) => items),
      ...plan.anyTime,
      ...plan.monthly.map(({ item }) => item),
    ]
    const scheduledCount = definition.items.filter((item) => isScheduledOn(item, friday)).length
    expect(new Set(listed.map(({ id }) => id)).size).toBe(scheduledCount)
  })

  it('uses half-open windows, skips the sunrise gap, and schedules timed acts', () => {
    const at = (now: number) =>
      buildDayPlan({ now, day: DAY, times, nextFajr, definition, entries: [] })
    expect(at(times.fajr).currentBlock?.id).toBe('fajr')
    expect(at(times.sunrise).currentBlock).toBeNull()
    expect(at(times.sunrise).nextBlock?.id).toBe('dhuhr')
    expect(at(times.dhuhr).currentBlock?.id).toBe('dhuhr')
    expect(at(times.asr).currentBlock?.id).toBe('asr')
    expect(at(times.maghrib).currentBlock?.id).toBe('maghrib')
    expect(at(times.isha).currentBlock?.id).toBe('isha')
    expect(at(times.fajr).openTimedActs.map(({ id }) => id)).toContain('morning-adhkar')
    expect(at(times.asr).openTimedActs.map(({ id }) => id)).toContain('evening-adhkar')
    expect(at(times.isha).openTimedActs.map(({ id }) => id)).toContain('qiyam')
    const windows = [
      [times.fajr, times.sunrise, 'fajr'],
      [times.dhuhr, times.asr, 'dhuhr'],
      [times.asr, times.maghrib, 'asr'],
      [times.maghrib, times.isha, 'maghrib'],
      [times.isha, nextFajr, 'isha'],
    ] as const
    for (const [start, end, id] of windows) {
      expect(at(start).currentBlock?.id).toBe(id)
      expect(at(end).currentBlock?.id).not.toBe(id)
    }
    const timedWindows = [
      [times.fajr, times.asr, 'morning-adhkar'],
      [times.asr, nextFajr, 'evening-adhkar'],
      [times.isha, nextFajr, 'qiyam'],
      [times.sunrise + 15 * 60_000, times.dhuhr - 10 * 60_000, 'duha'],
    ] as const
    for (const [start, end, id] of timedWindows) {
      expect(at(start).openTimedActs.map(({ id: actId }) => actId)).toContain(id)
      expect(at(end).openTimedActs.map(({ id: actId }) => actId)).not.toContain(id)
    }
  })

  it('calculates duha, morning, evening, qiyam, unrecorded, and required progress', () => {
    const morning = buildDayPlan({
      now: times.asr,
      day: DAY,
      times,
      nextFajr,
      definition,
      entries: [
        entry('fajr', false),
        entry('morning-adhkar', false),
        entry('quran-juz', true),
        entry('qiyam', false),
        entry('fasting', false),
      ],
    })
    expect(morning.timedActs.find(({ id }) => id === 'duha')?.window).toEqual({
      start: times.sunrise + 15 * 60_000,
      end: times.dhuhr - 10 * 60_000,
    })
    expect(morning.unrecorded.map(({ id }) => id)).toContain('fajr')
    expect(morning.unrecorded.map(({ id }) => id)).toContain('morning-adhkar')
    expect(morning.unrecorded.map(({ id }) => id)).not.toContain('quran-juz')
    expect(morning.unrecorded.map(({ id }) => id)).not.toContain('qiyam')
    expect(morning.unrecorded.map(({ id }) => id)).not.toContain('fasting')
    expect(morning.progress.done).toBe(1)
    expect(morning.anyTimeProgress.done).toBe(1)
    expect(morning.progress.required).toBe(
      definition.items.filter(
        ({ id, optional, schedule }) =>
          id !== 'weekday-only' && !optional && schedule?.type !== 'monthly-goal',
      ).length,
    )
  })

  it('uses latest monthly states once per calendar day', () => {
    const priorDay = '2026-06-08' as DayId
    const monthlyEntries = [
      entry('fasting', true, priorDay),
      { ...entry('fasting', false, priorDay), at: FAJR + 1 },
      entry('fasting', true, '2026-06-09'),
    ]
    const monthlyDefinition = WIRD_LEVELS.find(({ id }) => id === 'level-1')!.wird
    const plan = buildDayPlan({
      now: FAJR,
      day: DAY,
      times,
      nextFajr,
      definition: monthlyDefinition,
      entries: [],
      monthEntries: monthlyEntries,
    })
    expect(plan.monthly.find(({ item }) => item.id === 'fasting')).toMatchObject({
      progress: { done: 1, target: 3 },
    })
  })

  it('returns a no-times plan and hides items on unscheduled weekdays', () => {
    const plan = buildDayPlan({
      now: FAJR,
      day: '2026-06-10',
      times: null,
      nextFajr: null,
      definition,
      entries: [entry('fajr', true)],
    })
    expect(plan.hasTimes).toBe(false)
    expect(plan.header).toBeNull()
    expect(plan.blocks.every(({ isCurrent }) => !isCurrent)).toBe(true)
    const blockIds = plan.blocks.flatMap(({ items }) => items).map(({ id }) => id)
    expect(blockIds).not.toContain('weekday-only')
    const sunday = buildDayPlan({
      now: FAJR,
      day: '2026-06-14',
      times: null,
      nextFajr: null,
      definition,
      entries: [],
    })
    expect(sunday.anyTime.map(({ id }) => id)).toContain('weekday-only')
    const invalid = buildDayPlan({
      now: FAJR,
      day: DAY,
      times: { ...times, fajr: Number.NaN },
      nextFajr,
      definition,
      entries: [],
    })
    expect(invalid.hasTimes).toBe(false)
  })

  it('builds both lower and higher level definitions without losing items', () => {
    for (const id of ['level-1', 'level-3']) {
      const { wird } = WIRD_LEVELS.find((candidate) => candidate.id === id)!
      const plan = buildDayPlan({
        now: FAJR + HOUR,
        day: DAY,
        times,
        nextFajr,
        definition: wird,
        entries: [],
      })
      const placed = [
        ...plan.blocks.flatMap(({ items }) => items),
        ...plan.timedActs.flatMap(({ items }) => items),
        ...plan.anyTime,
        ...plan.monthly.map(({ item }) => item),
      ]
      expect(new Set(placed.map(({ id }) => id)).size).toBe(wird.items.length)
    }
  })

  it('builds real prayer times for a fixed location', () => {
    const realTimes = computeDayTimes(
      { latitude: 30.0444, longitude: 31.2357 },
      new Date('2026-06-10T12:00:00+03:00'),
    )
    expect(isUsableDayTimes(realTimes)).toBe(true)
  })

  it('selects day and night header paths with strict next events and clamped positions', () => {
    const at = (now: number) =>
      buildDayPlan({ now, day: DAY, times, nextFajr, definition, entries: [] })
    expect(at(times.fajr).header).toMatchObject({
      mode: 'day',
      position: 0,
      nextEvent: { id: 'sunrise' },
    })
    expect(at(times.maghrib).header).toMatchObject({
      mode: 'night',
      position: 0,
      nextEvent: { id: 'isha' },
    })
    const night = at(times.isha + 1)
    expect(night.header?.markers.map(({ id }) => id)).toEqual([
      'maghrib',
      'isha',
      'middleOfNight',
      'lastThird',
      'fajr',
    ])
    expect(night.header?.nextEvent?.id).toBe('middleOfNight')
    const nightTiming = nightTimings(times.maghrib, nextFajr)
    expect(at(nightTiming.middleOfNight).header?.nextEvent?.id).toBe('lastThird')
    expect(at(nightTiming.lastThird).header?.nextEvent?.id).toBe('fajr')
    expect(at(nextFajr).header).toMatchObject({ mode: 'night', position: 1, nextEvent: null })
  })
})

describe('dailyLines and general adhkar sources', () => {
  it('is deterministic per UTC day and changes on consecutive days', () => {
    expect(dailyLines(DAY)).toEqual(dailyLines(DAY))
    expect(dailyLines(DAY)).not.toEqual(dailyLines('2026-06-11'))
    const intentions = INTENTIONS_LIBRARY.flatMap(({ deed, intentions }) =>
      intentions.map(({ text }) => ({ deed, text })),
    )
    expect(intentions).toContainEqual(dailyLines(DAY).intention)
  })

  it('keeps every daily line dhikr equal to its source', () => {
    const categories = [...ADHKAR_LIBRARY, DAILY_ADHKAR_CATEGORY]
    expect(GENERAL_ADHKAR.length).toBeGreaterThanOrEqual(8)
    expect(GENERAL_ADHKAR.length).toBeLessThanOrEqual(25)
    for (const item of GENERAL_ADHKAR) {
      const [categoryId, dhikrId] = item.sourceRef.split('/')
      const source = categories
        .find(({ id }) => id === categoryId)
        ?.items.find(({ id }) => id === dhikrId)
      expect(item.text).toBe(source?.text)
      expect(item.text.length).toBeLessThanOrEqual(200)
      expect(item.text).not.toMatch(/أصبحنا|أمسينا|الصباح|المساء|نام|باسمك اللهم أموت/)
    }
  })
})
