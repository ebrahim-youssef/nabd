'use client'

import { useCallback, useEffect, useRef, useState } from 'react'

import { syncNow } from '../db'

// How often to run a background sync while the app is open.
const SYNC_INTERVAL_MS = 30_000

// Drives syncing from the client: once on mount, whenever the browser comes back online, and on
// a slow interval. Also returns `sync` so callers can trigger one immediately after a local
// write. The `inFlight` ref prevents overlapping runs; `syncNow` itself no-ops when signed out.
export function useSync() {
  const [isSyncing, setIsSyncing] = useState(false)
  const inFlight = useRef(false)

  const sync = useCallback(async () => {
    if (inFlight.current) return
    if (typeof navigator !== 'undefined' && !navigator.onLine) return
    inFlight.current = true
    setIsSyncing(true)
    try {
      await syncNow()
    } finally {
      inFlight.current = false
      setIsSyncing(false)
    }
  }, [])

  useEffect(() => {
    // Defer the initial sync a tick so it doesn't set state synchronously inside the effect.
    const kickoffId = window.setTimeout(() => void sync(), 0)
    const onOnline = () => void sync()
    window.addEventListener('online', onOnline)
    const intervalId = window.setInterval(() => void sync(), SYNC_INTERVAL_MS)
    return () => {
      window.clearTimeout(kickoffId)
      window.removeEventListener('online', onOnline)
      window.clearInterval(intervalId)
    }
  }, [sync])

  return { sync, isSyncing }
}
