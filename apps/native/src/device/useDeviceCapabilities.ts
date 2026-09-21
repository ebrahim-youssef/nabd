import type { NotificationPrefs } from '@nabd/shared'
import { useSQLiteContext } from 'expo-sqlite'
import { Platform } from 'react-native'
import { useCallback, useEffect, useMemo, useState } from 'react'

import nabdDeviceCapabilities from '../../modules/nabd-device-capabilities'
import type {
  CapabilitySnapshot,
  LocationResult,
  NabdDeviceCapabilities,
} from '../../modules/nabd-device-capabilities'

import { evaluateDeviceStatus } from './logic'
import { createNetInfoConnectivityProvider, useConnectivityState } from './connectivity'
import type { ConnectivityProvider } from './connectivity'
import { createReverseGeocodeAdapter, resolveCachedCity } from './reverseGeocode'
import type { ReverseGeocoder } from './reverseGeocode'
import type {
  ConnectivityState,
  DeviceActionType,
  DeviceCapabilitySnapshot,
  DeviceStatus,
} from './types'
import {
  createDeviceRepository,
  LOCATION_CACHE_MAX_AGE_MS,
  type CachedLocation,
} from './db'

export type DeviceCapabilitiesAdapter = NabdDeviceCapabilities

export type DeviceCapabilityView = {
  snapshot: DeviceCapabilitySnapshot | undefined
  status: DeviceStatus | undefined
  cachedLocation: CachedLocation | null
  isLoading: boolean
  isRequestingLocation: boolean
  error: unknown
  actionError: unknown
  refresh: () => Promise<void>
  requestLocation: () => Promise<LocationResult>
  setNotificationsEnabled: (enabled: boolean) => Promise<void>
  handleAction: (action: DeviceActionType) => Promise<boolean>
  retryLastAction: () => Promise<DeviceActionType | undefined>
}

const permission = (
  value: CapabilitySnapshot['locationPermission'] | CapabilitySnapshot['notificationPermission'],
) => {
  if (value === 'granted') return 'granted' as const
  if (value === 'permanentlyDenied') return 'blocked' as const
  if (value === 'notAsked') return 'undetermined' as const
  return 'denied' as const
}

export function mapCapabilitySnapshot(
  nativeSnapshot: CapabilitySnapshot,
  cachedLocation: CachedLocation | null,
  notificationPrefs: NotificationPrefs,
  now: number,
  options: { apiLevel?: number; connectivity?: ConnectivityState } = {},
): DeviceCapabilitySnapshot {
  const apiLevel = options.apiLevel ?? (Number(Platform.Version) || 0)
  const coordinateCache = cachedLocation
    ? now - cachedLocation.recordedAt <= LOCATION_CACHE_MAX_AGE_MS
      ? 'fresh'
      : 'stale'
    : 'missing'

  return {
    notifications: {
      permission: permission(nativeSnapshot.notificationPermission),
      enabled: notificationPrefs.enabled,
      deviceEnabled: nativeSnapshot.notificationsEnabled,
      channels: nativeSnapshot.alarmChannels,
      // Sound policy is configured by the typed native schedule API. The snapshot does not
      // claim DND bypass support, so a disabled route is the honest neutral state here.
      silentMode: 'disabled',
    },
    exactAlarm: {
      apiLevel,
      access: apiLevel < 31 ? 'not-required' : nativeSnapshot.exactAlarmAccess ? 'granted' : 'denied',
    },
    location: {
      permission: permission(nativeSnapshot.locationPermission),
      gps: nativeSnapshot.locationServicesEnabled ? 'enabled' : 'disabled',
      connectivity: options.connectivity ?? 'unknown',
      coordinateCache,
      cityCache: cachedLocation?.city ? 'available' : 'missing',
    },
    countdown: { enabled: nativeSnapshot.countdownEnabled },
    battery: {
      optimization: nativeSnapshot.batteryOptimizationAvailable
        ? nativeSnapshot.batteryOptimizationIgnored
          ? 'exempt'
          : 'optimized'
        : 'unavailable',
    },
  }
}

export function createDeviceCapabilitiesController(
  database: Parameters<typeof createDeviceRepository>[0],
  native: DeviceCapabilitiesAdapter = nabdDeviceCapabilities,
  options: {
    now?: () => number
    apiLevel?: number
    connectivity?: ConnectivityProvider | (() => ConnectivityState)
    reverseGeocoder?: ReverseGeocoder
  } = {},
) {
  const repository = createDeviceRepository(database)
  const now = options.now ?? Date.now
  const getConnectivity = () =>
    typeof options.connectivity === 'function'
      ? options.connectivity()
      : options.connectivity?.getState() ?? 'unknown'
  const reverseGeocoder = options.reverseGeocoder ?? createReverseGeocodeAdapter()
  return {
    async read() {
      const [nativeSnapshot, cachedLocation, notificationPrefs] = await Promise.all([
        native.getCapabilitySnapshot(),
        repository.readCachedLocation(),
        repository.readNotificationPrefs(),
      ])
      const snapshot = mapCapabilitySnapshot(nativeSnapshot, cachedLocation, notificationPrefs, now(), {
        apiLevel: options.apiLevel,
        connectivity: getConnectivity(),
      })
      return {
        nativeSnapshot,
        cachedLocation,
        notificationPrefs,
        snapshot,
        status: evaluateDeviceStatus(snapshot),
      }
    },
    async resolveCity(coords: { latitude: number; longitude: number }, cachedCity: string | null) {
      return resolveCachedCity(coords, getConnectivity(), cachedCity, reverseGeocoder)
    },
    repository,
    native,
    now,
  }
}

export function useDeviceCapabilities(): DeviceCapabilityView {
  const database = useSQLiteContext()
  const connectivityProvider = useMemo(() => createNetInfoConnectivityProvider(), [])
  const connectivity = useConnectivityState(connectivityProvider)
  const controller = useMemo(
    () =>
      createDeviceCapabilitiesController(database, nabdDeviceCapabilities, {
        connectivity: connectivityProvider,
      }),
    [database, connectivityProvider],
  )
  const [view, setView] = useState<Awaited<ReturnType<typeof controller.read>>>()
  const [isLoading, setIsLoading] = useState(true)
  const [isRequestingLocation, setIsRequestingLocation] = useState(false)
  const [error, setError] = useState<unknown>()
  const [actionError, setActionError] = useState<unknown>()
  const [failedAction, setFailedAction] = useState<DeviceActionType>()

  const refresh = useCallback(async () => {
    setIsLoading(true)
    try {
      const next = await controller.read()
      setView(next)
      setError(undefined)
    } catch (cause) {
      setError(cause)
    } finally {
      setIsLoading(false)
    }
  }, [controller])

  useEffect(() => {
    // The controller read is asynchronous; the effect owns only the initial external-state refresh.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void refresh()
  }, [refresh, connectivity])

  const requestLocation = useCallback(async () => {
    setIsRequestingLocation(true)
    try {
      const result = await controller.native.requestLocation()
      if (result.ok) {
        const previous = await controller.repository.readCachedLocation()
        const recordedAt = result.cached ? previous?.recordedAt ?? controller.now() : controller.now()
        const city = await controller.resolveCity(result.coords, previous?.city ?? null)
        await controller.repository.writeCachedLocation(
          { ...result.coords, city },
          recordedAt,
        )
      }
      await refresh()
      return result
    } catch (cause) {
      setActionError(cause)
      setFailedAction('retry-location')
      return { ok: false as const, reason: 'unavailable' as const }
    } finally {
      setIsRequestingLocation(false)
    }
  }, [controller, refresh])

  const setNotificationsEnabled = useCallback(
    async (enabled: boolean) => {
      const current = await controller.repository.readNotificationPrefs()
      await controller.repository.writeNotificationPrefs({ ...current, enabled }, controller.now())
      await refresh()
    },
    [controller, refresh],
  )

  const handleAction = useCallback(
    async (action: DeviceActionType) => {
      try {
        switch (action) {
          case 'request-notification-permission':
            await controller.native.requestNotificationPermission()
            break
          case 'enable-notifications':
            await setNotificationsEnabled(true)
            break
          case 'open-app-settings':
            await controller.native.openApplicationSettings()
            break
          case 'open-exact-alarm-settings':
            await controller.native.openExactAlarmSettings()
            break
          case 'open-location-settings':
            await controller.native.ensureLocationServices()
            break
          case 'retry-location':
            if (!(await requestLocation()).ok) return false
            break
          case 'request-battery-exemption':
            await controller.native.requestBatteryOptimizationExemption()
            break
          case 'open-battery-settings':
            await controller.native.openBatteryOptimizationSettings()
            break
        }
        setActionError(undefined)
        setFailedAction(undefined)
        await refresh()
        return true
      } catch (cause) {
        setActionError(cause)
        setFailedAction(action)
        return false
      }
    },
    [controller, refresh, requestLocation, setNotificationsEnabled],
  )

  const retryLastAction = useCallback(
    async () => {
      if (!failedAction) return undefined
      const action = failedAction
      return (await handleAction(action)) ? action : undefined
    },
    [failedAction, handleAction],
  )

  return {
    snapshot: view?.snapshot,
    status: view?.status,
    cachedLocation: view?.cachedLocation ?? null,
    isLoading,
    isRequestingLocation,
    error,
    actionError,
    refresh,
    requestLocation,
    setNotificationsEnabled,
    handleAction,
    retryLastAction,
  }
}
