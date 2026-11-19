import { useSQLiteContext } from 'expo-sqlite'
import { useCallback, useEffect, useMemo } from 'react'
import { AppState } from 'react-native'

import { createWirdRepository } from '../wird/db'
import { refreshLiveRepositoryQueries } from '../shell/useLiveRepositoryQuery'
import {
  acknowledgePendingPrayerActions,
  readPendingPrayerActions,
  subscribePrayerActionQueued,
} from './prayerActions'
import { drainPrayerActions } from './prayerActionDrain'

export function PrayerActionDrainBootstrap(): null {
  const database = useSQLiteContext()
  const repository = useMemo(() => createWirdRepository(database), [database])
  const dependencies = useMemo(
    () => ({
      queue: {
        read: readPendingPrayerActions,
        acknowledge: acknowledgePendingPrayerActions,
      },
      repository,
      refreshViews: refreshLiveRepositoryQueries,
    }),
    [repository],
  )
  const drain = useCallback(() => {
    void drainPrayerActions(dependencies)
  }, [dependencies])

  useEffect(() => {
    drain()
    const appStateSubscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') drain()
    })
    const unsubscribeNativeEvent = subscribePrayerActionQueued(drain)
    return () => {
      appStateSubscription.remove()
      unsubscribeNativeEvent()
    }
  }, [drain])

  return null
}
