import { useCallback, useEffect, useRef, useState } from 'react'
import { useFocusEffect } from 'expo-router'

import { logger } from '../observability/logger'

type LiveRepositoryQueryState<T> = {
  data: T | undefined
  isLoading: boolean
  hasError: boolean
  refresh: () => void
}

const liveRepositoryRefreshers = new Set<() => void>()

export function refreshLiveRepositoryQueries(): void {
  for (const refresh of [...liveRepositoryRefreshers]) refresh()
}

export function useLiveRepositoryQuery<T>(read: () => Promise<T>): LiveRepositoryQueryState<T> {
  const [data, setData] = useState<T>()
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
      setData(undefined)
      setIsLoading(true)
      setHasError(false)
    }
    void Promise.resolve()
      .then(read)
      .then((nextData) => {
        if (!active) return
        dataRef.current = nextData
        cachedReadRef.current = read
        setData(nextData)
        setIsLoading(false)
        setHasError(false)
      })
      .catch((cause: unknown) => {
        logger.error('Native repository query failed', cause)
        if (!active) return
        if (dataRef.current === undefined) setData(undefined)
        setIsLoading(false)
        setHasError(true)
      })

    return () => {
      active = false
    }
  }, [read, refreshToken])

  return { data, isLoading, hasError, refresh }
}
