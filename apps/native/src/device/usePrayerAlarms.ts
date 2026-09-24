import {
  DEFAULT_METHOD_ID,
  isCalculationMethodId,
  type AlarmPayload,
  type CalculationMethodId,
} from '@nabd/shared'
import { useSQLiteContext } from 'expo-sqlite'
import { useCallback, useEffect, useMemo, useRef } from 'react'
import { AppState } from 'react-native'

import { logger } from '../observability/logger'
import {
  createPreferencesRepository,
  parseStoredNotificationPrefs,
  parseStoredSilentMode,
  PREFERENCE_KEYS,
} from '../preferences/db'
import { createDeviceRepository } from './db'
import {
  cancelPrayerAlarms,
  configureForegroundHandler,
  readNotificationPermission,
  replacePrayerAlarms,
} from './notifications'
import { buildPrayerSchedule } from './schedule'
import { subscribePrayerReschedule } from './prayerAlarms'

type UsePrayerAlarmsOptions = {
  now?: () => number
}

type PrayerAlarmsView = {
  sync: () => Promise<void>
}

function prayerAlarmSignature(silentMode: boolean, alarms: AlarmPayload[]): string {
  return JSON.stringify({
    silentMode,
    alarms: alarms.map(({ id, at, channelKey }) => ({ id, at, channelKey })),
  })
}

function selectedMethod(value: string | null): CalculationMethodId {
  return isCalculationMethodId(value) ? value : DEFAULT_METHOD_ID
}

export function usePrayerAlarms(options: UsePrayerAlarmsOptions = {}): PrayerAlarmsView {
  const database = useSQLiteContext()
  const preferences = useMemo(() => createPreferencesRepository(database), [database])
  const deviceRepository = useMemo(() => createDeviceRepository(database), [database])
  const now = options.now ?? Date.now
  const runningRef = useRef<Promise<void> | null>(null)
  const queuedRef = useRef(false)
  const lastAppliedSignatureRef = useRef<string | null>(null)
  const lastRunSucceededRef = useRef(false)

  const performSync = useCallback(async (): Promise<void> => {
    try {
      const currentTime = now()
      const [permission, storedPrefs, storedSilentMode, storedMethod, location] = await Promise.all(
        [
          readNotificationPermission(),
          preferences.read(PREFERENCE_KEYS.notificationPrefs),
          preferences.read(PREFERENCE_KEYS.silentMode),
          preferences.read(PREFERENCE_KEYS.calculationMethod),
          deviceRepository.readLocationCacheState(currentTime),
        ],
      )
      const notificationPrefs = parseStoredNotificationPrefs(storedPrefs)
      const silentMode = parseStoredSilentMode(storedSilentMode)
      const methodId = selectedMethod(storedMethod)

      if (permission !== 'granted' || !notificationPrefs.enabled || location === null) {
        await cancelPrayerAlarms()
        lastAppliedSignatureRef.current = null
        lastRunSucceededRef.current = true
        return
      }

      const schedule = buildPrayerSchedule({
        coords: { latitude: location.latitude, longitude: location.longitude },
        methodId,
        notificationPrefs,
        now: currentTime,
      })
      const signature = prayerAlarmSignature(silentMode, schedule.alarms)
      if (lastRunSucceededRef.current && lastAppliedSignatureRef.current === signature) return

      await replacePrayerAlarms(schedule.alarms, silentMode, currentTime)
      lastAppliedSignatureRef.current = signature
      lastRunSucceededRef.current = true
    } catch (cause: unknown) {
      lastRunSucceededRef.current = false
      logger.error('Native prayer alarm synchronization failed', cause, {
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

    const operation = (async (): Promise<void> => {
      do {
        queuedRef.current = false
        await performSync()
      } while (queuedRef.current)
    })()
    const tracked = operation.finally(() => {
      if (runningRef.current === tracked) runningRef.current = null
    })
    runningRef.current = tracked
    return tracked
  }, [performSync])

  useEffect(() => {
    try {
      configureForegroundHandler()
    } catch (cause: unknown) {
      logger.error('Native notification foreground handler setup failed', cause, {
        operation: 'configure-foreground-handler',
      })
    }

    void sync()
    const appStateSubscription = AppState.addEventListener('change', (nextState) => {
      if (nextState === 'active') void sync()
    })
    const unsubscribe = subscribePrayerReschedule(() => {
      void sync()
    })

    return () => {
      appStateSubscription.remove()
      unsubscribe()
    }
  }, [sync])

  return { sync }
}

export function PrayerAlarmsBootstrap(): null {
  usePrayerAlarms()
  return null
}
