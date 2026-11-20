import { useSQLiteContext } from 'expo-sqlite'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { AppState } from 'react-native'

import { logger } from '../observability/logger'
import { createNetInfoConnectivityProvider, useConnectivityState } from './connectivity'
import type { ConnectivityProvider } from './connectivity'
import { createDeviceRepository } from './db'
import type { CachedLocation } from './db'
import { evaluateLocation } from './logic'
import { devicePlatform } from './platform'
import { requestPrayerReschedule } from './prayerAlarms'
import { getFix, readPermission, requestPermission, servicesEnabled } from './location'
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
  permission: LocationPermission
  status: LocationStatus
  coordinates: { latitude: number; longitude: number } | null
  hasReadCache: boolean
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
  hasReadCache: boolean
  isRefreshing: boolean
}

type LocationViewListener = (
  view: LocationCapabilityViewState,
  cached: CachedLocation | null,
) => void

type RefreshOperation = (force: boolean) => Promise<void>

const locationViewListeners = new Set<LocationViewListener>()
let sharedRefreshPromise: Promise<void> | null = null
let sharedRefreshIsForced = false
let forcedRefreshQueued = false
let hasUnforcedRefreshQueued = false

const INITIAL_VIEW: LocationCapabilityViewState = {
  snapshot: INITIAL_SNAPSHOT,
  coordinates: null,
  hasReadCache: false,
  isRefreshing: true,
}

let publishedLocationView = INITIAL_VIEW
let publishedCachedLocation: CachedLocation | null = null

export function __resetLocationViewForTests() {
  publishedLocationView = INITIAL_VIEW
  publishedCachedLocation = null
}

function subscribeLocationView(listener: LocationViewListener): () => void {
  locationViewListeners.add(listener)
  listener(publishedLocationView, publishedCachedLocation)
  return () => locationViewListeners.delete(listener)
}

function publishLocationView(view: LocationCapabilityViewState, cached: CachedLocation | null) {
  const cacheWasRead = publishedLocationView.hasReadCache
  const cacheReadWasDowngraded = cacheWasRead && !view.hasReadCache
  const nextView = cacheReadWasDowngraded
    ? { ...publishedLocationView, isRefreshing: view.isRefreshing }
    : view
  const nextCached = cacheReadWasDowngraded ? publishedCachedLocation : cached
  publishedLocationView = nextView
  publishedCachedLocation = nextCached
  for (const listener of locationViewListeners) listener(nextView, nextCached)
}

function refreshAcrossInstances(force: boolean, performRefresh: RefreshOperation): Promise<void> {
  if (sharedRefreshPromise) {
    if (force && !sharedRefreshIsForced) forcedRefreshQueued = true
    if (!force) hasUnforcedRefreshQueued = true
    return sharedRefreshPromise
  }

  let operation: Promise<void>
  const drain = async (): Promise<void> => {
    let nextForce = force
    try {
      while (true) {
        sharedRefreshIsForced = nextForce
        forcedRefreshQueued = false
        hasUnforcedRefreshQueued = false
        await performRefresh(nextForce)
        if (forcedRefreshQueued) {
          nextForce = true
          continue
        }
        if (hasUnforcedRefreshQueued) {
          nextForce = false
          continue
        }
        return
      }
    } finally {
      if (sharedRefreshPromise === operation) {
        sharedRefreshPromise = null
        sharedRefreshIsForced = false
        forcedRefreshQueued = false
        hasUnforcedRefreshQueued = false
      }
    }
  }

  operation = drain()
  sharedRefreshPromise = operation
  return operation
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
  const enabled = await devicePlatform.enableLocationServices()
  if (enabled !== true) await devicePlatform.openLocationSettings()
  return enabled === true
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

  const [view, setView] = useState<LocationCapabilityViewState>(publishedLocationView)
  const mountedRef = useRef(false)
  const viewRef = useRef<LocationCapabilityViewState>(publishedLocationView)
  const cachedLocationRef = useRef<CachedLocation | null>(publishedCachedLocation)
  const connectivityRef = useRef(connectivity)
  const actionPromiseRef = useRef<Promise<void> | null>(null)

  const commit = useCallback(
    (
      snapshot: LocationCapabilitySnapshot,
      cached: CachedLocation | null,
      hasReadCache = viewRef.current.hasReadCache,
    ) => {
      const next: LocationCapabilityViewState = {
        snapshot,
        coordinates: coordinatesFrom(cached),
        hasReadCache,
        isRefreshing: viewRef.current.isRefreshing,
      }
      cachedLocationRef.current = cached
      viewRef.current = next
      if (mountedRef.current) setView(next)
      publishLocationView(next, cached)
    },
    [],
  )

  const receiveLocationView = useCallback(
    (next: LocationCapabilityViewState, cached: CachedLocation | null) => {
      cachedLocationRef.current = cached
      viewRef.current = next
      if (mountedRef.current) setView(next)
    },
    [],
  )

  const setRefreshing = useCallback((value: boolean) => {
    const next = { ...viewRef.current, isRefreshing: value }
    viewRef.current = next
    if (mountedRef.current) setView(next)
    publishLocationView(next, cachedLocationRef.current)
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
        cached = cacheState
        commit(
          makeSnapshot(permission, 'unknown', cacheState, cacheFresh, connectivityRef.current),
          cacheState,
          true,
        )
        const currentConnectivity = await refreshAndSet()
        connectivityRef.current = currentConnectivity
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
          true,
        )
      } finally {
        setRefreshing(false)
      }
    },
    [commit, now, refreshAndSet, repository, setRefreshing],
  )

  const refresh = useCallback(
    ({ force = false }: LocationRefreshOptions = {}): Promise<void> => {
      return refreshAcrossInstances(force, performRefresh)
    },
    [performRefresh],
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
            await devicePlatform.openAppSettings()
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
            await devicePlatform.openLocationSettings()
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

  useEffect(() => subscribeLocationView(receiveLocationView), [receiveLocationView])

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
    permission: view.snapshot.permission,
    status,
    coordinates: view.coordinates,
    hasReadCache: view.hasReadCache,
    isRefreshing: view.isRefreshing,
    refresh,
    runAction,
  }
}
