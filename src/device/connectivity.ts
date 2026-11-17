import { useCallback, useEffect, useRef, useState } from 'react'
import NetInfo from '@react-native-community/netinfo'

import { logger } from '../observability/logger'
import type { ConnectivityState } from './types'

export type ConnectivityProvider = {
  getState: () => ConnectivityState
  refresh: () => Promise<ConnectivityState>
  subscribe: (listener: (state: ConnectivityState) => void) => () => void
}

export type NetInfoStateLike = {
  isConnected: boolean | null
  isInternetReachable?: boolean | null
}

export type NetInfoLike = {
  fetch: () => Promise<NetInfoStateLike>
  addEventListener: (listener: (state: NetInfoStateLike) => void) => () => void
}

export function mapNetInfoState(state: NetInfoStateLike): ConnectivityState {
  if (state.isConnected === false) return 'offline'
  if (state.isConnected === true && state.isInternetReachable === false) return 'offline'
  if (state.isConnected === true) return 'online'
  return 'unknown'
}

export function createNetInfoConnectivityProvider(
  netInfo: NetInfoLike = NetInfo,
): ConnectivityProvider {
  let current: ConnectivityState = 'unknown'
  const refresh = async (): Promise<ConnectivityState> => {
    try {
      current = mapNetInfoState(await netInfo.fetch())
    } catch (cause: unknown) {
      current = 'unknown'
      logger.warn('Native connectivity refresh failed', { error: cause })
    }
    return current
  }

  return {
    getState: () => current,
    refresh,
    subscribe(listener) {
      const unsubscribe = netInfo.addEventListener((next) => {
        current = mapNetInfoState(next)
        listener(current)
      })
      return unsubscribe
    },
  }
}

export function useConnectivityState(provider: ConnectivityProvider): {
  state: ConnectivityState
  refreshAndSet: () => Promise<ConnectivityState>
} {
  const [state, setState] = useState(provider.getState)
  const mountedRef = useRef(false)
  const refreshPromiseRef = useRef<Promise<ConnectivityState> | null>(null)
  const refreshAndSet = useCallback(() => {
    const activeRefresh = refreshPromiseRef.current
    if (activeRefresh) return activeRefresh

    let operation: Promise<ConnectivityState>
    operation = provider
      .refresh()
      .then((next) => {
        if (mountedRef.current) setState(next)
        return next
      })
      .finally(() => {
        if (refreshPromiseRef.current === operation) refreshPromiseRef.current = null
      })
    refreshPromiseRef.current = operation
    return operation
  }, [provider])

  useEffect(() => {
    mountedRef.current = true
    return () => {
      mountedRef.current = false
    }
  }, [])

  useEffect(() => {
    const unsubscribe = provider.subscribe(setState)
    void refreshAndSet()
    return unsubscribe
  }, [provider, refreshAndSet])

  return { state, refreshAndSet }
}
