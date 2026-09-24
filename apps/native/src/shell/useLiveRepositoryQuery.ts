import { useCallback, useEffect, useRef, useState } from 'react'
import { useFocusEffect } from 'expo-router'

import { logger } from '../observability/logger'

type LiveRepositoryQueryState<T> = {
  data: T | undefined
  isLoading: boolean
  refresh: () => void
}

export function useLiveRepositoryQuery<T>(read: () => Promise<T>): LiveRepositoryQueryState<T> {
  const [data, setData] = useState<T>()
  const [isLoading, setIsLoading] = useState(true)
  const [refreshToken, setRefreshToken] = useState(0)
  const dataRef = useRef<T | undefined>(undefined)
  const hasFocused = useRef(false)

  const refresh = useCallback(() => {
    if (dataRef.current === undefined) setIsLoading(true)
    setRefreshToken((current) => current + 1)
  }, [])

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
    void Promise.resolve()
      .then(read)
      .then((nextData) => {
        if (!active) return
        dataRef.current = nextData
        setData(nextData)
        setIsLoading(false)
      })
      .catch((cause: unknown) => {
        logger.error('Native repository query failed', cause)
        if (!active) return
        if (dataRef.current === undefined) setData(undefined)
        setIsLoading(false)
      })

    return () => {
      active = false
    }
  }, [read, refreshToken])

  return { data, isLoading, refresh }
}
