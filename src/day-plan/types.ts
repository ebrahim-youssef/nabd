import type { DayPrayerTimes } from '../prayer-times/logic'
import type { DayId, WirdDefinition, WirdEntry, WirdItemKind } from '../wird/types'

export type DayPlanInput = {
  now: number
  day: DayId
  times: DayPrayerTimes | null
  nextFajr: number | null
  definition: WirdDefinition
  entries: WirdEntry[]
  monthEntries?: WirdEntry[]
}

export type DayPlanWindow = { start: number; end: number }

export type DayPlanItem = {
  id: string
  label: string
  done: boolean
  optional: boolean
  kind: WirdItemKind
  target?: number
}

export type DayPlanBlock = {
  id: PrayerId
  label: string
  window: DayPlanWindow | null
  items: DayPlanItem[]
  isCurrent: boolean
}

export type DayPlanTimedAct = {
  id: TimedActId
  label: string
  window: DayPlanWindow | null
  items: DayPlanItem[]
}

export type PrayerId = 'fajr' | 'dhuhr' | 'asr' | 'maghrib' | 'isha'
export type TimedActId = 'morning-adhkar' | 'duha' | 'evening-adhkar' | 'qiyam'

export type DayPlanMarker = { id: string; label: string; at: number }

export type DayPlanHeader = {
  mode: 'day' | 'night'
  position: number
  markers: DayPlanMarker[]
  nextEvent: DayPlanMarker | null
  countdownTarget: number | null
}

export type MonthlyGoalRow = {
  item: DayPlanItem
  progress: { done: number; target: number }
}

export type DayPlan = {
  day: DayId
  hasTimes: boolean
  blocks: DayPlanBlock[]
  currentBlock: DayPlanBlock | null
  nextBlock: DayPlanBlock | null
  timedActs: DayPlanTimedAct[]
  openTimedActs: DayPlanTimedAct[]
  unrecorded: DayPlanItem[]
  anyTime: DayPlanItem[]
  anyTimeProgress: { done: number; total: number }
  monthly: MonthlyGoalRow[]
  progress: { done: number; required: number }
  header: DayPlanHeader | null
}

export type DailyLines = {
  intention: { deed: string; text: string }
  dhikr: { text: string }
}
