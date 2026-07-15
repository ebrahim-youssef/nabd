import type { WirdItemKind } from '@/types/wird'

// View shapes the checklist UI renders — the wird definition resolved against a day's entries
// into concrete done/not-done items, grouped by area in display order.

export type ChecklistItemView = {
  id: string
  label: string
  kind: WirdItemKind
  target?: number
  done: boolean
  // ADR-0008: تطوّع — excluded from required counts; rendered with its own affordance.
  optional?: boolean
  // ADR-0008: display-only minimum note.
  minimum?: string
  // ADR-0008: month progress for a monthly-goal item (done-days vs target).
  monthlyProgress?: { done: number; target: number }
}

export type ChecklistAreaView = {
  id: string
  label: string
  order: number
  items: ChecklistItemView[]
}

// Today's rollup: required done/remaining drive the ring; voluntary (تطوّع) is tallied
// separately and never reads as failure (ADR-0008).
export type TodaySummary = {
  total: number
  done: number
  remaining: number
  voluntary: { total: number; done: number }
}
