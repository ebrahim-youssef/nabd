import { useCallback, useEffect, useState } from 'react'

import { captureException } from '../observability/sentry'

type LiveRepositoryQueryState<T> = {
  data: T | undefined
  isLoading: boolean
  refresh: () => void
}

export function useLiveRepositoryQuery<T>(read: () => Promise<T>): LiveRepositoryQueryState<T> {
  const [data, setData] = useState<T>()
  const [isLoading, setIsLoading] = useState(true)
  const [refreshToken, setRefreshToken] = useState(0)

  const refresh = useCallback(() => {
    setIsLoading(true)
    setRefreshToken((current) => current + 1)
  }, [])

  useEffect(() => {
    let active = true
    void Promise.resolve()
      .then(read)
      .then((nextData) => {
        if (!active) return
        setData(nextData)
        setIsLoading(false)
      })
      .catch((cause: unknown) => {
        captureException(cause)
        if (!active) return
        setData(undefined)
        setIsLoading(false)
      })

    return () => {
      active = false
    }
  }, [read, refreshToken])

  return { data, isLoading, refresh }
}
