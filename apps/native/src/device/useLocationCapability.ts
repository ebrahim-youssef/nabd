import { useSQLiteContext } from 'expo-sqlite'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { AppState } from 'react-native'

import { logger } from '../observability/logger'
import { createNetInfoConnectivityProvider, useConnectivityState } from './connectivity'
import type { ConnectivityProvider } from './connectivity'
import { createDeviceRepository } from './db'
import type { CachedLocation } from './db'
import { evaluateLocation } from './logic'
import { requestPrayerReschedule } from './prayerAlarms'
import {
  enableServices,
  getFix,
  openAppSettings,
  openLocationSettings,
  readPermission,
  requestPermission,
  servicesEnabled,
} from './location'
import type {
  ConnectivityState,
  GpsState,
  LocationActionType,
  LocationCapabilitySnapshot,
  LocationPermission,
  LocationStatus,
} from './types'

export type UseLocationCapabilityOptions = {
  connectivityProvider?: ConnectivityProvider
  now?: () => number
}

export type LocationRefreshOptions = {
  force?: boolean
}

export type LocationCapabilityView = {
  status: LocationStatus
  coordinates: { latitude: number; longitude: number } | null
  isRefreshing: boolean
  refresh: (options?: LocationRefreshOptions) => Promise<void>
  runAction: (action?: LocationActionType) => Promise<void>
}

const INITIAL_SNAPSHOT: LocationCapabilitySnapshot = {
  permission: 'undetermined',
  gps: 'unknown',
  connectivity: 'unknown',
  coordinateCache: 'missing',
}

type LocationCapabilityViewState = {
  snapshot: LocationCapabilitySnapshot
  coordinates: { latitude: number; longitude: number } | null
}

const INITIAL_VIEW: LocationCapabilityViewState = {
  snapshot: INITIAL_SNAPSHOT,
  coordinates: null,
}

function makeSnapshot(
  permission: LocationPermission,
  gps: GpsState,
  cached: CachedLocation | null,
  cacheFresh: boolean,
  connectivity: ConnectivityState,
  fix?: LocationCapabilitySnapshot['fix'],
): LocationCapabilitySnapshot {
  return {
    permission,
    gps,
    connectivity,
    coordinateCache: cached ? (cacheFresh ? 'fresh' : 'stale') : 'missing',
    fix,
  }
}

function coordinatesFrom(cached: CachedLocation | null) {
  return cached ? { latitude: cached.latitude, longitude: cached.longitude } : null
}

function currentSnapshot(snapshot: LocationCapabilitySnapshot, connectivity: ConnectivityState) {
  return { ...snapshot, connectivity }
}

async function enableServicesOrOpenSettings(): Promise<boolean> {
  const enabled = await enableServices()
  if (!enabled) await openLocationSettings()
  return enabled
}

export function useLocationCapability(
  options: UseLocationCapabilityOptions = {},
): LocationCapabilityView {
  const database = useSQLiteContext()
  const repository = useMemo(() => createDeviceRepository(database), [database])
  const connectivityProvider = useMemo(
    () => options.connectivityProvider ?? createNetInfoConnectivityProvider(),
    [options.connectivityProvider],
  )
  const { state: connectivity, refreshAndSet } = useConnectivityState(connectivityProvider)
  const now = options.now ?? Date.now

  const [view, setView] = useState<LocationCapabilityViewState>(INITIAL_VIEW)
  const [isRefreshing, setIsRefreshing] = useState(true)
  const mountedRef = useRef(false)
  const viewRef = useRef<LocationCapabilityViewState>(INITIAL_VIEW)
  const cachedLocationRef = useRef<CachedLocation | null>(null)
  const connectivityRef = useRef(connectivity)
  const refreshPromiseRef = useRef<Promise<void> | null>(null)
  const activeForcedRef = useRef(false)
  const forceQueuedRef = useRef(false)
  const actionPromiseRef = useRef<Promise<void> | null>(null)

  const commit = useCallback(
    (snapshot: LocationCapabilitySnapshot, cached: CachedLocation | null) => {
      const next: LocationCapabilityViewState = {
        snapshot,
        coordinates: coordinatesFrom(cached),
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
        const permission = await readPermission()
        const observedAt = now()
        const cacheState = await repository.readLocationCacheState(observedAt)
        let cacheFresh = cacheState?.fresh ?? false
        const currentConnectivity = await refreshAndSet()
        connectivityRef.current = currentConnectivity
        cached = cacheState
        commit(makeSnapshot(permission, 'unknown', cached, cacheFresh, currentConnectivity), cached)
        if (permission !== 'granted') return

        const gps: GpsState = (await servicesEnabled()) ? 'enabled' : 'disabled'
        commit(makeSnapshot(permission, gps, cached, cacheFresh, connectivityRef.current), cached)
        if (gps === 'disabled') return
        if (!force && cacheState?.fresh) return

        const fix = await getFix()
        if (fix.kind !== 'ok') {
          commit(
            makeSnapshot(permission, gps, cached, cacheFresh, connectivityRef.current, fix.kind),
            cached,
          )
          return
        }

        const coordinates = { latitude: fix.latitude, longitude: fix.longitude }
        const recordedAt = now()
        await repository.writeCachedLocation(coordinates, recordedAt)
        requestPrayerReschedule()
        cacheFresh = true
        cached = { ...coordinates, recordedAt }
        commit(
          makeSnapshot(permission, gps, cached, cacheFresh, connectivityRef.current, 'ok'),
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
    [commit, now, refreshAndSet, repository, setRefreshing],
  )

  const startRefresh = useCallback(
    (initialForce: boolean): Promise<void> => {
      let operation: Promise<void>
      const drain = async (): Promise<void> => {
        let force = initialForce
        try {
          while (true) {
            activeForcedRef.current = force
            forceQueuedRef.current = false
            await performRefresh(force)
            if (!forceQueuedRef.current) return
            force = true
          }
        } finally {
          if (refreshPromiseRef.current === operation) {
            refreshPromiseRef.current = null
            activeForcedRef.current = false
            forceQueuedRef.current = false
          }
        }
      }
      operation = drain()
      refreshPromiseRef.current = operation
      return operation
    },
    [performRefresh],
  )

  const refresh = useCallback(
    ({ force = false }: LocationRefreshOptions = {}): Promise<void> => {
      const activeRefresh = refreshPromiseRef.current
      if (!activeRefresh) return startRefresh(force)
      if (force && !activeForcedRef.current) forceQueuedRef.current = true
      return activeRefresh
    },
    [startRefresh],
  )

  const runAction = useCallback(
    (requestedAction?: LocationActionType): Promise<void> => {
      if (actionPromiseRef.current) return actionPromiseRef.current

      const operation = (async (): Promise<void> => {
        const snapshot = currentSnapshot(viewRef.current.snapshot, connectivityRef.current)
        const action = requestedAction ?? evaluateLocation(snapshot).action?.type
        if (!action) return

        try {
          if (action === 'open-app-settings') {
            await openAppSettings()
            return
          }

          if (action === 'open-location-settings') {
            if (snapshot.gps === 'disabled') {
              const enabled = await enableServicesOrOpenSettings()
              if (enabled) {
                await refresh({ force: true })
              }
              return
            }
            await openLocationSettings()
            return
          }

          let permission = snapshot.permission
          if (permission === 'undetermined' || permission === 'denied') {
            permission = await requestPermission()
            if (permission !== 'granted') {
              commit({ ...snapshot, permission, fix: undefined }, cachedLocationRef.current)
              return
            }
          }

          if (snapshot.gps === 'disabled' && !(await enableServicesOrOpenSettings())) return

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
    [commit, refresh],
  )

  useEffect(() => {
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

  const status = evaluateLocation(currentSnapshot(view.snapshot, connectivity))

  return {
    status,
    coordinates: view.coordinates,
    isRefreshing,
    refresh,
    runAction,
  }
}
