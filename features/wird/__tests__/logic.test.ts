import { describe, expect, it } from 'vitest'

import type { WirdDefinition, WirdEntry, WirdVersion } from '@/types/wird'

import { buildChecklist, latestStateByItem, versionInForce } from '../logic'

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

function entry(itemId: string, done: boolean, at: number): WirdEntry {
  return { id: `${itemId}-${at}`, day: '2026-07-14', versionId: 'v', itemId, done, at }
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
    const view = buildChecklist(definition, [entry('fajr', true, 100)])
    expect(view.map((area) => area.id)).toEqual(['prayers', 'quran'])
    expect(view[0].items[0]).toMatchObject({ id: 'fajr', done: true })
    expect(view[1].items[0]).toMatchObject({ id: 'wird', done: false })
  })
})
