import type { WirdItemKind } from '@/types/wird'

// View shapes the checklist UI renders — the wird definition resolved against a day's entries
// into concrete done/not-done items, grouped by area in display order.

export type ChecklistItemView = {
  id: string
  label: string
  kind: WirdItemKind
  target?: number
  done: boolean
}

export type ChecklistAreaView = {
  id: string
  label: string
  order: number
  items: ChecklistItemView[]
}

// Today's done/remaining rollup across the whole checklist.
export type TodaySummary = {
  total: number
  done: number
  remaining: number
}
