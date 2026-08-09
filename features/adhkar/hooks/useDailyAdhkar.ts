'use client'

import { useCallback } from 'react'

import { now, today } from '@/lib/impure/clock'

import { completeLinkedWirdItem } from '../db'

export function useDailyAdhkar() {
  const markItemDone = useCallback(async (itemId: string) => {
    return completeLinkedWirdItem(today(), itemId, now())
  }, [])

  return { markItemDone }
}
