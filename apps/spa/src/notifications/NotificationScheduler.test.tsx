import { render } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import {
  ADHKAR_REMINDER_MINUTES,
  BEFORE_ADHAN_MINUTES,
  computeDayTimes,
  IQAMAH_OFFSET_MINUTES,
  notificationMoments,
} from '@nabd/shared'

import { DEFAULT_NOTIFICATION_PREFS } from './logic'
import { NotificationScheduler } from './NotificationScheduler'

const COORDS = { latitude: 30.0444, longitude: 31.2357 }
// Just after midnight in Cairo, so every one of the day's moments is still ahead of the clock, and
// deliberately on an exact minute. Prayer times land on whole minutes too, so this start puts every
// moment on a re-arm tick — the case where the re-arm used to clear a moment's timer just before it
// was due and then decline to plan it again, losing the reminder for good.
const START = Date.parse('2026-03-10T22:10:00.000Z')

let delivered: string[] = []

function stubNotification(permission: string) {
  const FakeNotification = function (this: unknown, title: string) {
    delivered.push(title)
  } as unknown as typeof Notification
  Object.assign(FakeNotification, { permission })
  vi.stubGlobal('Notification', FakeNotification)
}

function nextMomentAfter(now: number) {
  const times = computeDayTimes(COORDS, new Date(now), undefined)
  return notificationMoments(
    times,
    IQAMAH_OFFSET_MINUTES,
    // Only the per-moment half of the preferences; `enabled` is the scheduler's own gate.
    DEFAULT_NOTIFICATION_PREFS,
    BEFORE_ADHAN_MINUTES,
    ADHKAR_REMINDER_MINUTES,
    now,
  )[0]
}

beforeEach(() => {
  delivered = []
  localStorage.clear()
  vi.useFakeTimers()
  vi.setSystemTime(START)
  vi.stubGlobal('isSecureContext', true)
  stubNotification('granted')
  localStorage.setItem('nabd:coords', JSON.stringify(COORDS))
  localStorage.setItem(
    'nabd:notification-prefs',
    JSON.stringify({ ...DEFAULT_NOTIFICATION_PREFS, enabled: true }),
  )
})

afterEach(() => {
  vi.useRealTimers()
  vi.unstubAllGlobals()
})

describe('the scheduler arm cycle', () => {
  // The scheduler tears down and rebuilds every timer once a minute. That is what keeps a tab open
  // overnight honest, but it also means a moment is only ever delivered by a timer that survived
  // from one re-arm to the next. These assert the cycle itself, which the pure-logic tests around
  // shouldDeliverMoment cannot see.
  it('delivers a moment that is several re-arms away when it comes due', () => {
    const moment = nextMomentAfter(START)
    expect(moment.at - START).toBeGreaterThan(3 * 60_000)

    render(<NotificationScheduler />)
    expect(delivered).toEqual([])

    vi.advanceTimersByTime(moment.at - START + 1_000)
    expect(delivered).toHaveLength(1)
  })

  it('does not deliver the same moment twice however many times it re-arms', () => {
    const moment = nextMomentAfter(START)

    render(<NotificationScheduler />)
    vi.advanceTimersByTime(moment.at - START + 5 * 60_000)

    expect(delivered).toHaveLength(1)
  })

  it('stays silent while the permission is not granted', () => {
    stubNotification('denied')
    const moment = nextMomentAfter(START)

    render(<NotificationScheduler />)
    vi.advanceTimersByTime(moment.at - START + 1_000)

    expect(delivered).toEqual([])
  })
})
