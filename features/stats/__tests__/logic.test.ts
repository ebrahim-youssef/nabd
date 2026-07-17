import { describe, expect, it } from 'vitest'

import type { WirdDefinition, WirdEntry, WirdItem, WirdVersion } from '@/types/wird'

import {
  bestStreak,
  currentStreak,
  dayAreaStats,
  dayCompletion,
  itemStat,
  itemStats,
  rangeCompletion,
  summarize,
} from '../logic'

const smallDef: WirdDefinition = {
  areas: [
    { id: 'prayers', label: 'الصلوات', order: 0 },
    { id: 'quran', label: 'القرآن', order: 1 },
  ],
  items: [
    { id: 'fajr', areaId: 'prayers', label: 'الفجر', kind: 'checkbox' },
    { id: 'dhuhr', areaId: 'prayers', label: 'الظهر', kind: 'checkbox' },
    { id: 'wird', areaId: 'quran', label: 'الورد', kind: 'checkbox' },
  ],
}

// A larger later definition, to prove it does not affect earlier days.
const biggerDef: WirdDefinition = {
  areas: smallDef.areas,
  items: [...smallDef.items, { id: 'asr', areaId: 'prayers', label: 'العصر', kind: 'checkbox' }],
}

const v1: WirdVersion = {
  id: 'v1',
  effectiveFrom: '2026-07-01',
  definition: smallDef,
  createdAt: 1,
}

function entry(day: string, itemId: string, done: boolean, at: number): WirdEntry {
  return { id: `${day}-${itemId}-${at}`, day, versionId: 'v1', itemId, done, at }
}

const entries: WirdEntry[] = [
  entry('2026-07-05', 'fajr', true, 100),
  entry('2026-07-05', 'dhuhr', true, 100),
  // a mis-tap corrected: wird checked then unchecked
  entry('2026-07-05', 'wird', true, 100),
  entry('2026-07-05', 'wird', false, 200),
]

describe('dayCompletion', () => {
  it('counts done items against the version in force that day', () => {
    expect(dayCompletion([v1], entries, '2026-07-05')).toEqual({
      day: '2026-07-05',
      total: 3,
      done: 2,
    })
  })

  it('returns null when no version has taken effect yet', () => {
    expect(dayCompletion([v1], entries, '2026-06-30')).toBeNull()
  })
})

describe('dayAreaStats', () => {
  it('breaks completion down by area in display order', () => {
    expect(dayAreaStats([v1], entries, '2026-07-05')).toEqual([
      { areaId: 'prayers', label: 'الصلوات', total: 2, done: 2 },
      { areaId: 'quran', label: 'القرآن', total: 1, done: 0 },
    ])
  })
})

describe('history stability (ADR-0006 core property)', () => {
  it('a past day’s stats never change when a newer version is added', () => {
    const before = dayCompletion([v1], entries, '2026-07-05')

    // Add versions that take effect AFTER the day in question, in any order.
    const laterVersions: WirdVersion[] = [
      { id: 'v2', effectiveFrom: '2026-07-10', definition: biggerDef, createdAt: 2 },
      { id: 'v3', effectiveFrom: '2026-07-20', definition: smallDef, createdAt: 3 },
    ]
    for (let i = 0; i < laterVersions.length; i += 1) {
      const versions = [v1, ...laterVersions.slice(0, i + 1)]
      expect(dayCompletion(versions, entries, '2026-07-05')).toEqual(before)
    }
  })

  it('a day on or after a new version uses that new version', () => {
    const versions = [
      v1,
      { id: 'v2', effectiveFrom: '2026-07-10', definition: biggerDef, createdAt: 2 },
    ]
    // biggerDef has 4 items; none done on 2026-07-12.
    expect(dayCompletion(versions, entries, '2026-07-12')).toEqual({
      day: '2026-07-12',
      total: 4,
      done: 0,
    })
  })
})

describe('schedules & optional items (ADR-0008)', () => {
  const scheduledDef: WirdDefinition = {
    areas: [{ id: 'prayers', label: 'الصلوات', order: 0 }],
    items: [
      { id: 'fajr', areaId: 'prayers', label: 'الفجر', kind: 'checkbox' },
      { id: 'qiyam', areaId: 'prayers', label: 'قيام', kind: 'checkbox', optional: true },
      {
        id: 'fast-mon-thu',
        areaId: 'prayers',
        label: 'صيام الإثنين والخميس',
        kind: 'checkbox',
        // Monday(1) & Thursday(4).
        schedule: { type: 'weekdays', days: [1, 4] },
      },
    ],
  }
  const vs: WirdVersion[] = [
    { id: 'vs', effectiveFrom: '2026-07-01', definition: scheduledDef, createdAt: 1 },
  ]

  it('excludes optional items from a day’s totals', () => {
    // 2026-07-14 is a Tuesday: fast item unscheduled → only fajr counts.
    expect(dayCompletion(vs, [entry('2026-07-14', 'fajr', true, 10)], '2026-07-14')).toEqual({
      day: '2026-07-14',
      total: 1,
      done: 1,
    })
  })

  it('counts a weekdays item only on its scheduled days', () => {
    // 2026-07-13 is a Monday: fajr + fast are countable.
    expect(dayCompletion(vs, [], '2026-07-13')).toEqual({
      day: '2026-07-13',
      total: 2,
      done: 0,
    })
  })

  it('applies the same rules to per-area drill-down', () => {
    expect(dayAreaStats(vs, [], '2026-07-13')).toEqual([
      { areaId: 'prayers', label: 'الصلوات', total: 2, done: 0 },
    ])
    expect(dayAreaStats(vs, [], '2026-07-14')).toEqual([
      { areaId: 'prayers', label: 'الصلوات', total: 1, done: 0 },
    ])
  })
})

describe('streaks (NBD-31)', () => {
  const c = (day: string, done: number, total = 3) => ({ day, total, done })

  it('counts consecutive complete days ending at the last day', () => {
    expect(currentStreak([c('d1', 3), c('d2', 3), c('d3', 3)])).toBe(3)
    expect(currentStreak([c('d1', 3), c('d2', 0), c('d3', 3)])).toBe(1)
  })

  it('gives the in-progress last day grace instead of breaking the streak', () => {
    expect(currentStreak([c('d1', 3), c('d2', 3), c('d3', 1)])).toBe(2)
    // …but an earlier incomplete day does break it.
    expect(currentStreak([c('d1', 3), c('d2', 1), c('d3', 1)])).toBe(0)
  })

  it('is zero with no complete days and ignores empty totals', () => {
    expect(currentStreak([])).toBe(0)
    expect(currentStreak([c('d1', 0, 0)])).toBe(0)
  })

  it('finds the best run anywhere in the range', () => {
    expect(bestStreak([c('d1', 3), c('d2', 3), c('d3', 0), c('d4', 3)])).toBe(2)
    expect(bestStreak([])).toBe(0)
  })
})

describe('rangeCompletion + summarize', () => {
  it('skips days with no version and rolls up totals', () => {
    const completions = rangeCompletion([v1], entries, ['2026-06-30', '2026-07-05', '2026-07-06'])
    expect(completions.map((c) => c.day)).toEqual(['2026-07-05', '2026-07-06'])

    expect(summarize(completions)).toEqual({
      days: 2,
      total: 6, // 3 + 3
      done: 2, // 2 on the 5th, 0 on the 6th
      completedDays: 0,
    })
  })

  it('counts a fully-done day as completed', () => {
    const fullDay = [
      entry('2026-07-06', 'fajr', true, 10),
      entry('2026-07-06', 'dhuhr', true, 10),
      entry('2026-07-06', 'wird', true, 10),
    ]
    const completions = rangeCompletion([v1], fullDay, ['2026-07-06'])
    expect(summarize(completions).completedDays).toBe(1)
  })
})

describe('itemStat (per-item history, NBD-47)', () => {
  const areas = [{ id: 'a', label: 'أ', order: 0 }]
  const item = (id: string, extra: Partial<WirdItem> = {}): WirdItem => ({
    id,
    areaId: 'a',
    label: id,
    kind: 'checkbox',
    ...extra,
  })
  const ver = (id: string, effectiveFrom: string, items: WirdItem[]): WirdVersion => ({
    id,
    effectiveFrom,
    definition: { areas, items },
    createdAt: Number(effectiveFrom.replace(/-/g, '')),
  })

  it('computes consistency, streak, and misses over the due days', () => {
    const fajr = item('fajr')
    const versions = [ver('v1', '2026-07-01', [fajr])]
    const days = ['2026-07-01', '2026-07-02', '2026-07-03', '2026-07-04', '2026-07-05']
    const rows = [
      entry('2026-07-01', 'fajr', true, 1),
      entry('2026-07-02', 'fajr', true, 1),
      entry('2026-07-03', 'fajr', true, 1),
      // 2026-07-04 missed — no entry.
      entry('2026-07-05', 'fajr', true, 1),
    ]
    expect(itemStat(versions, rows, fajr, days, '2026-07-05')).toMatchObject({
      itemId: 'fajr',
      optional: false,
      activeDays: 5,
      doneDays: 4,
      missedDays: 1,
      currentStreak: 1,
      longestStreak: 3,
      currentMissStreak: 0,
      attainment: null,
    })
  })

  it('bridges an absence: dropping then re-adding an item never breaks its streak nor fabricates misses', () => {
    const asr = item('asr')
    const versions = [
      ver('v1', '2026-07-01', [asr]), // present
      ver('v2', '2026-07-03', []), // asr dropped (level down)
      ver('v3', '2026-07-05', [asr]), // asr re-added (same stable id)
    ]
    const days = [
      '2026-07-01',
      '2026-07-02',
      '2026-07-03',
      '2026-07-04',
      '2026-07-05',
      '2026-07-06',
    ]
    const rows = [
      entry('2026-07-01', 'asr', true, 1),
      entry('2026-07-02', 'asr', true, 1),
      // 07-03, 07-04: asr absent from the wird → N/A, not misses.
      entry('2026-07-05', 'asr', true, 1),
      entry('2026-07-06', 'asr', true, 1),
    ]
    expect(itemStat(versions, rows, asr, days, '2026-07-06')).toMatchObject({
      activeDays: 4, // only the 4 present days
      doneDays: 4,
      missedDays: 0, // the 2 absent days are not misses
      currentStreak: 4, // bridged across the gap
      longestStreak: 4,
    })
  })

  it('gives an unfinished today grace — not a miss, not a streak break', () => {
    const fajr = item('fajr')
    const versions = [ver('v1', '2026-07-01', [fajr])]
    const days = ['2026-07-01', '2026-07-02', '2026-07-03']
    const pending = [
      entry('2026-07-01', 'fajr', true, 1),
      entry('2026-07-02', 'fajr', true, 1),
      // today (2026-07-03) not done yet.
    ]
    expect(itemStat(versions, pending, fajr, days, '2026-07-03')).toMatchObject({
      activeDays: 2,
      doneDays: 2,
      missedDays: 0,
      currentStreak: 2,
      currentMissStreak: 0,
    })
    // Once today is done, it counts.
    const doneToday = [...pending, entry('2026-07-03', 'fajr', true, 2)]
    expect(itemStat(versions, doneToday, fajr, days, '2026-07-03')).toMatchObject({
      activeDays: 3,
      doneDays: 3,
      currentStreak: 3,
    })
  })

  it('reports attainment for a voluntary target-day deed, never a miss', () => {
    const fasting = item('fasting', { optional: true, targetDays: [1, 4] })
    const versions = [ver('v1', '2026-07-01', [fasting])]
    // Mon 13, Tue 14, Wed 15, Thu 16.
    const days = ['2026-07-13', '2026-07-14', '2026-07-15', '2026-07-16']
    const rows = [
      entry('2026-07-13', 'fasting', true, 1), // Monday (a target day) — hit
      entry('2026-07-15', 'fasting', true, 1), // Wednesday — off-target, still counts as done
    ]
    expect(itemStat(versions, rows, fasting, days, '2026-07-16')).toMatchObject({
      optional: true,
      doneDays: 2,
      missedDays: 0,
      currentMissStreak: 0,
      attainment: { done: 1, window: 2 }, // Mon hit; Thu (target) not done → 1 of 2
    })
  })

  it('itemStats maps over the given items', () => {
    const fajr = item('fajr')
    const versions = [ver('v1', '2026-07-01', [fajr])]
    const stats = itemStats(
      versions,
      [entry('2026-07-01', 'fajr', true, 1)],
      [fajr],
      ['2026-07-01'],
      '2026-07-01',
    )
    expect(stats).toHaveLength(1)
    expect(stats[0]).toMatchObject({ itemId: 'fajr', doneDays: 1, currentStreak: 1 })
  })
})
