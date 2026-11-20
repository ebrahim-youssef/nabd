import { useCallback, useLayoutEffect, useRef } from 'react'

import type { DayPlanItem } from '../day-plan/types'

export function useChecklistCallbacks<T extends string>(
  onToggle: (item: DayPlanItem, group: T | null) => void,
) {
  const onToggleRef = useRef(onToggle)
  useLayoutEffect(() => {
    onToggleRef.current = onToggle
  }, [onToggle])
  const rows = useRef(new Map<string, { item: DayPlanItem; press: () => void }>())

  return useCallback((item: DayPlanItem, group: T | null = null) => {
    const key = `${group ?? ''}:${item.id}`
    let row = rows.current.get(key)
    if (!row) {
      row = { item, press: () => onToggleRef.current(rows.current.get(key)!.item, group) }
      rows.current.set(key, row)
    }
    row.item = item
    return row.press
  }, [])
}
