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

// Per-item history (NBD-47) — derived purely from the versioned append-only entries. A day
// only counts while the item was actually in the wird and due, so dropping then re-adding an
// item bridges its streak (absent days are neither hits nor misses). Voluntary deeds report
// attainment instead of misses (ADR-0008): a skipped voluntary day is never a failure.
export type ItemStat = {
  itemId: string
  label: string
  optional: boolean
  // Days the item was due (required) or present (voluntary), ≤ today; an unfinished today is
  // held out (grace) so it neither breaks a streak nor counts as a miss yet.
  activeDays: number
  doneDays: number
  // Required only (always 0 for voluntary deeds).
  missedDays: number
  // doneDays / activeDays, 0..1 (0 when there were no active days).
  consistency: number
  // Consecutive done days ending at the most recent active day, bridging absences.
  currentStreak: number
  longestStreak: number
  // Required only: consecutive missed days most recently.
  currentMissStreak: number
  // Voluntary target-day deeds (e.g. صيام الإثنين/الخميس): target days done vs elapsed.
  attainment: { done: number; window: number } | null
}
