import { render } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import {
  ADHKAR_REMINDER_MINUTES,
  BEFORE_ADHAN_MINUTES,
  computeDayTimes,
  IQAMAH_OFFSET_MINUTES,
  notificationMoments,
} from '@nabd/shared'

import { readCalculationMethodId } from '../prayer-times/prayerMethod'

import { DEFAULT_NOTIFICATION_PREFS } from './logic'
import { NotificationScheduler } from './NotificationScheduler'

const COORDS = { latitude: 30.0444, longitude: 31.2357 }
let delivered: string[] = []

function stubNotification(permission: string) {
  const FakeNotification = function (this: unknown, title: string) {
    delivered.push(title)
  } as unknown as typeof Notification
  Object.assign(FakeNotification, { permission })
  vi.stubGlobal('Notification', FakeNotification)
}

// The clock starts half past midnight on a fixed local date, and the plan is built from that same
// instant, so the day the scheduler derives from the device clock is always the day these moments
// come from. A fixed UTC instant would not do: computeDayTimes reads its day from local date parts,
// so one zone's late evening is the next day somewhere else, and the plan and the scheduler would
// then be working from different days.
//
// The start is on an exact minute, and prayer times land on exact minutes too, so every moment
// falls on a re-arm tick: the case where the re-arm cleared a moment's timer in the same
// millisecond it was due and then declined to plan it again, losing the reminder silently.
function planTheDay() {
  const start = new Date(2026, 2, 11, 0, 30, 0, 0).getTime()
  const times = computeDayTimes(COORDS, new Date(start), readCalculationMethodId())
  const moment = notificationMoments(
    times,
    IQAMAH_OFFSET_MINUTES,
    // Only the per-moment half of the preferences; `enabled` is the scheduler's own gate.
    DEFAULT_NOTIFICATION_PREFS,
    BEFORE_ADHAN_MINUTES,
    ADHKAR_REMINDER_MINUTES,
    start,
  )[0]
  // Cairo's day spans roughly fifteen hours, so some of it is always still ahead of half past
  // midnight wherever this runs. Said out loud so an empty plan reads as itself rather than as a
  // scheduler that delivered nothing.
  expect(moment).toBeDefined()
  return { start, moment }
}

beforeEach(() => {
  delivered = []
  localStorage.clear()
  vi.useFakeTimers()
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
    const { start, moment } = planTheDay()
    expect(moment.at - start).toBeGreaterThan(3 * 60_000)
    vi.setSystemTime(start)

    render(<NotificationScheduler />)
    expect(delivered).toEqual([])

    vi.advanceTimersByTime(moment.at - start + 1_000)
    expect(delivered).toHaveLength(1)
  })

  it('does not deliver the same moment twice however many times it re-arms', () => {
    const { start, moment } = planTheDay()
    vi.setSystemTime(start)

    render(<NotificationScheduler />)
    vi.advanceTimersByTime(moment.at - start + 5 * 60_000)

    expect(delivered).toHaveLength(1)
  })

  it('stays silent while the permission is not granted', () => {
    stubNotification('denied')
    const { start, moment } = planTheDay()
    vi.setSystemTime(start)

    render(<NotificationScheduler />)
    vi.advanceTimersByTime(moment.at - start + 1_000)

    expect(delivered).toEqual([])
  })
})
