import {
  DEFAULT_NOTIFICATION_PREFS,
  DEFAULT_METHOD_ID,
  isCalculationMethodId,
  parseNotificationPrefs,
  type CalculationMethodId,
  type NotificationPrefs,
} from '@nabd/shared'
import { useSQLiteContext } from 'expo-sqlite'
import { useCallback, useEffect, useMemo, useState } from 'react'

import type { PrayerScheduleResult, CountdownResult } from '../../modules/nabd-device-capabilities'
import nabdDeviceCapabilities from '../../modules/nabd-device-capabilities'
import { createPreferencesRepository, PREFERENCE_KEYS } from '../preferences/db'
import { createDeviceRepository } from './db'

import { buildPrayerSchedule } from './schedule'
import { useDeviceCapabilities } from './useDeviceCapabilities'

export type PrayerScheduleView = {
  notificationPrefs: NotificationPrefs
  alarmOnSilent: boolean
  isLoading: boolean
  error?: unknown
  lastScheduleResult?: PrayerScheduleResult
  lastCountdownResult?: CountdownResult
  sync: () => Promise<PrayerScheduleResult | undefined>
  setNotificationEnabled: (enabled: boolean) => Promise<void>
  setNotificationMoment: (key: keyof Omit<NotificationPrefs, 'enabled'>, enabled: boolean) => Promise<void>
  setAlarmOnSilent: (enabled: boolean) => Promise<void>
  setCountdownEnabled: (enabled: boolean) => Promise<void>
  cancel: () => Promise<void>
}

export function usePrayerSchedule(): PrayerScheduleView {
  const database = useSQLiteContext()
  const preferences = useMemo(() => createPreferencesRepository(database), [database])
  const deviceRepository = useMemo(() => createDeviceRepository(database), [database])
  const device = useDeviceCapabilities()
  const [notificationPrefs, setNotificationPrefs] = useState(DEFAULT_NOTIFICATION_PREFS)
  const [alarmOnSilent, setAlarmOnSilentState] = useState(false)
  const [methodId, setMethodId] = useState<CalculationMethodId>(DEFAULT_METHOD_ID)
  const [isLoading, setIsLoading] = useState(true)
  const [lastScheduleResult, setLastScheduleResult] = useState<PrayerScheduleResult>()
  const [lastCountdownResult, setLastCountdownResult] = useState<CountdownResult>()
  const [hydrationError, setHydrationError] = useState<unknown>()
  const [scheduleError, setScheduleError] = useState<unknown>()

  useEffect(() => {
    let active = true
    void Promise.all([
      preferences.read(PREFERENCE_KEYS.notifications),
      preferences.read(PREFERENCE_KEYS.alarmOnSilent),
      preferences.read(PREFERENCE_KEYS.calculationMethod),
    ])
      .then(([notifications, alarm, method]) => {
        if (!active) return
        let parsed = DEFAULT_NOTIFICATION_PREFS
        if (notifications) parsed = parseNotificationPrefs(JSON.parse(notifications))
        setNotificationPrefs(parsed)
        setAlarmOnSilentState(alarm === 'true')
        setMethodId(isCalculationMethodId(method) ? method : DEFAULT_METHOD_ID)
      })
      .catch((cause: unknown) => {
        if (!active) return
        setNotificationPrefs(DEFAULT_NOTIFICATION_PREFS)
        setAlarmOnSilentState(false)
        setMethodId(DEFAULT_METHOD_ID)
        setHydrationError(cause)
      })
      .finally(() => {
        if (active) setIsLoading(false)
      })
    return () => {
      active = false
    }
  }, [preferences])

  const sync = useCallback(async () => {
    const [persistedLocation, persistedMethod, persistedNotifications, persistedSilent] = await Promise.all([
      deviceRepository.readCachedLocation(),
      preferences.read(PREFERENCE_KEYS.calculationMethod),
      preferences.read(PREFERENCE_KEYS.notifications),
      preferences.read(PREFERENCE_KEYS.alarmOnSilent),
    ])
    const cachedLocation = persistedLocation ?? device.cachedLocation
    let prefs = notificationPrefs
    if (persistedNotifications) {
      try {
        prefs = parseNotificationPrefs(JSON.parse(persistedNotifications))
      } catch {
        setNotificationPrefs(DEFAULT_NOTIFICATION_PREFS)
        await nabdDeviceCapabilities.cancelPrayerSchedule()
        return undefined
      }
    }
    const selectedMethod = isCalculationMethodId(persistedMethod) ? persistedMethod : methodId
    const selectedSilent = persistedSilent === 'true'
    setNotificationPrefs(prefs)
    setAlarmOnSilentState(selectedSilent)
    if (!prefs.enabled || !cachedLocation) {
      await nabdDeviceCapabilities.cancelPrayerSchedule()
      return undefined
    }
    const schedule = buildPrayerSchedule({
      coords: cachedLocation,
      methodId: selectedMethod,
      notificationPrefs: prefs,
      now: Date.now(),
    })
    const result = await nabdDeviceCapabilities.replacePrayerSchedule({
      alarms: schedule.alarms,
      alarmOnSilent: selectedSilent,
    })
    setLastScheduleResult(result)
    if (!result.accepted) {
      const rollback = { ...prefs, enabled: false }
      await preferences.write(PREFERENCE_KEYS.notifications, JSON.stringify(rollback), Date.now())
      setNotificationPrefs(rollback)
      setScheduleError(new Error(result.reason ?? 'schedule_rejected'))
      await nabdDeviceCapabilities.cancelPrayerSchedule()
      await device.refresh()
      return result
    }
    setScheduleError(undefined)
    if (device.snapshot?.countdown.enabled) {
      const countdown = await nabdDeviceCapabilities.setCountdown({
        boundaries: schedule.boundaries,
        city: cachedLocation.city ?? undefined,
      })
      setLastCountdownResult(countdown)
    }
    await device.refresh()
    return result
  }, [device, deviceRepository, methodId, notificationPrefs, preferences])

  const setNotificationEnabled = useCallback(
    async (enabled: boolean) => {
      const previous = notificationPrefs
      const next = { ...previous, enabled }
      setNotificationPrefs(next)
      try {
        await preferences.write(PREFERENCE_KEYS.notifications, JSON.stringify(next), Date.now())
        if (!enabled) {
          await nabdDeviceCapabilities.cancelPrayerSchedule()
          await nabdDeviceCapabilities.clearCountdown()
          setLastScheduleResult(undefined)
          setLastCountdownResult(undefined)
          setScheduleError(undefined)
          await device.refresh()
          return
        }
        await sync()
      } catch (cause) {
        if (!enabled) {
          let rearmed = false
          try {
            await preferences.write(PREFERENCE_KEYS.notifications, JSON.stringify(previous), Date.now())
            setNotificationPrefs(previous)
            const result = await sync()
            rearmed = result?.accepted === true
          } catch {
            rearmed = false
          }
          if (!rearmed) {
            // A failed re-arm can happen after native scheduling has already
            // replaced the alarm set (for example, when the follow-up refresh
            // fails).  Make the disabled fallback match native state too.
            try {
              await nabdDeviceCapabilities.cancelPrayerSchedule()
            } catch {
              // Preserve the original cleanup failure for the actionable UI.
            }
            try {
              await nabdDeviceCapabilities.clearCountdown()
            } catch {
              // Preserve the original cleanup failure for the actionable UI.
            }
            const disabled = { ...previous, enabled: false }
            setNotificationPrefs(disabled)
            try {
              await preferences.write(PREFERENCE_KEYS.notifications, JSON.stringify(disabled), Date.now())
            } catch {
              // Keep the in-memory safe state even if SQLite is unavailable.
            }
          }
          setScheduleError(cause)
          return
        }
        setNotificationPrefs(previous)
        try {
          await preferences.write(PREFERENCE_KEYS.notifications, JSON.stringify(previous), Date.now())
        } catch {
          // Keep the in-memory rollback even if SQLite is unavailable.
        }
        try {
          await nabdDeviceCapabilities.cancelPrayerSchedule()
        } catch {
          // Preserve the original schedule error for the actionable UI.
        }
        setScheduleError(cause)
      }
    },
    [device, notificationPrefs, preferences, sync],
  )

  const setNotificationMoment = useCallback(
    async (key: keyof Omit<NotificationPrefs, 'enabled'>, enabled: boolean) => {
      const previous = notificationPrefs
      const next = { ...previous, [key]: enabled }
      setNotificationPrefs(next)
      try {
        await preferences.write(PREFERENCE_KEYS.notifications, JSON.stringify(next), Date.now())
        const result = next.enabled ? await sync() : undefined
        if (result && !result.accepted) return
        setScheduleError(undefined)
      } catch (cause) {
        setNotificationPrefs(previous)
        try {
          await preferences.write(PREFERENCE_KEYS.notifications, JSON.stringify(previous), Date.now())
        } catch {
          // Keep the in-memory rollback even if SQLite is unavailable.
        }
        setScheduleError(cause)
      }
    },
    [notificationPrefs, preferences, sync],
  )

  const setAlarmOnSilent = useCallback(
    async (enabled: boolean) => {
      const previous = alarmOnSilent
      setAlarmOnSilentState(enabled)
      try {
        await preferences.write(PREFERENCE_KEYS.alarmOnSilent, String(enabled), Date.now())
        const result = notificationPrefs.enabled ? await sync() : undefined
        if (result && !result.accepted) return
        setScheduleError(undefined)
      } catch (cause) {
        setAlarmOnSilentState(previous)
        try {
          await preferences.write(PREFERENCE_KEYS.alarmOnSilent, String(previous), Date.now())
        } catch {
          // Keep the in-memory rollback even if SQLite is unavailable.
        }
        setScheduleError(cause)
      }
    },
    [alarmOnSilent, notificationPrefs.enabled, preferences, sync],
  )

  const setCountdownEnabled = useCallback(
    async (enabled: boolean) => {
      if (!enabled) {
        try {
          await nabdDeviceCapabilities.clearCountdown()
          setLastCountdownResult(undefined)
          setScheduleError(undefined)
          await device.refresh()
        } catch (cause) {
          setScheduleError(cause)
        }
        return
      }
      const cachedLocation = device.cachedLocation
      if (!cachedLocation) {
        await device.refresh()
        return
      }
      const schedule = buildPrayerSchedule({
        coords: cachedLocation,
        methodId,
        notificationPrefs: { ...notificationPrefs, enabled: true },
        now: Date.now(),
      })
      try {
        const result = await nabdDeviceCapabilities.setCountdown({
          boundaries: schedule.boundaries,
          city: cachedLocation.city ?? undefined,
        })
        setLastCountdownResult(result)
        setScheduleError(undefined)
        await device.refresh()
      } catch (cause) {
        setScheduleError(cause)
      }
    }, [device, methodId, notificationPrefs])

  const cancel = useCallback(async () => {
    await nabdDeviceCapabilities.cancelPrayerSchedule()
    await nabdDeviceCapabilities.clearCountdown()
    await device.refresh()
  }, [device])

  return {
    notificationPrefs,
    alarmOnSilent,
    isLoading: isLoading || device.isLoading,
    error: hydrationError ?? scheduleError,
    lastScheduleResult,
    lastCountdownResult,
    sync,
    setNotificationEnabled,
    setNotificationMoment,
    setAlarmOnSilent,
    setCountdownEnabled,
    cancel,
  }
}
