import { describe, expect, it } from 'vitest'

import type { WirdDefinition, WirdEntry, WirdVersion } from '@/types/wird'

import { dayAreaStats, dayCompletion, rangeCompletion, summarize } from '../logic'

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
