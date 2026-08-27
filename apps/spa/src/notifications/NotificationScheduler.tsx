import {
  ADHKAR_REMINDER_MINUTES,
  BEFORE_ADHAN_MINUTES,
  computeDayTimes,
  IQAMAH_OFFSET_MINUTES,
  MOMENT_LABELS,
  NOTIFICATION_COPY,
  notificationMoments,
  toDayId,
} from '@nabd/shared'
import { useEffect } from 'react'

import { logger } from '../logger'
import { COORDS_EVENT, readCachedCoords } from '../prayer-times/location'
import { METHOD_EVENT, readCalculationMethodId } from '../prayer-times/prayerMethod'

import { browserNotificationPermission, showBrowserNotification } from './browser'
import {
  notificationMomentMarker,
  NOTIFICATION_PREFS_EVENT,
  shouldDeliverMoment,
  staleMarkerKeys,
} from './logic'
import { readNotificationPrefs } from './preferences'

const REARM_INTERVAL_MS = 60_000

function hasFired(marker: string): boolean {
  try {
    return window.localStorage.getItem(marker) !== null
  } catch (error) {
    logger.warn('notifications.hasFired: unable to read delivery marker', { error })
    return false
  }
}

function markFired(marker: string): void {
  try {
    window.localStorage.setItem(marker, '1')
  } catch (error) {
    logger.warn('notifications.markFired: unable to write delivery marker', { error })
  }
}

function pruneStaleMarkers(today: string): void {
  try {
    const keys = Object.keys(window.localStorage)
    staleMarkerKeys(keys, today).forEach((key) => window.localStorage.removeItem(key))
  } catch (error) {
    logger.warn('notifications.pruneStaleMarkers: unable to clear old delivery markers', { error })
  }
}

// Mounted only inside AppShell. It re-plans from the wall clock after every visibility change and
// periodic tick, so background throttling, midnight and a changed clock never retain stale timers.
export function NotificationScheduler() {
  useEffect(() => {
    let timers: number[] = []

    const clearTimers = () => {
      timers.forEach((timer) => window.clearTimeout(timer))
      timers = []
    }

    const arm = () => {
      clearTimers()
      const prefs = readNotificationPrefs()
      const coords = readCachedCoords()
      if (!prefs.enabled || !coords || browserNotificationPermission() !== 'granted') return

      const now = Date.now()
      pruneStaleMarkers(toDayId(new Date(now)))
      const prayerTimes = computeDayTimes(coords, new Date(now), readCalculationMethodId())
      const moments = notificationMoments(
        prayerTimes,
        IQAMAH_OFFSET_MINUTES,
        prefs,
        BEFORE_ADHAN_MINUTES,
        ADHKAR_REMINDER_MINUTES,
        now,
      )

      timers = moments.map((moment) =>
        window.setTimeout(() => {
          const marker = notificationMomentMarker(moment)
          if (
            !shouldDeliverMoment({
              moment,
              now: Date.now(),
              visible: document.visibilityState === 'visible',
              alreadyFired: hasFired(marker),
            })
          ) {
            return
          }
          markFired(marker)
          const label = MOMENT_LABELS[moment.prayerId] ?? moment.prayerId
          const { title, body } = NOTIFICATION_COPY[moment.kind](label)
          showBrowserNotification(title, body)
        }, moment.at - now),
      )
    }

    const onVisibilityChange = () => arm()
    window.addEventListener('visibilitychange', onVisibilityChange)
    window.addEventListener(NOTIFICATION_PREFS_EVENT, arm)
    window.addEventListener(COORDS_EVENT, arm)
    window.addEventListener(METHOD_EVENT, arm)
    const interval = window.setInterval(arm, REARM_INTERVAL_MS)
    arm()

    return () => {
      clearTimers()
      window.clearInterval(interval)
      window.removeEventListener('visibilitychange', onVisibilityChange)
      window.removeEventListener(NOTIFICATION_PREFS_EVENT, arm)
      window.removeEventListener(COORDS_EVENT, arm)
      window.removeEventListener(METHOD_EVENT, arm)
    }
  }, [])

  return null
}
