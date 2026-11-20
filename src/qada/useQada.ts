import { qadaRemaining } from './logic'
import type { QadaPrayerId } from './logic'
import { useSQLiteContext } from 'expo-sqlite'
import { useCallback, useMemo } from 'react'

import { useLiveRepositoryQuery } from '../shell/useLiveRepositoryQuery'
import { createQadaRepository, restoreQadaPrayer } from './db'

export function useQada() {
  const database = useSQLiteContext()
  const repository = useMemo(() => createQadaRepository(database), [database])
  const read = useCallback(() => repository.listQadaEvents(), [repository])
  const { data: events = [], isLoading, refresh } = useLiveRepositoryQuery(read)

  const addDebt = useCallback(
    async (days: number) => {
      const result = await repository.addQadaDebt(days, Date.now())
      if (result.ok) refresh()
      return result.ok
    },
    [refresh, repository],
  )

  const payPrayer = useCallback(
    async (prayerId: QadaPrayerId) => {
      const result = await repository.payQadaPrayer(prayerId, Date.now())
      if (result.ok) refresh()
      return result.ok
    },
    [refresh, repository],
  )

  const undoPrayer = useCallback(
    async (prayerId: QadaPrayerId) => {
      const result = await restoreQadaPrayer(database, prayerId, Date.now())
      if (result.ok) refresh()
      return result.ok
    },
    [database, refresh],
  )

  return {
    isLoading,
    hasAny: events.length > 0,
    remaining: qadaRemaining(events),
    addDebt,
    payPrayer,
    undoPrayer,
  }
}
