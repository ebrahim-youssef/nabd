'use client'

import { useCallback } from 'react'

import { now } from '@/lib/impure/clock'
import type { DayId } from '@/types/wird'

import { appendEntry } from '../db'

// Toggles one checklist item by appending a new state event (append-only, ADR-0006 §3). No
// in-flight guard: appends are independent and cheap, and latest-wins resolution makes rapid or
// repeated taps converge correctly. The live query re-renders the row from Dexie.
export function useToggleItem() {
  const toggle = useCallback(
    (day: DayId, versionId: string, itemId: string, nextDone: boolean) =>
      appendEntry(day, versionId, itemId, nextDone, now()),
    [],
  )

  return { toggle }
}
