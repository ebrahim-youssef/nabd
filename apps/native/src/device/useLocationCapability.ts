import { useSQLiteContext } from 'expo-sqlite'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { AppState } from 'react-native'

import { logger } from '../observability/logger'
import { createNetInfoConnectivityProvider, useConnectivityState } from './connectivity'
import type { ConnectivityProvider } from './connectivity'
import { createDeviceRepository, LOCATION_CACHE_MAX_AGE_MS } from './db'
import type { CachedLocation } from './db'
import { evaluateLocation } from './logic'
import { createReverseGeocodeAdapter, resolveCachedCity } from './reverseGeocode'
import type { ReverseGeocoder } from './reverseGeocode'
import {
  enableServices,
  getFix,
  openAppSettings,
  openLocationSettings,
  readPermission,
  requestPermission,
  servicesEnabled,
} from './location'
import type { LocationFixResult } from './location'
import type {
  ConnectivityState,
  DeviceActionType,
  GpsState,
  LocationCapabilitySnapshot,
  LocationPermission,
  LocationStatus,
} from './types'

export type LocationAdapter = {
  readPermission: typeof readPermission
  requestPermission: typeof requestPermission
  servicesEnabled: typeof servicesEnabled
  enableServices: typeof enableServices
  getFix: typeof getFix
  openAppSettings: typeof openAppSettings
  openLocationSettings: typeof openLocationSettings
}

export type UseLocationCapabilityOptions = {
  adapter?: LocationAdapter
  connectivityProvider?: ConnectivityProvider
  reverseGeocoder?: ReverseGeocoder
  now?: () => number
}

export type LocationRefreshOptions = {
  force?: boolean
}

export type LocationCapabilityView = {
  status: LocationStatus
  coordinates: { latitude: number; longitude: number } | null
  city: string | null
  isRefreshing: boolean
  refresh: (options?: LocationRefreshOptions) => Promise<void>
  runAction: (action?: DeviceActionType) => Promise<void>
}

const DEFAULT_LOCATION_ADAPTER: LocationAdapter = {
  readPermission,
  requestPermission,
  servicesEnabled,
  enableServices,
  getFix,
  openAppSettings,
  openLocationSettings,
}

const INITIAL_SNAPSHOT: LocationCapabilitySnapshot = {
  permission: 'undetermined',
  gps: 'unknown',
  connectivity: 'unknown',
  coordinateCache: 'missing',
  cityCache: 'missing',
}

const INITIAL_VIEW: LocationCapabilityViewState = {
  snapshot: INITIAL_SNAPSHOT,
  coordinates: null,
  city: null,
}

type LocationCapabilityViewState = {
  snapshot: LocationCapabilitySnapshot
  coordinates: { latitude: number; longitude: number } | null
  city: string | null
}

type ConnectivityObservation = {
  source: ConnectivityState
  value: ConnectivityState
}

function coordinateCacheState(cached: CachedLocation | null, now: number) {
  if (!cached) return 'missing' as const
  return now - cached.recordedAt <= LOCATION_CACHE_MAX_AGE_MS
    ? ('fresh' as const)
    : ('stale' as const)
}

function makeSnapshot(
  permission: LocationPermission,
  gps: GpsState,
  cached: CachedLocation | null,
  connectivity: ConnectivityState,
  now: number,
  fix?: LocationCapabilitySnapshot['fix'],
): LocationCapabilitySnapshot {
  return {
    permission,
    gps,
    connectivity,
    coordinateCache: coordinateCacheState(cached, now),
    cityCache: cached?.city ? 'available' : 'missing',
    fix,
  }
}

function coordinatesFrom(cached: CachedLocation | null) {
  return cached ? { latitude: cached.latitude, longitude: cached.longitude } : null
}

function currentSnapshot(snapshot: LocationCapabilitySnapshot, connectivity: ConnectivityState) {
  return { ...snapshot, connectivity }
}

export function useLocationCapability(
  options: UseLocationCapabilityOptions = {},
): LocationCapabilityView {
  const database = useSQLiteContext()
  const repository = useMemo(() => createDeviceRepository(database), [database])
  const adapter = useMemo(() => options.adapter ?? DEFAULT_LOCATION_ADAPTER, [options.adapter])
  const connectivityProvider = useMemo(
    () => options.connectivityProvider ?? createNetInfoConnectivityProvider(),
    [options.connectivityProvider],
  )
  const connectivity = useConnectivityState(connectivityProvider)
  const [connectivityObservation, setConnectivityObservation] =
    useState<ConnectivityObservation | null>(null)
  const observedConnectivity =
    connectivityObservation?.source === connectivity ? connectivityObservation.value : connectivity
  const reverseGeocoder = useMemo(
    () => options.reverseGeocoder ?? createReverseGeocodeAdapter(),
    [options.reverseGeocoder],
  )
  const now = options.now ?? Date.now

  const [view, setView] = useState<LocationCapabilityViewState>(INITIAL_VIEW)
  const [isRefreshing, setIsRefreshing] = useState(true)
  const mountedRef = useRef(false)
  const viewRef = useRef<LocationCapabilityViewState>(INITIAL_VIEW)
  const cachedLocationRef = useRef<CachedLocation | null>(null)
  const connectivityRef = useRef(connectivity)
  const connectivitySourceRef = useRef(connectivity)
  const refreshPromiseRef = useRef<Promise<void> | null>(null)
  const refreshForceRef = useRef(false)
  const forcedRefreshPromiseRef = useRef<Promise<void> | null>(null)
  const actionPromiseRef = useRef<Promise<void> | null>(null)

  const commit = useCallback(
    (snapshot: LocationCapabilitySnapshot, cached: CachedLocation | null) => {
      const next: LocationCapabilityViewState = {
        snapshot,
        coordinates: coordinatesFrom(cached),
        city: cached?.city ?? null,
      }
      cachedLocationRef.current = cached
      viewRef.current = next
      if (mountedRef.current) setView(next)
    },
    [],
  )

  const setRefreshing = useCallback((value: boolean) => {
    if (mountedRef.current) setIsRefreshing(value)
  }, [])

  const performRefresh = useCallback(
    async (force: boolean): Promise<void> => {
      setRefreshing(true)
      let cached = cachedLocationRef.current
      try {
        const permission = await adapter.readPermission()
        const observedAt = now()
        const cacheState = await repository.readLocationCacheState(observedAt)
        const sourceConnectivity = connectivitySourceRef.current
        const currentConnectivity = await connectivityProvider.refresh()
        connectivityRef.current = currentConnectivity
        if (mountedRef.current) {
          setConnectivityObservation({ source: sourceConnectivity, value: currentConnectivity })
        }
        cached = cacheState
        commit(makeSnapshot(permission, 'unknown', cached, currentConnectivity, observedAt), cached)
        if (permission !== 'granted') return

        const gps: GpsState = (await adapter.servicesEnabled()) ? 'enabled' : 'disabled'
        commit(makeSnapshot(permission, gps, cached, connectivityRef.current, observedAt), cached)
        if (gps === 'disabled') return
        if (!force && cacheState?.fresh) return

        const fix = await adapter.getFix()
        if (fix.kind !== 'ok') {
          commit(
            makeSnapshot(permission, gps, cached, connectivityRef.current, observedAt, fix.kind),
            cached,
          )
          return
        }

        const coordinates = { latitude: fix.latitude, longitude: fix.longitude }
        const previousCity = cached?.city ?? null
        const recordedAt = now()
        await repository.writeCachedLocation({ ...coordinates, city: previousCity }, recordedAt)
        cached = { ...coordinates, city: previousCity, recordedAt }
        commit(
          makeSnapshot(permission, gps, cached, connectivityRef.current, recordedAt, 'ok'),
          cached,
        )

        let city = previousCity
        try {
          city = await resolveCachedCity(
            coordinates,
            connectivityRef.current,
            previousCity,
            reverseGeocoder,
          )
        } catch (cause: unknown) {
          logger.warn('Native location city resolution failed', { error: cause })
        }
        const resolved = { ...coordinates, city, recordedAt }
        await repository.writeCachedLocation({ ...coordinates, city }, recordedAt)
        cached = resolved
        commit(
          makeSnapshot(permission, gps, cached, connectivityRef.current, recordedAt, 'ok'),
          cached,
        )
      } catch (cause: unknown) {
        logger.error('Native location refresh failed', cause, { operation: 'refresh' })
        commit(
          { ...currentSnapshot(viewRef.current.snapshot, connectivityRef.current), fix: 'error' },
          cachedLocationRef.current,
        )
      } finally {
        setRefreshing(false)
      }
    },
    [adapter, commit, connectivityProvider, now, repository, reverseGeocoder, setRefreshing],
  )

  const startRefresh = useCallback(
    (force: boolean): Promise<void> => {
      const operation = performRefresh(force).finally(() => {
        refreshPromiseRef.current = null
        refreshForceRef.current = false
      })
      refreshPromiseRef.current = operation
      refreshForceRef.current = force
      return operation
    },
    [performRefresh],
  )

  const refresh = useCallback(
    ({ force = false }: LocationRefreshOptions = {}): Promise<void> => {
      const activeRefresh = refreshPromiseRef.current
      if (!activeRefresh) return startRefresh(force)
      if (!force || refreshForceRef.current) return activeRefresh
      if (forcedRefreshPromiseRef.current) return forcedRefreshPromiseRef.current

      const runForcedRefresh = (): Promise<void> => {
        const currentRefresh = refreshPromiseRef.current
        if (!currentRefresh) return startRefresh(true)
        if (refreshForceRef.current) return currentRefresh
        return currentRefresh.then(runForcedRefresh)
      }
      const queuedRefresh = activeRefresh.then(runForcedRefresh, runForcedRefresh)
      const trackedQueuedRefresh = queuedRefresh.finally(() => {
        if (forcedRefreshPromiseRef.current === trackedQueuedRefresh) {
          forcedRefreshPromiseRef.current = null
        }
      })
      forcedRefreshPromiseRef.current = trackedQueuedRefresh
      return trackedQueuedRefresh
    },
    [startRefresh],
  )

  const runAction = useCallback(
    (requestedAction?: DeviceActionType): Promise<void> => {
      if (actionPromiseRef.current) return actionPromiseRef.current

      const operation = (async (): Promise<void> => {
        const snapshot = currentSnapshot(viewRef.current.snapshot, connectivityRef.current)
        const action = requestedAction ?? evaluateLocation(snapshot).action?.type
        if (!action) return

        try {
          if (action === 'open-app-settings') {
            await adapter.openAppSettings()
            return
          }

          if (action === 'open-location-settings') {
            if (snapshot.gps === 'disabled') {
              const enabled = await adapter.enableServices()
              if (enabled) {
                await refresh({ force: true })
                return
              }
            }
            await adapter.openLocationSettings()
            return
          }

          let permission = snapshot.permission
          if (permission === 'undetermined' || permission === 'denied') {
            permission = await adapter.requestPermission()
            if (permission !== 'granted') {
              commit({ ...snapshot, permission, fix: undefined }, cachedLocationRef.current)
              return
            }
          }

          if (snapshot.gps === 'disabled') {
            const enabled = await adapter.enableServices()
            if (!enabled) {
              await adapter.openLocationSettings()
              return
            }
          }

          await refresh({ force: true })
        } catch (cause: unknown) {
          logger.error('Native location action failed', cause, { action })
        }
      })()
      const tracked = operation.finally(() => {
        actionPromiseRef.current = null
      })
      actionPromiseRef.current = tracked
      return tracked
    },
    [adapter, commit, refresh],
  )

  useEffect(() => {
    connectivitySourceRef.current = connectivity
    connectivityRef.current = connectivity
  }, [connectivity])

  useEffect(() => {
    mountedRef.current = true
    return () => {
      mountedRef.current = false
    }
  }, [])

  useEffect(() => {
    void refresh({ force: false })
  }, [refresh])

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextState) => {
      if (nextState === 'active') void refresh({ force: false })
    })
    return () => subscription.remove()
  }, [refresh])

  const status = evaluateLocation(currentSnapshot(view.snapshot, observedConnectivity))

  return {
    status,
    coordinates: view.coordinates,
    city: view.city,
    isRefreshing,
    refresh,
    runAction,
  }
}
