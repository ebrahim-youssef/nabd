import { monthOf, previousDay, toDayId, weekdayOf } from '../lib/day'
import { isScheduledOn, latestStateByItem } from '../lib/wird'
import { monthlyDoneDays } from '../wird/logic'
import { INTENTIONS_LIBRARY } from '../content/intentions'
import { GENERAL_ADHKAR } from '../content/general-adhkar'
import type { DayPrayerTimes } from '../prayer-times/logic'
import type { DayId, WirdDefinition, WirdEntry, WirdItem } from '../wird/types'
import { DAY_MARKER_LABELS, FRIDAY_DHUHR_LABEL, PRAYER_LABELS, TIMED_ACT_LABELS } from './copy'
import type {
  DailyLines,
  DayPlan,
  DayPlanHeader,
  DayPlanInput,
  DayPlanItem,
  DayPlanMarker,
  DayPlanTimedAct,
  DayPlanWindow,
  PrayerId,
  TimedActId,
} from './types'

const MILLISECONDS_PER_MINUTE = 60_000
const MILLISECONDS_PER_DAY = 86_400_000

export const DUHA_START_AFTER_SUNRISE_MS = 15 * MILLISECONDS_PER_MINUTE
export const DUHA_END_BEFORE_DHUHR_MS = 10 * MILLISECONDS_PER_MINUTE

const PRAYER_IDS: PrayerId[] = ['fajr', 'dhuhr', 'asr', 'maghrib', 'isha']
const TIMED_ACT_IDS: TimedActId[] = ['morning-adhkar', 'duha', 'evening-adhkar', 'qiyam']

export function isUsableDayTimes(times: DayPrayerTimes | null): times is DayPrayerTimes {
  if (!times) return false
  const values = [times.fajr, times.sunrise, times.dhuhr, times.asr, times.maghrib, times.isha]
  return (
    values.every(Number.isFinite) &&
    values.every((value, index) => index === 0 || values[index - 1] < value)
  )
}

export function resolveWirdDay(now: number, calendarDayTimes: DayPrayerTimes | null): DayId {
  const calendarDay = toDayId(new Date(now))
  if (!isUsableDayTimes(calendarDayTimes) || now >= calendarDayTimes.fajr) return calendarDay
  return previousDay(calendarDay)
}

export function nightTimings(
  maghrib: number,
  nextFajr: number,
): {
  middleOfNight: number
  lastThird: number
} {
  const span = nextFajr - maghrib
  return {
    middleOfNight: Math.round(maghrib + span / 2),
    lastThird: Math.round(maghrib + (2 * span) / 3),
  }
}

function itemView(item: WirdItem, states: Map<string, boolean>, label = item.label): DayPlanItem {
  return {
    id: item.id,
    label,
    done: states.get(item.id) ?? false,
    optional: item.optional ?? false,
    kind: item.kind,
    target: item.target,
    ...(item.minimum === undefined ? {} : { minimum: item.minimum }),
  }
}

function prayerForItem(itemId: string): PrayerId | null {
  for (const prayer of PRAYER_IDS) {
    if (
      itemId === prayer ||
      itemId === `rawatib-${prayer}-before` ||
      itemId === `prayer-adhkar-${prayer}` ||
      itemId === `rawatib-${prayer}-after` ||
      itemId === `ghair-rawatib-${prayer}`
    )
      return prayer
  }
  return null
}

function itemWindow(id: PrayerId, times: DayPrayerTimes, nextFajr: number): DayPlanWindow {
  const starts: Record<PrayerId, number> = {
    fajr: times.fajr,
    dhuhr: times.dhuhr,
    asr: times.asr,
    maghrib: times.maghrib,
    isha: times.isha,
  }
  const ends: Record<PrayerId, number> = {
    fajr: times.sunrise,
    dhuhr: times.asr,
    asr: times.maghrib,
    maghrib: times.isha,
    isha: nextFajr,
  }
  return { start: starts[id], end: ends[id] }
}

function timedWindow(id: TimedActId, times: DayPrayerTimes, nextFajr: number): DayPlanWindow {
  const windows: Record<TimedActId, DayPlanWindow> = {
    'morning-adhkar': { start: times.fajr, end: times.asr },
    duha: {
      start: times.sunrise + DUHA_START_AFTER_SUNRISE_MS,
      end: times.dhuhr - DUHA_END_BEFORE_DHUHR_MS,
    },
    'evening-adhkar': { start: times.asr, end: nextFajr },
    qiyam: { start: times.isha, end: nextFajr },
  }
  return windows[id]
}

type PlanWindows = {
  times: DayPrayerTimes
  nextFajr: number
  prayers: Record<PrayerId, DayPlanWindow>
  timedActs: Record<TimedActId, DayPlanWindow>
}

type PlacedDayItems = Pick<
  DayPlan,
  'blocks' | 'timedActs' | 'anyTime' | 'anyTimeProgress' | 'monthly' | 'progress'
>

function planWindows(times: DayPrayerTimes | null, nextFajr: number | null): PlanWindows | null {
  if (
    !isUsableDayTimes(times) ||
    nextFajr === null ||
    !Number.isFinite(nextFajr) ||
    nextFajr <= times.maghrib
  )
    return null
  return {
    times,
    nextFajr,
    prayers: Object.fromEntries(
      PRAYER_IDS.map((id) => [id, itemWindow(id, times, nextFajr)]),
    ) as Record<PrayerId, DayPlanWindow>,
    timedActs: Object.fromEntries(
      TIMED_ACT_IDS.map((id) => [id, timedWindow(id, times, nextFajr)]),
    ) as Record<TimedActId, DayPlanWindow>,
  }
}

function placeDayItems(
  day: DayId,
  definition: WirdDefinition,
  entries: WirdEntry[],
  monthEntries: WirdEntry[],
  windows: PlanWindows | null,
  isFriday: boolean,
): PlacedDayItems {
  const scheduledItems = definition.items.filter((item) => isScheduledOn(item, day))
  const states = latestStateByItem(entries.filter((entry) => entry.day === day))
  const byPrayer = new Map<PrayerId, WirdItem[]>(
    PRAYER_IDS.map((id): [PrayerId, WirdItem[]] => [id, []]),
  )
  const byTimedAct = new Map<TimedActId, WirdItem[]>(
    TIMED_ACT_IDS.map((id): [TimedActId, WirdItem[]] => [id, []]),
  )
  const anyTimeItems: WirdItem[] = []
  const monthlyItems: WirdItem[] = []
  for (const item of scheduledItems) {
    if (item.schedule?.type === 'monthly-goal') {
      monthlyItems.push(item)
      continue
    }
    const prayer = prayerForItem(item.id)
    if (prayer) {
      byPrayer.get(prayer)?.push(item)
      continue
    }
    const timedActId = TIMED_ACT_IDS.find((id) => id === item.id)
    if (timedActId) {
      byTimedAct.get(timedActId)?.push(item)
      continue
    }
    anyTimeItems.push(item)
  }

  const blocks = PRAYER_IDS.map((id) => {
    const items = (byPrayer.get(id) ?? [])
      .sort((a, b) => {
        const aIsGhair = a.id === `ghair-rawatib-${id}`
        const bIsGhair = b.id === `ghair-rawatib-${id}`
        return aIsGhair === bIsGhair
          ? definition.items.indexOf(a) - definition.items.indexOf(b)
          : aIsGhair
            ? -1
            : 1
      })
      .map((item) =>
        itemView(
          item,
          states,
          isFriday && id === 'dhuhr' && item.id === 'dhuhr' ? FRIDAY_DHUHR_LABEL : item.label,
        ),
      )
    return {
      id,
      label: isFriday && id === 'dhuhr' ? FRIDAY_DHUHR_LABEL : PRAYER_LABELS[id],
      window: windows?.prayers[id] ?? null,
      items,
      isCurrent: false,
    }
  })
  const timedActs = TIMED_ACT_IDS.map((id) => ({
    id,
    label: TIMED_ACT_LABELS[id],
    window: windows?.timedActs[id] ?? null,
    items: (byTimedAct.get(id) ?? []).map((item) => itemView(item, states)),
  }))
  const anyTime = anyTimeItems.map((item) => itemView(item, states))
  const monthly = monthlyItems.map((item) => ({
    item: itemView(item, states),
    progress: {
      done: monthlyDoneDays(monthEntries, item.id, monthOf(day)),
      target: item.schedule?.type === 'monthly-goal' ? item.schedule.target : 0,
    },
  }))
  const requiredItems = [
    ...blocks.flatMap(({ items }) => items),
    ...timedActs.flatMap(({ items }) => items),
    ...anyTime,
    ...monthly.map(({ item }) => item),
  ].filter((item) => !item.optional)

  return {
    blocks,
    timedActs,
    anyTime,
    anyTimeProgress: { done: anyTime.filter(({ done }) => done).length, total: anyTime.length },
    monthly,
    progress: {
      done: requiredItems.filter(({ done }) => done).length,
      required: requiredItems.length,
    },
  }
}

function contains(window: DayPlanWindow | null, now: number): boolean {
  return window !== null && window.start <= now && now < window.end
}

function dayHeader(now: number, times: DayPrayerTimes, nextFajr: number): DayPlanHeader {
  const night = nightTimings(times.maghrib, nextFajr)
  const dayMarkers: DayPlanMarker[] = [
    { id: 'fajr', label: DAY_MARKER_LABELS.fajr, at: times.fajr },
    { id: 'sunrise', label: DAY_MARKER_LABELS.sunrise, at: times.sunrise },
    { id: 'dhuhr', label: DAY_MARKER_LABELS.dhuhr, at: times.dhuhr },
    { id: 'asr', label: DAY_MARKER_LABELS.asr, at: times.asr },
    { id: 'maghrib', label: DAY_MARKER_LABELS.maghrib, at: times.maghrib },
  ]
  const nightMarkers: DayPlanMarker[] = [
    { id: 'maghrib', label: DAY_MARKER_LABELS.maghrib, at: times.maghrib },
    { id: 'isha', label: DAY_MARKER_LABELS.isha, at: times.isha },
    { id: 'middleOfNight', label: DAY_MARKER_LABELS.middleOfNight, at: night.middleOfNight },
    { id: 'lastThird', label: DAY_MARKER_LABELS.lastThird, at: night.lastThird },
    { id: 'fajr', label: DAY_MARKER_LABELS.fajr, at: nextFajr },
  ]
  const isDay = times.fajr <= now && now < times.maghrib
  const start = isDay ? times.fajr : times.maghrib
  const end = isDay ? times.maghrib : nextFajr
  const position = now < times.fajr ? 0 : Math.max(0, Math.min(1, (now - start) / (end - start)))
  const allMarkers = [...dayMarkers, ...nightMarkers].sort((a, b) => a.at - b.at)
  const nextEvent = allMarkers.find((marker) => marker.at > now) ?? null
  return {
    mode: isDay ? 'day' : 'night',
    position,
    markers: isDay ? dayMarkers : nightMarkers,
    nextEvent,
    countdownTarget: nextEvent?.at ?? null,
  }
}

export function buildDayPlan(input: DayPlanInput): DayPlan {
  const { now, day, times, nextFajr, definition, entries } = input
  const monthEntries = input.monthEntries ?? []
  const isFriday = weekdayOf(day) === 5
  const windows = planWindows(times, nextFajr)
  const placed = placeDayItems(day, definition, entries, monthEntries, windows, isFriday)
  if (!windows) {
    return {
      day,
      hasTimes: false,
      ...placed,
      currentBlock: null,
      nextBlock: null,
      openTimedActs: [],
      unrecorded: [],
      header: null,
    }
  }

  const currentBlock = placed.blocks.find((block) => contains(block.window, now)) ?? null
  if (currentBlock) currentBlock.isCurrent = true
  const nextBlock =
    placed.blocks.find((block) => block.window !== null && block.window.start > now) ?? null
  const openTimedActs = placed.timedActs.filter((act) => contains(act.window, now))
  const unrecorded = [
    ...placed.blocks
      .filter((block) => block.window && block.window.end <= now)
      .flatMap((block) => block.items),
    ...placed.timedActs
      .filter((act) => act.window && act.window.end <= now)
      .flatMap((act) => act.items),
  ].filter((item) => !item.optional && !item.done)
  return {
    day,
    hasTimes: true,
    ...placed,
    currentBlock,
    nextBlock,
    openTimedActs,
    unrecorded,
    header: dayHeader(now, windows.times, windows.nextFajr),
  }
}

function daysSinceEpoch(day: DayId): number {
  const [year, month, dayOfMonth] = day.split('-').map(Number)
  return Math.floor(Date.UTC(year, month - 1, dayOfMonth) / MILLISECONDS_PER_DAY)
}

function positiveModulo(value: number, divisor: number): number {
  return ((value % divisor) + divisor) % divisor
}

export function dailyLines(day: DayId): DailyLines {
  const intentions = INTENTIONS_LIBRARY.flatMap(({ deed, intentions: items }) =>
    items.map(({ text }) => ({ deed, text })),
  )
  const index = daysSinceEpoch(day)
  const intentionIndex = positiveModulo(index, intentions.length)
  const dhikrIndex = positiveModulo(index, GENERAL_ADHKAR.length)
  const intention = intentions[intentionIndex]
  const dhikr = GENERAL_ADHKAR[dhikrIndex]
  return { intention, dhikr: { text: dhikr.text } }
}
