import { describe, expect, it } from 'vitest'

import { WIRD_LEVELS } from '@/content/levels'
import type { WirdDefinition, WirdEntry, WirdVersion } from '@/types/wird'

import {
  buildChecklist,
  latestStateByItem,
  levelMatching,
  sameDefinition,
  summarizeChecklist,
  versionInForce,
} from '../logic'

// 2026-07-14 is a Tuesday (weekday 2).
const DAY = '2026-07-14'

const definition: WirdDefinition = {
  // Intentionally out of display order to prove buildChecklist sorts by `order`.
  areas: [
    { id: 'quran', label: 'القرآن', order: 1 },
    { id: 'prayers', label: 'الصلوات', order: 0 },
  ],
  items: [
    { id: 'fajr', areaId: 'prayers', label: 'الفجر', kind: 'checkbox' },
    { id: 'wird', areaId: 'quran', label: 'الورد', kind: 'checkbox' },
  ],
}

function version(id: string, effectiveFrom: string, createdAt: number): WirdVersion {
  return { id, effectiveFrom, definition, createdAt }
}

function entry(itemId: string, done: boolean, at: number, day = DAY): WirdEntry {
  return { id: `${itemId}-${at}-${day}`, day, versionId: 'v', itemId, done, at }
}

describe('versionInForce', () => {
  const v1 = version('v1', '2026-01-01', 1)
  const v2 = version('v2', '2026-02-01', 2)

  it('picks the greatest effectiveFrom that is ≤ the day', () => {
    expect(versionInForce([v1, v2], '2026-01-15')?.id).toBe('v1')
    expect(versionInForce([v1, v2], '2026-02-01')?.id).toBe('v2')
    expect(versionInForce([v1, v2], '2026-03-10')?.id).toBe('v2')
  })

  it('returns null when no version has taken effect yet', () => {
    expect(versionInForce([v1, v2], '2025-12-31')).toBeNull()
    expect(versionInForce([], '2026-01-01')).toBeNull()
  })

  it('breaks a same-day tie by the later createdAt', () => {
    const early = version('early', '2026-05-01', 10)
    const late = version('late', '2026-05-01', 20)
    expect(versionInForce([early, late], '2026-05-01')?.id).toBe('late')
    expect(versionInForce([late, early], '2026-05-01')?.id).toBe('late')
  })
})

describe('latestStateByItem', () => {
  it('takes the latest event per item by `at`', () => {
    const state = latestStateByItem([
      entry('fajr', true, 100),
      entry('fajr', false, 200), // uncheck wins (later)
      entry('wird', true, 50),
    ])
    expect(state.get('fajr')).toBe(false)
    expect(state.get('wird')).toBe(true)
    expect(state.has('asr')).toBe(false)
  })

  it('is order-independent', () => {
    const state = latestStateByItem([entry('fajr', false, 200), entry('fajr', true, 100)])
    expect(state.get('fajr')).toBe(false)
  })
})

describe('buildChecklist', () => {
  it('groups items by area in ascending order with resolved done state', () => {
    const view = buildChecklist(definition, [entry('fajr', true, 100)], DAY)
    expect(view.map((area) => area.id)).toEqual(['prayers', 'quran'])
    expect(view[0].items[0]).toMatchObject({ id: 'fajr', done: true })
    expect(view[1].items[0]).toMatchObject({ id: 'wird', done: false })
  })
})

describe('buildChecklist — schedules (ADR-0008)', () => {
  const scheduled: WirdDefinition = {
    areas: [{ id: 'tatawwu', label: 'التطوّع', order: 0 }],
    items: [
      // Monday(1) & Thursday(4) only.
      {
        id: 'fast-mon-thu',
        areaId: 'tatawwu',
        label: 'صيام الإثنين والخميس',
        kind: 'checkbox',
        optional: true,
        schedule: { type: 'weekdays', days: [1, 4] },
      },
      {
        id: 'fast-monthly',
        areaId: 'tatawwu',
        label: 'صيام ٣ أيام',
        kind: 'checkbox',
        optional: true,
        schedule: { type: 'monthly-goal', target: 3 },
      },
      {
        id: 'qiyam',
        areaId: 'tatawwu',
        label: 'قيام الليل',
        kind: 'checkbox',
        optional: true,
        minimum: '٣ ركعات على الأقل',
      },
    ],
  }

  it('hides a weekdays item off its days and shows it on them', () => {
    // 2026-07-14 = Tuesday → hidden; 2026-07-13 = Monday → visible.
    const tuesday = buildChecklist(scheduled, [], '2026-07-14')
    expect(tuesday[0].items.map((i) => i.id)).not.toContain('fast-mon-thu')
    const monday = buildChecklist(scheduled, [], '2026-07-13')
    expect(monday[0].items.map((i) => i.id)).toContain('fast-mon-thu')
  })

  it('computes monthly-goal progress from the month entries, latest-per-day wins', () => {
    const monthEntries = [
      entry('fast-monthly', true, 100, '2026-07-01'),
      entry('fast-monthly', true, 100, '2026-07-05'),
      entry('fast-monthly', false, 200, '2026-07-05'), // unchecked later — does not count
      entry('fast-monthly', true, 100, '2026-06-30'), // previous month — out of window
    ]
    const view = buildChecklist(scheduled, [], DAY, monthEntries)
    const item = view[0].items.find((i) => i.id === 'fast-monthly')
    expect(item?.monthlyProgress).toEqual({ done: 1, target: 3 })
  })

  it('carries optional and minimum through to the view', () => {
    const view = buildChecklist(scheduled, [], DAY)
    const qiyam = view[0].items.find((i) => i.id === 'qiyam')
    expect(qiyam).toMatchObject({ optional: true, minimum: '٣ ركعات على الأقل' })
  })
})

describe('summarizeChecklist', () => {
  it('counts done and remaining across all areas', () => {
    const view = buildChecklist(definition, [entry('fajr', true, 100)], DAY)
    expect(summarizeChecklist(view)).toEqual({
      total: 2,
      done: 1,
      remaining: 1,
      voluntary: { total: 0, done: 0 },
    })
  })

  it('tallies optional items separately — they never lower required completion', () => {
    const mixed: WirdDefinition = {
      areas: [{ id: 'a', label: 'أ', order: 0 }],
      items: [
        { id: 'req', areaId: 'a', label: 'فرض', kind: 'checkbox' },
        { id: 'vol', areaId: 'a', label: 'تطوّع', kind: 'checkbox', optional: true },
      ],
    }
    const view = buildChecklist(mixed, [entry('req', true, 100)], DAY)
    expect(summarizeChecklist(view)).toEqual({
      total: 1,
      done: 1,
      remaining: 0,
      voluntary: { total: 1, done: 0 },
    })
  })
})

describe('levelMatching + sameDefinition (NBD-40 self-upgrade)', () => {
  it('detects the seeding level by its unique counter target', () => {
    for (const level of WIRD_LEVELS) {
      expect(levelMatching(level.wird, WIRD_LEVELS)?.id).toBe(level.id)
    }
  })

  it('returns null for a definition without counters', () => {
    expect(levelMatching(definition, WIRD_LEVELS)).toBeNull()
  })

  it('sameDefinition distinguishes an old snapshot from the current level', () => {
    const level2 = WIRD_LEVELS.find((level) => level.id === 'level-2')!
    const oldSnapshot: WirdDefinition = {
      areas: level2.wird.areas,
      // The pre-NBD-40 shape: one combined rawatib item instead of the per-prayer sequence.
      items: [
        ...level2.wird.items.filter((item) => item.areaId !== 'prayers'),
        { id: 'rawatib', areaId: 'prayers', label: 'السنن الرواتب', kind: 'checkbox' },
      ],
    }
    expect(sameDefinition(level2.wird, level2.wird)).toBe(true)
    expect(sameDefinition(oldSnapshot, level2.wird)).toBe(false)
    // The old snapshot still resolves to level 2 (same counter target) — that pairing is
    // exactly what triggers the upgrade.
    expect(levelMatching(oldSnapshot, WIRD_LEVELS)?.id).toBe('level-2')
  })
})

describe('levels content (NBD-40): the prayers area follows performance order', () => {
  it.each(['level-2', 'level-3'] as const)('%s interleaves rawatib and adhkar', (levelId) => {
    const level = WIRD_LEVELS.find((entry) => entry.id === levelId)!
    const prayerIds = level.wird.items
      .filter((item) => item.areaId === 'prayers')
      .map((item) => item.id)
    const expected = [
      'rawatib-fajr-before',
      'fajr',
      'prayer-adhkar-fajr',
      'rawatib-dhuhr-before',
      'dhuhr',
      'prayer-adhkar-dhuhr',
      'rawatib-dhuhr-after',
      'asr',
      'prayer-adhkar-asr',
      'maghrib',
      'prayer-adhkar-maghrib',
      'rawatib-maghrib-after',
      'isha',
      'prayer-adhkar-isha',
      'rawatib-isha-after',
    ]
    expect(prayerIds.slice(0, expected.length)).toEqual(expected)
  })

  it('level 1 keeps the plain five prayers', () => {
    const level1 = WIRD_LEVELS.find((level) => level.id === 'level-1')!
    const prayerIds = level1.wird.items
      .filter((item) => item.areaId === 'prayers')
      .map((item) => item.id)
    expect(prayerIds).toEqual(['fajr', 'dhuhr', 'asr', 'maghrib', 'isha'])
  })
})
