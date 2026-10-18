import { useSQLiteContext } from 'expo-sqlite'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { AppState } from 'react-native'

import { logger } from '../observability/logger'
import {
  createPreferencesRepository,
  parseStoredNotificationPrefs,
  PREFERENCE_KEYS,
} from '../preferences/db'
import { clearCountdownNotification, setCountdownNotification } from './countdownNotification'
import { createDeviceRepository } from './db'
import { subscribeTimeChange } from './exactAlarm'
import { subscribePrayerReschedule } from './prayerAlarms'
import { resolveCityLabel } from './reverseGeocode'
import { selectedMethod } from './usePrayerAlarms'
import type { CountdownNotificationResult } from './countdownNotification'

const COUNTDOWN_ENABLED = '1'

type UseCountdownNotificationOptions = {
  now?: () => number
}

export type CountdownNotificationView = {
  status: CountdownNotificationResult | null
  sync: () => Promise<void>
}

export function useCountdownNotification(
  options: UseCountdownNotificationOptions = {},
): CountdownNotificationView {
  const database = useSQLiteContext()
  const preferences = useMemo(() => createPreferencesRepository(database), [database])
  const deviceRepository = useMemo(() => createDeviceRepository(database), [database])
  const now = options.now ?? Date.now
  const [status, setStatus] = useState<CountdownNotificationResult | null>(null)
  const runningRef = useRef<Promise<void> | null>(null)
  const queuedRef = useRef(false)

  const performSync = useCallback(async (): Promise<void> => {
    try {
      const currentTime = now()
      const [enabled, storedNotificationPrefs] = await Promise.all([
        preferences.read(PREFERENCE_KEYS.countdownEnabled),
        preferences.read(PREFERENCE_KEYS.notificationPrefs),
      ])
      // The countdown is part of prayer notifications, so the master switch turns it off too.
      const notificationsEnabled = parseStoredNotificationPrefs(storedNotificationPrefs).enabled
      if (enabled !== COUNTDOWN_ENABLED || !notificationsEnabled) {
        clearCountdownNotification()
        setStatus(null)
        return
      }

      const [storedMethod, location] = await Promise.all([
        preferences.read(PREFERENCE_KEYS.calculationMethod),
        deviceRepository.readLocationCacheState(currentTime),
      ])
      if (location === null) {
        clearCountdownNotification()
        setStatus(null)
        return
      }

      const coordinates = { latitude: location.latitude, longitude: location.longitude }
      const city = await resolveCityLabel(coordinates, true, preferences, currentTime)
      setStatus(
        setCountdownNotification(currentTime, coordinates, city, selectedMethod(storedMethod)),
      )
    } catch (cause: unknown) {
      setStatus('error')
      logger.error('Native countdown notification synchronization failed', cause, {
        operation: 'sync',
      })
    }
  }, [deviceRepository, now, preferences])

  const sync = useCallback((): Promise<void> => {
    const active = runningRef.current
    if (active) {
      queuedRef.current = true
      return active
    }

    let operation!: Promise<void>
    operation = (async (): Promise<void> => {
      try {
        do {
          queuedRef.current = false
          await performSync()
        } while (queuedRef.current)
      } finally {
        if (runningRef.current === operation) runningRef.current = null
      }
    })()
    runningRef.current = operation
    return operation
  }, [performSync])

  useEffect(() => {
    void sync()
    const appStateSubscription = AppState.addEventListener('change', (nextState) => {
      if (nextState === 'active') void sync()
    })
    const unsubscribe = subscribePrayerReschedule(() => {
      void sync()
    })
    const unsubscribeTimeChange = subscribeTimeChange(() => {
      void sync()
    })

    return () => {
      appStateSubscription.remove()
      unsubscribe()
      unsubscribeTimeChange()
    }
  }, [sync])

  return { status, sync }
}

export function CountdownNotificationBootstrap(): null {
  useCountdownNotification()
  return null
}
