import { compareDayId, weekdayOf } from '../lib/day'
import { toArabicIndic } from '../lib/format'
import { isScheduledOn, latestStateByItem, versionInForce } from '../wird/logic'
import type { AreaStat, DayCompletion, ItemStat, RangeSummary } from './types'
import type { DayId, WirdEntry, WirdItem, WirdVersion } from '../wird/types'

export const PERCENT = 100
const PERCENT_SYMBOL = '٪'
const ARABIC_WEEKDAY_FORMATTER = new Intl.DateTimeFormat('ar-EG', {
  timeZone: 'UTC',
  weekday: 'long',
})

export function completionPercent(done: number, total: number): number {
  return total > 0 ? Math.round((done / total) * PERCENT) : 0
}

export function formatCompletion(done: number, total: number): string {
  return `${toArabicIndic(done)}/${toArabicIndic(total)}`
}

export function formatPercentage(percent: number): string {
  return `${toArabicIndic(percent)}${PERCENT_SYMBOL}`
}

export function formatArabicWeekday(day: DayId): string {
  return ARABIC_WEEKDAY_FORMATTER.format(new Date(`${day}T00:00:00.000Z`))
}

export function earliestDay(
  versions: readonly { effectiveFrom: DayId }[],
  entries: readonly { day: DayId }[],
  today: DayId,
): DayId {
  let earliest = today
  for (const version of versions) {
    if (compareDayId(version.effectiveFrom, earliest) < 0) earliest = version.effectiveFrom
  }
  for (const entry of entries) if (compareDayId(entry.day, earliest) < 0) earliest = entry.day
  return compareDayId(earliest, today) > 0 ? today : earliest
}

function countableItems(items: WirdItem[], day: DayId): WirdItem[] {
  return items.filter((item) => !item.optional && isScheduledOn(item, day))
}

function entriesOnDay(entries: WirdEntry[], day: DayId): WirdEntry[] {
  return entries.filter((entry) => entry.day === day)
}

export function dayCompletion(
  versions: WirdVersion[],
  entries: WirdEntry[],
  day: DayId,
): DayCompletion | null {
  const version = versionInForce(versions, day)
  if (!version) return null
  const state = latestStateByItem(entriesOnDay(entries, day))
  const items = countableItems(version.definition.items, day)
  return { day, total: items.length, done: items.filter((item) => state.get(item.id)).length }
}

export function rangeCompletion(
  versions: WirdVersion[],
  entries: WirdEntry[],
  days: DayId[],
): DayCompletion[] {
  const out: DayCompletion[] = []
  for (const day of days) {
    const completion = dayCompletion(versions, entries, day)
    if (completion) out.push(completion)
  }
  return out
}

export function dayAreaStats(
  versions: WirdVersion[],
  entries: WirdEntry[],
  day: DayId,
): AreaStat[] {
  const version = versionInForce(versions, day)
  if (!version) return []
  const state = latestStateByItem(entriesOnDay(entries, day))
  return [...version.definition.areas]
    .sort((a, b) => a.order - b.order)
    .map((area) => {
      const items = countableItems(
        version.definition.items.filter((item) => item.areaId === area.id),
        day,
      )
      return {
        areaId: area.id,
        label: area.label,
        total: items.length,
        done: items.filter((item) => state.get(item.id)).length,
      }
    })
}

export function summarize(completions: DayCompletion[]): RangeSummary {
  let total = 0
  let done = 0
  let completedDays = 0
  for (const completion of completions) {
    total += completion.total
    done += completion.done
    if (completion.total > 0 && completion.done === completion.total) completedDays += 1
  }
  return { days: completions.length, total, done, completedDays }
}

function isComplete(completion: DayCompletion): boolean {
  return completion.total > 0 && completion.done === completion.total
}

export function currentStreak(completions: DayCompletion[]): number {
  let index = completions.length - 1
  if (index >= 0 && !isComplete(completions[index])) index -= 1
  let streak = 0
  for (; index >= 0 && isComplete(completions[index]); index -= 1) streak += 1
  return streak
}

export function bestStreak(completions: DayCompletion[]): number {
  let best = 0
  let run = 0
  for (const completion of completions) {
    run = isComplete(completion) ? run + 1 : 0
    if (run > best) best = run
  }
  return best
}

function itemDoneByDay(entries: WirdEntry[], itemId: string): Map<DayId, boolean> {
  const latestAt = new Map<DayId, number>()
  const done = new Map<DayId, boolean>()
  for (const entry of entries) {
    if (entry.itemId !== itemId) continue
    const seen = latestAt.get(entry.day)
    if (seen === undefined || entry.at > seen) {
      latestAt.set(entry.day, entry.at)
      done.set(entry.day, entry.done)
    }
  }
  return done
}

function trailingRun(sequence: boolean[], value: boolean): number {
  let run = 0
  for (let i = sequence.length - 1; i >= 0 && sequence[i] === value; i -= 1) run += 1
  return run
}

function longestRun(sequence: boolean[], value: boolean): number {
  let best = 0
  let run = 0
  for (const flag of sequence) {
    run = flag === value ? run + 1 : 0
    if (run > best) best = run
  }
  return best
}

function itemDueOn(versions: WirdVersion[], item: WirdItem, day: DayId): boolean {
  const inVersion = versionInForce(versions, day)?.definition.items.find(
    (candidate) => candidate.id === item.id,
  )
  if (!inVersion || !isScheduledOn(inVersion, day)) return false
  if (!item.optional && inVersion.optional) return false
  return true
}

type ItemSeries = {
  sequence: boolean[]
  lastActiveDay: DayId | null
  attainmentDone: number
  attainmentWindow: number
}

function itemSeries(
  versions: WirdVersion[],
  entries: WirdEntry[],
  item: WirdItem,
  days: DayId[],
  today: DayId,
): ItemSeries {
  const doneByDay = itemDoneByDay(entries, item.id)
  const sequence: boolean[] = []
  let lastActiveDay: DayId | null = null
  let attainmentDone = 0
  let attainmentWindow = 0
  for (const day of days) {
    if (compareDayId(day, today) > 0) break
    if (!itemDueOn(versions, item, day)) continue
    const done = doneByDay.get(day) ?? false
    sequence.push(done)
    lastActiveDay = day
    if (item.targetDays?.includes(weekdayOf(day))) {
      attainmentWindow += 1
      if (done) attainmentDone += 1
    }
  }
  return { sequence, lastActiveDay, attainmentDone, attainmentWindow }
}

export function itemStat(
  versions: WirdVersion[],
  entries: WirdEntry[],
  item: WirdItem,
  days: DayId[],
  today: DayId,
): ItemStat {
  const series = itemSeries(versions, entries, item, days, today)
  const sequence = series.sequence
  const last = sequence.length - 1
  if (!item.optional && series.lastActiveDay === today && last >= 0 && !sequence[last])
    sequence.pop()
  const activeDays = sequence.length
  const doneDays = sequence.filter(Boolean).length
  return {
    itemId: item.id,
    label: item.label,
    optional: Boolean(item.optional),
    activeDays,
    doneDays,
    missedDays: item.optional ? 0 : activeDays - doneDays,
    consistency: activeDays > 0 ? doneDays / activeDays : 0,
    currentStreak: trailingRun(sequence, true),
    longestStreak: longestRun(sequence, true),
    currentMissStreak: item.optional ? 0 : trailingRun(sequence, false),
    attainment: item.targetDays
      ? { done: series.attainmentDone, window: series.attainmentWindow }
      : null,
  }
}

export function itemStats(
  versions: WirdVersion[],
  entries: WirdEntry[],
  items: WirdItem[],
  days: DayId[],
  today: DayId,
): ItemStat[] {
  return items.map((item) => itemStat(versions, entries, item, days, today))
}
