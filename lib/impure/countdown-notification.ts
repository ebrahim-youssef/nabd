import { registerPlugin } from '@capacitor/core'

import { logger } from '@/lib/logger'

import { isNativePlatform } from './native'
import type { NotificationPrefs } from './notifications'
import { computeDayTimes, readCalculationMethodId } from './prayer'
import type { Coords } from './location'
import { AFTER_WINDOW_MS } from '@/features/prayer-times/logic'
import { PRAYER_LABELS } from '@/features/prayer-times/constants'

export interface CountdownBoundary {
  at: number
  label: string
  sunrise: boolean
}

export interface CountdownNotificationPlugin {
  enable(options: { boundaries: CountdownBoundary[] }): Promise<void>
  disable(): Promise<void>
}

export const CountdownNotification =
  registerPlugin<CountdownNotificationPlugin>('CountdownNotification')

const PRAYER_IDS = ['fajr', 'sunrise', 'dhuhr', 'asr', 'maghrib', 'isha'] as const

export async function syncCountdownNotification(
  prefs: NotificationPrefs,
  coords: Coords,
  now: number,
): Promise<void> {
  if (!isNativePlatform()) return

  if (!prefs.permanentCountdown) {
    try {
      await CountdownNotification.disable()
    } catch {
      // Plugin not available — older APK or non-native.
    }
    return
  }

  try {
    const methodId = readCalculationMethodId()
    const boundaries: CountdownBoundary[] = []
    const cutoff = now - AFTER_WINDOW_MS

    for (let offset = 0; offset < 3; offset += 1) {
      const date = new Date(now + offset * 86_400_000)
      const times = computeDayTimes(coords, date, methodId)
      for (const id of PRAYER_IDS) {
        const at = times[id]
        if (at > cutoff) {
          boundaries.push({ at, label: PRAYER_LABELS[id] ?? id, sunrise: id === 'sunrise' })
        }
      }
    }

    boundaries.sort((a, b) => a.at - b.at)
    await CountdownNotification.enable({ boundaries })
  } catch (error) {
    logger.error('Failed to sync countdown notification', error)
  }
}
