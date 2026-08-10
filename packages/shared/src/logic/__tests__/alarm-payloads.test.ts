import { describe, expect, it } from 'vitest'

import { buildAlarmPayloads } from '../alarm-payloads'

const labels = { fajr: 'الفجر', dhuhr: 'الظهر', morning: 'أذكار الصباح' }
const copy = {
  before: (label: string) => ({ title: `before ${label}`, body: 'b' }),
  adhan: (label: string) => ({ title: `adhan ${label}`, body: 'a' }),
  iqamah: (label: string) => ({ title: `iqamah ${label}`, body: 'i' }),
  adhkar: (label: string) => ({ title: `adhkar ${label}`, body: 'd' }),
}

describe('buildAlarmPayloads', () => {
  it('uses the Fajr-specific channel and maps every moment kind', () => {
    const payloads = buildAlarmPayloads(
      [
        { at: 60_000, kind: 'adhan', prayerId: 'fajr' },
        { at: 120_000, kind: 'adhan', prayerId: 'dhuhr' },
        { at: 180_000, kind: 'before', prayerId: 'dhuhr' },
        { at: 240_000, kind: 'iqamah', prayerId: 'dhuhr' },
        { at: 300_000, kind: 'adhkar', prayerId: 'morning' },
      ],
      labels,
      copy,
    )

    expect(payloads.map(({ channelKey }) => channelKey)).toEqual([
      'adhanFajr',
      'adhan',
      'before',
      'iqamah',
      'adhkarReminder',
    ])
  })

  it('generates stable, distinct, signed-int32-safe ids', () => {
    const moments = [
      { at: 60_000, kind: 'before' as const, prayerId: 'dhuhr' },
      { at: 60_000, kind: 'adhan' as const, prayerId: 'dhuhr' },
      { at: 60_000, kind: 'iqamah' as const, prayerId: 'dhuhr' },
      { at: 60_000, kind: 'adhkar' as const, prayerId: 'morning' },
    ]
    const first = buildAlarmPayloads(moments, labels, copy)
    const second = buildAlarmPayloads(moments, labels, copy)

    expect(first.map(({ id }) => id)).toEqual(second.map(({ id }) => id))
    expect(new Set(first.map(({ id }) => id)).size).toBe(4)
    expect(first.every(({ id }) => id >= 0 && id < 2_000_000_000)).toBe(true)
  })
})
