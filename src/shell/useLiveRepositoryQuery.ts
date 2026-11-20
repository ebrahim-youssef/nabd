import { useCallback, useEffect, useRef, useState } from 'react'
import { useFocusEffect } from 'expo-router'

import { logger } from '../observability/logger'
import { whenWritesIdle } from '../db/writeQueue'

type LiveRepositoryQueryState<T> = {
  data: T | undefined
  readSequence: number | undefined
  isLoading: boolean
  hasError: boolean
  refresh: () => void
}

const liveRepositoryRefreshers = new Set<() => void>()
let refreshScheduled = false
let readSequence = 0

export function getLiveRepositoryReadSequence(): number {
  return readSequence
}

export function refreshLiveRepositoryQueries(): void {
  if (refreshScheduled) return
  refreshScheduled = true
  setTimeout(() => {
    void whenWritesIdle().then(() => {
      refreshScheduled = false
      for (const refresh of [...liveRepositoryRefreshers]) refresh()
    })
  }, 0)
}

export function useLiveRepositoryQuery<T>(read: () => Promise<T>): LiveRepositoryQueryState<T> {
  const [snapshot, setSnapshot] = useState<{ data: T; readSequence: number }>()
  const data = snapshot?.data
  const [isLoading, setIsLoading] = useState(true)
  const [hasError, setHasError] = useState(false)
  const [refreshToken, setRefreshToken] = useState(0)
  const dataRef = useRef<T | undefined>(undefined)
  const cachedReadRef = useRef<(() => Promise<T>) | undefined>(undefined)
  const hasFocused = useRef(false)

  const refresh = useCallback(() => {
    if (dataRef.current === undefined) setIsLoading(true)
    setHasError(false)
    setRefreshToken((current) => current + 1)
  }, [])

  useEffect(() => {
    liveRepositoryRefreshers.add(refresh)
    return () => {
      liveRepositoryRefreshers.delete(refresh)
    }
  }, [refresh])

  // Expo tabs stay mounted while the user moves between them. Re-read on a
  // subsequent focus so a mounted tab reflects writes made by another tab.
  // The initial focus is covered by the initial query effect below.
  useFocusEffect(
    useCallback(() => {
      if (hasFocused.current) refresh()
      else hasFocused.current = true
      return undefined
    }, [refresh]),
  )

  useEffect(() => {
    let active = true
    if (cachedReadRef.current !== read) {
      dataRef.current = undefined
      cachedReadRef.current = undefined
      setSnapshot(undefined)
      setIsLoading(true)
      setHasError(false)
    }
    void Promise.resolve()
      .then(() => {
        const started = ++readSequence
        return read().then((nextData) => ({ nextData, started }))
      })
      .then(({ nextData, started }) => {
        if (!active) return
        dataRef.current = nextData
        cachedReadRef.current = read
        setSnapshot({ data: nextData, readSequence: started })
        setIsLoading(false)
        setHasError(false)
      })
      .catch((cause: unknown) => {
        logger.error('Native repository query failed', cause)
        if (!active) return
        if (dataRef.current === undefined) setSnapshot(undefined)
        setIsLoading(false)
        setHasError(true)
      })

    return () => {
      active = false
    }
  }, [read, refreshToken])

  return { data, readSequence: snapshot?.readSequence, isLoading, hasError, refresh }
}
