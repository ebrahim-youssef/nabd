'use client'

import { useEffect } from 'react'

import { readCachedCoords } from '@/lib/impure/location'
import { isNativePlatform } from '@/lib/impure/native'
import {
  notificationPermission,
  playMomentSound,
  PREFS_EVENT,
  readNotificationPrefs,
  showPrayerNotification,
} from '@/lib/impure/notifications'
import { computeDayTimes, METHOD_EVENT, readCalculationMethodId } from '@/lib/impure/prayer'

import {
  ADHKAR_REMINDER_MINUTES,
  BEFORE_ADHAN_MINUTES,
  IQAMAH_OFFSET_MINUTES,
  MOMENT_LABELS,
  NOTIFICATION_COPY,
} from '../constants'
import { notificationMoments } from '../logic'
import { armNativeAlarms } from '../native-alarms'

// Re-plan the day's timers at most this often; covers midnight rollover and pref changes
// made in another tab.
const REPLAN_MS = 15 * 60 * 1000

// Arms the day's prayer notifications while the app is open (ADR-0009 honest limits: without
// a push backend, delivery needs the page or its SW alive — stated in the onboarding copy).
// Renders nothing; mounted once in the root layout.
export function NotificationScheduler() {
  useEffect(() => {
    let timers: number[] = []

    const arm = () => {
      for (const timer of timers) window.clearTimeout(timer)
      timers = []

      const prefs = readNotificationPrefs()
      const coords = readCachedCoords()

      // Inside the Android shell (NBD-46) the system carries the alarms — exact, with the
      // adhan on the channel, app closed or open. The plugin owns its permission check.
      if (isNativePlatform()) {
        if (coords) void armNativeAlarms(prefs, coords, Date.now())
        return
      }

      if (!prefs.enabled || !coords || notificationPermission() !== 'granted') return

      const now = Date.now()
      const moments = notificationMoments(
        // The picked calculation method must drive the timers too (NBD-38 follow-up fix).
        { ...computeDayTimes(coords, new Date(now), readCalculationMethodId()) },
        IQAMAH_OFFSET_MINUTES,
        prefs,
        BEFORE_ADHAN_MINUTES,
        ADHKAR_REMINDER_MINUTES,
        now,
      )
      for (const moment of moments) {
        timers.push(
          window.setTimeout(() => {
            const label = MOMENT_LABELS[moment.prayerId]
            const { title, body } = NOTIFICATION_COPY[moment.kind](label)
            void showPrayerNotification(title, body)
            playMomentSound(moment.kind, moment.prayerId)
          }, moment.at - now),
        )
      }
    }

    arm()
    const replanTimer = window.setInterval(arm, REPLAN_MS)
    // A method change moves the day's times — re-arm immediately, not at the next replan.
    window.addEventListener(METHOD_EVENT, arm)
    // A pref change re-arms immediately so the user's toggle takes effect (NBD-61).
    window.addEventListener(PREFS_EVENT, arm)
    return () => {
      window.clearInterval(replanTimer)
      window.removeEventListener(METHOD_EVENT, arm)
      window.removeEventListener(PREFS_EVENT, arm)
      for (const timer of timers) window.clearTimeout(timer)
    }
  }, [])

  return null
}
