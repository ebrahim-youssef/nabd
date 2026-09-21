import { useEffect, useState } from 'react'
import NetInfo from '@react-native-community/netinfo'

import type { ConnectivityState } from './types'

export type ConnectivitySource = {
  onLine?: boolean
  addEventListener?: (name: 'online' | 'offline', listener: () => void) => void
  removeEventListener?: (name: 'online' | 'offline', listener: () => void) => void
}

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

function mapNetInfoState(state: NetInfoStateLike): ConnectivityState {
  if (state.isConnected === false) return 'offline'
  if (state.isConnected === true && state.isInternetReachable != null) {
    return state.isInternetReachable ? 'online' : 'offline'
  }
  if (state.isConnected === true) return 'online'
  return 'unknown'
}

function runtimeSource(): ConnectivitySource {
  return typeof navigator === 'undefined' ? {} : (navigator as unknown as ConnectivitySource)
}

export function createConnectivityProvider(source: ConnectivitySource = runtimeSource()): ConnectivityProvider {
  const getState = (): ConnectivityState =>
    typeof source.onLine === 'boolean' ? (source.onLine ? 'online' : 'offline') : 'unknown'

  return {
    getState,
    async refresh() {
      return getState()
    },
    subscribe(listener) {
      const notify = () => listener(getState())
      source.addEventListener?.('online', notify)
      source.addEventListener?.('offline', notify)
      return () => {
        source.removeEventListener?.('online', notify)
        source.removeEventListener?.('offline', notify)
      }
    },
  }
}

export function createNetInfoConnectivityProvider(netInfo: NetInfoLike = NetInfo): ConnectivityProvider {
  let current: ConnectivityState = 'unknown'
  const refresh = async () => {
    try {
      current = mapNetInfoState(await netInfo.fetch())
    } catch {
      current = 'unknown'
    }
    return current
  }

  void refresh()
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

export function useConnectivityState(provider: ConnectivityProvider): ConnectivityState {
  const [state, setState] = useState(provider.getState)
  useEffect(() => {
    let active = true
    const unsubscribe = provider.subscribe(setState)
    void provider.refresh().then((next) => {
      if (active) setState(next)
    })
    return () => {
      active = false
      unsubscribe()
    }
  }, [provider])
  return state
}
