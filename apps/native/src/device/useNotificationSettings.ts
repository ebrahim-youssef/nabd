import { DEFAULT_NOTIFICATION_PREFS, type NotificationPrefs } from '@nabd/shared'
import * as IntentLauncher from 'expo-intent-launcher'
import { useSQLiteContext } from 'expo-sqlite'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
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
import { androidPackage, openAppSettings } from './location'
import { evaluateExactAlarm, evaluateNotificationSettings } from './logic'
import { readNotificationPermission, requestNotificationPermission } from './notifications'
import { requestPrayerReschedule } from './prayerAlarms'
import type {
  ExactAlarmSnapshot,
  ExactAlarmStatus,
  NotificationActionType,
  NotificationPermission,
  NotificationStatus,
} from './types'

export type NotificationMomentKey = Exclude<keyof NotificationPrefs, 'enabled'>
type NotificationWriteKey = 'enabled' | NotificationMomentKey | 'silentMode'

type NotificationSettingsState = {
  permission: NotificationPermission
  prefs: NotificationPrefs
  silentMode: boolean
  exactAlarm: ExactAlarmSnapshot
  hasCoordinates: boolean
}

type OptimisticWrite = {
  key: NotificationWriteKey
  update: (state: NotificationSettingsState) => NotificationSettingsState
  revert: (state: NotificationSettingsState) => NotificationSettingsState
  persist: () => Promise<void>
  errorMessage: string
  context: Record<string, unknown>
}

type NotificationSettingsView = {
  permission: NotificationPermission
  prefs: NotificationPrefs
  silentMode: boolean
  hasCoordinates: boolean
  notificationStatus: NotificationStatus
  exactAlarmStatus: ExactAlarmStatus
  isPending: (key: NotificationWriteKey) => boolean
  setEnabled: (value: boolean) => Promise<void>
  setMoment: (key: NotificationMomentKey, value: boolean) => Promise<void>
  setSilentMode: (value: boolean) => Promise<void>
  runAction: (type: NotificationActionType) => Promise<void>
}

type UseNotificationSettingsOptions = {
  now?: () => number
}

const SILENT_MODE_ENABLED = '1'
const SILENT_MODE_DISABLED = '0'
const INITIAL_EXACT_ALARM: ExactAlarmSnapshot = { apiLevel: 0, access: 'unknown' }
const INITIAL_STATE: NotificationSettingsState = {
  permission: 'undetermined',
  prefs: { ...DEFAULT_NOTIFICATION_PREFS },
  silentMode: false,
  exactAlarm: INITIAL_EXACT_ALARM,
  hasCoordinates: false,
}

export function useNotificationSettings(
  options: UseNotificationSettingsOptions = {},
): NotificationSettingsView {
  const database = useSQLiteContext()
  const preferences = useMemo(() => createPreferencesRepository(database), [database])
  const deviceRepository = useMemo(() => createDeviceRepository(database), [database])
  const now = options.now ?? Date.now
  const [state, setState] = useState<NotificationSettingsState>(INITIAL_STATE)
  const [pendingKeys, setPendingKeys] = useState<ReadonlySet<NotificationWriteKey>>(new Set())
  const stateRef = useRef<NotificationSettingsState>(INITIAL_STATE)
  const pendingKeysRef = useRef<Set<NotificationWriteKey>>(new Set())
  const writeIdsRef = useRef(new Map<NotificationWriteKey, number>())
  const mountedRef = useRef(false)
  const refreshIdRef = useRef(0)
  const mutationRevisionRef = useRef(0)

  const updateState = useCallback(
    (update: (current: NotificationSettingsState) => NotificationSettingsState) => {
      const next = update(stateRef.current)
      stateRef.current = next
      if (mountedRef.current) setState(next)
    },
    [],
  )

  const applyMutation = useCallback(
    (update: (current: NotificationSettingsState) => NotificationSettingsState) => {
      mutationRevisionRef.current += 1
      updateState(update)
    },
    [updateState],
  )

  const setPending = useCallback((key: NotificationWriteKey, pending: boolean) => {
    const next = new Set(pendingKeysRef.current)
    if (pending) {
      next.add(key)
    } else {
      next.delete(key)
    }
    pendingKeysRef.current = next
    if (mountedRef.current) setPendingKeys(next)
  }, [])

  const beginWrite = useCallback(
    (key: NotificationWriteKey) => {
      const nextId = (writeIdsRef.current.get(key) ?? 0) + 1
      writeIdsRef.current.set(key, nextId)
      setPending(key, true)
      return nextId
    },
    [setPending],
  )

  const isLatestWrite = useCallback((key: NotificationWriteKey, id: number) => {
    return writeIdsRef.current.get(key) === id
  }, [])

  const refresh = useCallback(async (): Promise<void> => {
    const refreshId = ++refreshIdRef.current
    const mutationRevision = mutationRevisionRef.current
    try {
      const observedAt = now()
      const [permission, storedPrefs, storedSilentMode, location] = await Promise.all([
        readNotificationPermission(),
        preferences.read(PREFERENCE_KEYS.notificationPrefs),
        preferences.read(PREFERENCE_KEYS.silentMode),
        deviceRepository.readLocationCacheState(observedAt),
      ])
      const next: NotificationSettingsState = {
        permission,
        prefs: parseStoredNotificationPrefs(storedPrefs),
        silentMode: parseStoredSilentMode(storedSilentMode),
        exactAlarm: readExactAlarmSnapshot(),
        hasCoordinates: location !== null,
      }
      if (!mountedRef.current || refreshId !== refreshIdRef.current) return
      updateState((current) => {
        if (mutationRevision === mutationRevisionRef.current) return next
        return {
          ...next,
          prefs: current.prefs,
          silentMode: current.silentMode,
        }
      })
    } catch (cause: unknown) {
      logger.error('Native notification settings read failed', cause, { operation: 'read' })
    }
  }, [deviceRepository, now, preferences, updateState])

  const writeOptimistically = useCallback(
    async ({
      key,
      update,
      revert,
      persist,
      errorMessage,
      context,
    }: OptimisticWrite): Promise<void> => {
      const id = beginWrite(key)
      applyMutation(update)
      try {
        await persist()
      } catch (cause: unknown) {
        if (isLatestWrite(key, id)) applyMutation(revert)
        logger.error(errorMessage, cause, context)
        return
      } finally {
        if (isLatestWrite(key, id)) setPending(key, false)
      }
      requestPrayerReschedule()
    },
    [applyMutation, beginWrite, isLatestWrite, setPending],
  )

  const writeNotificationPrefs = useCallback(
    (key: keyof NotificationPrefs, value: boolean): Promise<void> => {
      const previous = stateRef.current.prefs[key]
      const nextPrefs = { ...stateRef.current.prefs, [key]: value }
      return writeOptimistically({
        key,
        update: (current) => ({ ...current, prefs: { ...current.prefs, [key]: value } }),
        revert: (current) => ({ ...current, prefs: { ...current.prefs, [key]: previous } }),
        persist: () =>
          preferences.write(PREFERENCE_KEYS.notificationPrefs, JSON.stringify(nextPrefs), now()),
        errorMessage: 'Native notification preference write failed',
        context: { key, value },
      })
    },
    [now, preferences, writeOptimistically],
  )

  const openApplicationSettings = useCallback(async (): Promise<void> => {
    try {
      await openAppSettings()
    } catch (cause: unknown) {
      logger.error('Native notification app settings action failed', cause, {
        action: 'open-app-settings',
      })
    }
  }, [])

  const openExactAlarmSettings = useCallback(async (): Promise<void> => {
    try {
      await IntentLauncher.startActivityAsync(
        IntentLauncher.ActivityAction.REQUEST_SCHEDULE_EXACT_ALARM,
        { data: `package:${androidPackage()}` },
      )
    } catch (cause: unknown) {
      logger.error('Native exact alarm settings action failed', cause, {
        action: 'open-exact-alarm-settings',
      })
      try {
        await openAppSettings()
      } catch (fallbackCause: unknown) {
        logger.error('Native notification app settings fallback failed', fallbackCause, {
          action: 'open-app-settings',
        })
      }
    }
  }, [])

  const setEnabled = useCallback(
    async (value: boolean): Promise<void> => {
      if (!value) {
        await writeNotificationPrefs('enabled', false)
        return
      }

      const currentPermission = stateRef.current.permission
      if (currentPermission === 'blocked') {
        await openApplicationSettings()
        return
      }

      if (currentPermission !== 'granted') {
        let permission: NotificationPermission
        try {
          permission = await requestNotificationPermission()
        } catch (cause: unknown) {
          logger.error('Native notification permission request failed', cause, {
            operation: 'request',
          })
          return
        }
        applyMutation((current) => ({ ...current, permission }))
        if (permission === 'blocked') {
          await openApplicationSettings()
          return
        }
        if (permission !== 'granted') return
        if (stateRef.current.prefs.enabled) {
          requestPrayerReschedule()
          return
        }
      }

      await writeNotificationPrefs('enabled', true)
    },
    [applyMutation, openApplicationSettings, writeNotificationPrefs],
  )

  const setMoment = useCallback(
    async (key: NotificationMomentKey, value: boolean): Promise<void> => {
      await writeNotificationPrefs(key, value)
    },
    [writeNotificationPrefs],
  )

  const setSilentMode = useCallback(
    (value: boolean): Promise<void> => {
      const previous = stateRef.current.silentMode
      return writeOptimistically({
        key: 'silentMode',
        update: (current) => ({ ...current, silentMode: value }),
        revert: (current) => ({ ...current, silentMode: previous }),
        persist: () =>
          preferences.write(
            PREFERENCE_KEYS.silentMode,
            value ? SILENT_MODE_ENABLED : SILENT_MODE_DISABLED,
            now(),
          ),
        errorMessage: 'Native silent notification mode write failed',
        context: { value },
      })
    },
    [now, preferences, writeOptimistically],
  )

  const runAction = useCallback(
    async (type: NotificationActionType): Promise<void> => {
      if (type === 'enable-notifications') {
        await setEnabled(true)
        return
      }
      if (type === 'open-app-settings') {
        await openApplicationSettings()
        return
      }
      if (type === 'open-exact-alarm-settings') {
        await openExactAlarmSettings()
        return
      }

      let permission: NotificationPermission
      try {
        permission = await requestNotificationPermission()
      } catch (cause: unknown) {
        logger.error('Native notification permission action failed', cause, {
          action: type,
        })
        return
      }
      applyMutation((current) => ({ ...current, permission }))
      if (permission === 'granted') requestPrayerReschedule()
      if (permission === 'blocked') await openApplicationSettings()
    },
    [applyMutation, openApplicationSettings, openExactAlarmSettings, setEnabled],
  )

  useEffect(() => {
    mountedRef.current = true
    return () => {
      mountedRef.current = false
    }
  }, [])

  useEffect(() => {
    void refresh()
  }, [refresh])

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextState) => {
      if (nextState === 'active') void refresh()
    })
    return () => subscription.remove()
  }, [refresh])

  const notificationStatus = evaluateNotificationSettings({
    permission: state.permission,
    enabled: state.prefs.enabled,
  })
  const exactAlarmStatus = evaluateExactAlarm(state.exactAlarm)
  const isPending = useCallback((key: NotificationWriteKey) => pendingKeys.has(key), [pendingKeys])

  return {
    permission: state.permission,
    prefs: state.prefs,
    silentMode: state.silentMode,
    hasCoordinates: state.hasCoordinates,
    notificationStatus,
    exactAlarmStatus,
    isPending,
    setEnabled,
    setMoment,
    setSilentMode,
    runAction,
  }
}
