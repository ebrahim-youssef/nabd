import { qadaRemaining } from '@nabd/shared'
import type { QadaPrayerId } from '@nabd/shared'
import { useLiveQuery } from 'dexie-react-hooks'
import { useCallback } from 'react'

import { addQadaDebt, listQadaEvents, payQadaPrayer } from './db'

// Live qada ledger (ADR-0010): remaining debt per prayer folded from Dexie, plus the two actions.
export function useQada() {
  const events = useLiveQuery(listQadaEvents, [])

  const addDebt = useCallback(async (days: number) => {
    await addQadaDebt(days, Date.now())
  }, [])

  const payPrayer = useCallback(async (prayerId: QadaPrayerId) => {
    await payQadaPrayer(prayerId, Date.now())
  }, [])

  return {
    isLoading: events === undefined,
    hasAny: (events?.length ?? 0) > 0,
    remaining: qadaRemaining(events ?? []),
    addDebt,
    payPrayer,
  }
}
