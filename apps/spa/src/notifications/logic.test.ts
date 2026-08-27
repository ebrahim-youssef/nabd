import { describe, expect, it } from 'vitest'

import {
  DEFAULT_NOTIFICATION_PREFS,
  notificationMomentMarker,
  parseNotificationPrefs,
  shouldDeliverMoment,
  staleMarkerKeys,
} from './logic'

describe('notification preferences', () => {
  it('uses the parity defaults when storage is absent or not an object', () => {
    expect(parseNotificationPrefs(null)).toEqual(DEFAULT_NOTIFICATION_PREFS)
    expect(parseNotificationPrefs('nonsense')).toEqual(DEFAULT_NOTIFICATION_PREFS)
  })

  it('keeps the readable choices and defaults only the keys it cannot read', () => {
    // The shape we will have ourselves the first time a preference is added, so a missing or
    // wrong-typed key must not cost the user the choices stored either side of it.
    expect(parseNotificationPrefs({ enabled: true, atIqamah: 'yes' })).toEqual({
      ...DEFAULT_NOTIFICATION_PREFS,
      enabled: true,
    })
  })

  it('round-trips a complete valid preference record', () => {
    const prefs = { ...DEFAULT_NOTIFICATION_PREFS, enabled: true, atIqamah: false }

    expect(parseNotificationPrefs(prefs)).toEqual(prefs)
  })
})

describe('foreground delivery decisions', () => {
  const MOMENT = { at: 1_755_000_000_000, kind: 'iqamah' as const, prayerId: 'fajr' }
  const NOW = MOMENT.at

  it('creates a stable per-day, per-moment marker from the day it was planned for', () => {
    expect(notificationMomentMarker(MOMENT, '2025-08-12')).toBe(
      'nabd:notification-fired:2025-08-12:iqamah:fajr',
    )
  })

  it('keys the marker to the planning day even when the moment falls outside it', () => {
    // What a device whose clock sits far from its coordinates produces. The marker has to follow
    // the day the pruning keeps, or it is discarded from under a moment that already fired.
    expect(notificationMomentMarker(MOMENT, '2025-08-11')).toBe(
      'nabd:notification-fired:2025-08-11:iqamah:fajr',
    )
  })

  it('collects every marker except the ones belonging to today', () => {
    const keys = [
      'nabd:notification-fired:2025-08-11:adhan:fajr',
      'nabd:notification-fired:2025-08-12:adhan:fajr',
      'nabd:notification-fired:2025-08-12:iqamah:asr',
      'nabd:coords',
      'nabd:celebrated-day',
    ]

    expect(staleMarkerKeys(keys, '2025-08-12')).toEqual([
      'nabd:notification-fired:2025-08-11:adhan:fajr',
    ])
  })

  it('delivers a visible, due, unfired moment and rejects all other cases', () => {
    expect(
      shouldDeliverMoment({ moment: MOMENT, now: NOW, visible: true, alreadyFired: false }),
    ).toBe(true)
    expect(
      shouldDeliverMoment({ moment: MOMENT, now: NOW, visible: false, alreadyFired: false }),
    ).toBe(false)
    expect(
      shouldDeliverMoment({ moment: MOMENT, now: NOW - 1, visible: true, alreadyFired: false }),
    ).toBe(false)
    expect(
      shouldDeliverMoment({ moment: MOMENT, now: NOW, visible: true, alreadyFired: true }),
    ).toBe(false)
  })
})
