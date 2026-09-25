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
import { readExactAlarmSnapshot } from './exactAlarm'
import {
  cancelPrayerAlarms,
  configureForegroundHandler,
  readNotificationPermission,
  replacePrayerAlarms,
} from './notifications'
import { buildPrayerSchedule } from './schedule'
import { setPrayerAlarmSyncOutcome, subscribePrayerReschedule } from './prayerAlarms'
import type { ExactAlarmAccess } from './types'

type UsePrayerAlarmsOptions = {
  now?: () => number
}

type PrayerAlarmsView = {
  sync: () => Promise<void>
}

function prayerAlarmSignature(
  silentMode: boolean,
  alarms: AlarmPayload[],
  access: ExactAlarmAccess,
): string {
  return JSON.stringify({
    silentMode,
    access,
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

  const performSync = useCallback(async (): Promise<void> => {
    try {
      const currentTime = now()
      const exactAlarm = readExactAlarmSnapshot()
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
        setPrayerAlarmSyncOutcome('ok')
        return
      }

      const alarms = buildPrayerSchedule({
        coords: { latitude: location.latitude, longitude: location.longitude },
        methodId,
        notificationPrefs,
        now: currentTime,
      })
      const signature = prayerAlarmSignature(silentMode, alarms, exactAlarm.access)
      if (lastAppliedSignatureRef.current === signature) {
        setPrayerAlarmSyncOutcome('ok')
        return
      }

      await replacePrayerAlarms(alarms, silentMode, currentTime)
      lastAppliedSignatureRef.current = signature
      setPrayerAlarmSyncOutcome('ok')
    } catch (cause: unknown) {
      lastAppliedSignatureRef.current = null
      setPrayerAlarmSyncOutcome('failed')
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
