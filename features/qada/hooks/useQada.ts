'use client'

import { useLiveQuery } from 'dexie-react-hooks'
import { useCallback } from 'react'

import { now } from '@/lib/impure/clock'

import { addQadaDebt, listQadaEvents, payQadaPrayer } from '../db'
import { qadaRemaining, type QadaPrayerId } from '../logic'

// Live qada ledger (ADR-0010): remaining debt per prayer from Dexie, plus the two actions.
export function useQada() {
  const events = useLiveQuery(listQadaEvents, [])

  const addDebt = useCallback(async (days: number) => {
    await addQadaDebt(days, now())
  }, [])

  const payPrayer = useCallback(async (prayerId: QadaPrayerId) => {
    await payQadaPrayer(prayerId, now())
  }, [])

  return {
    isLoading: events === undefined,
    hasAny: (events?.length ?? 0) > 0,
    remaining: qadaRemaining(events ?? []),
    addDebt,
    payPrayer,
  }
}
