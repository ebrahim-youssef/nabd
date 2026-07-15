import type { DayId } from '@/types/wird'

// Completion of one day: how many of that day's wird items were done, out of the total the
// version in force that day defined.
export type DayCompletion = {
  day: DayId
  total: number
  done: number
}

// Per-area breakdown for a day (the drill-down).
export type AreaStat = {
  areaId: string
  label: string
  total: number
  done: number
}

// Aggregate across a range of days.
export type RangeSummary = {
  days: number
  total: number
  done: number
  // Days that were fully completed (done === total, total > 0).
  completedDays: number
}
