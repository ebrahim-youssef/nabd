import { qadaRemaining } from '@nabd/shared'
import type { QadaPrayerId } from '@nabd/shared'
import { useSQLiteContext } from 'expo-sqlite'
import { useCallback, useMemo } from 'react'

import { useLiveRepositoryQuery } from '../app/useLiveRepositoryQuery'
import { createQadaRepository } from './db'

export function useQada() {
  const database = useSQLiteContext()
  const repository = useMemo(() => createQadaRepository(database), [database])
  const read = useCallback(() => repository.listQadaEvents(), [repository])
  const { data: events = [], isLoading, refresh } = useLiveRepositoryQuery(read)

  const addDebt = useCallback(
    async (days: number) => {
      await repository.addQadaDebt(days, Date.now())
      refresh()
    },
    [refresh, repository],
  )

  const payPrayer = useCallback(
    async (prayerId: QadaPrayerId) => {
      await repository.payQadaPrayer(prayerId, Date.now())
      refresh()
    },
    [refresh, repository],
  )

  const remaining = qadaRemaining(events)
  return {
    isLoading,
    hasAny: events.length > 0,
    remaining,
    addDebt,
    payPrayer,
  }
}
