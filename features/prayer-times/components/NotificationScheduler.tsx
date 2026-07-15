'use client'

import { useEffect } from 'react'

import { readCachedCoords } from '@/lib/impure/location'
import {
  notificationPermission,
  playMomentTone,
  readNotificationPrefs,
  showPrayerNotification,
} from '@/lib/impure/notifications'
import { computeDayTimes } from '@/lib/impure/prayer'

import {
  BEFORE_ADHAN_MINUTES,
  IQAMAH_OFFSET_MINUTES,
  NOTIFICATION_COPY,
  PRAYER_LABELS,
} from '../constants'
import { notificationMoments } from '../logic'

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
      if (!prefs.enabled || !coords || notificationPermission() !== 'granted') return

      const now = Date.now()
      const moments = notificationMoments(
        { ...computeDayTimes(coords, new Date(now)) },
        IQAMAH_OFFSET_MINUTES,
        prefs,
        BEFORE_ADHAN_MINUTES,
        now,
      )
      for (const moment of moments) {
        timers.push(
          window.setTimeout(() => {
            const label = PRAYER_LABELS[moment.prayerId]
            const { title, body } = NOTIFICATION_COPY[moment.kind](label)
            void showPrayerNotification(title, body)
            playMomentTone(moment.kind)
          }, moment.at - now),
        )
      }
    }

    arm()
    const replanTimer = window.setInterval(arm, REPLAN_MS)
    return () => {
      window.clearInterval(replanTimer)
      for (const timer of timers) window.clearTimeout(timer)
    }
  }, [])

  return null
}
