import type { DayId } from '@nabd/shared'
import { createContext, useContext, useMemo } from 'react'
import type { ReactNode } from 'react'

import { useWirdChecklist } from './useWirdChecklist'

export type WirdDayState = ReturnType<typeof useWirdChecklist> & { day: DayId }

const WirdDayContext = createContext<WirdDayState | null>(null)

export function WirdDayProvider({ day, children }: { day: DayId; children: ReactNode }) {
  const checklist = useWirdChecklist(day)
  const value = useMemo(() => ({ day, ...checklist }), [checklist, day])

  return <WirdDayContext.Provider value={value}>{children}</WirdDayContext.Provider>
}

export function useWirdDay(): WirdDayState {
  const value = useContext(WirdDayContext)
  if (!value) throw new Error('useWirdDay must be used within WirdDayProvider')
  return value
}
