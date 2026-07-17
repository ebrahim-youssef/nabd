import { compareDayId, weekdayOf } from '@/lib/pure/day'
import { isScheduledOn, latestStateByItem, versionInForce } from '@/lib/pure/wird'
import type { DayId, WirdEntry, WirdItem, WirdVersion } from '@/types/wird'

import type { AreaStat, DayCompletion, ItemStat, RangeSummary } from './types'

// Pure statistics. Every figure for a day is computed against the wird version in force on THAT
// day (ADR-0006), which is what keeps history stable: adding a new version (effective later)
// cannot change an earlier day's numbers, because that earlier day still resolves to its own
// version. Data and days are passed in; no I/O, no clock.
//
// ADR-0008: a day's denominators count only items that are required (not تطوّع) and actually
// scheduled on that day — a weekdays item outside its days can neither help nor hurt.

function countableItems(items: WirdItem[], day: DayId): WirdItem[] {
  return items.filter((item) => !item.optional && isScheduledOn(item, day))
}

function entriesOnDay(entries: WirdEntry[], day: DayId): WirdEntry[] {
  return entries.filter((entry) => entry.day === day)
}

// Completion for a single day, or null if no wird had taken effect yet on that day.
export function dayCompletion(
  versions: WirdVersion[],
  entries: WirdEntry[],
  day: DayId,
): DayCompletion | null {
  const version = versionInForce(versions, day)
  if (!version) return null

  const state = latestStateByItem(entriesOnDay(entries, day))
  const items = countableItems(version.definition.items, day)
  const total = items.length
  let done = 0
  for (const item of items) {
    if (state.get(item.id)) done += 1
  }
  return { day, total, done }
}

// Completion for each day in `days` that has a wird in force (others are skipped).
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

// Per-area breakdown for one day, in display order (the drill-down view).
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
      const done = items.filter((item) => state.get(item.id)).length
      return { areaId: area.id, label: area.label, total: items.length, done }
    })
}

// Rolls a set of day completions up into range totals.
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

// Consecutive fully-completed days ending at the range's last day (NBD-31). The last day
// gets grace while still in progress: an incomplete final day is skipped, not a streak
// breaker — finishing yesterday keeps the flame lit until today ends.
export function currentStreak(completions: DayCompletion[]): number {
  let index = completions.length - 1
  if (index >= 0 && !isComplete(completions[index])) index -= 1
  let streak = 0
  for (; index >= 0 && isComplete(completions[index]); index -= 1) streak += 1
  return streak
}

// The longest run of fully-completed days anywhere in the range (NBD-31).
export function bestStreak(completions: DayCompletion[]): number {
  let best = 0
  let run = 0
  for (const completion of completions) {
    run = isComplete(completion) ? run + 1 : 0
    if (run > best) best = run
  }
  return best
}

// --- Per-item history (NBD-47, r6 §8) ---
//
// Derived purely from the same versioned entries every other stat reads — no per-item table.
// The key idea: a day only counts for an item while that item was actually IN the wird and DUE
// on that day. Days where the item was absent (a level change dropped it) are N/A: they neither
// break nor extend a streak, so dropping then re-adding an item BRIDGES its streak rather than
// resetting it — and no misses are fabricated for the gap. Item ids are stable across levels
// (content/levels.ts), so an item's history joins across versions by id.

// Latest done-state per day for one item (append-only: the greatest `at` per day wins).
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

// Whether an item is due on a day (present in the version in force + scheduled + not treated
// as voluntary that day). `false` ⇒ N/A (absent/off-schedule), which bridges the streak.
function itemDueOn(versions: WirdVersion[], item: WirdItem, day: DayId): boolean {
  const inVersion = versionInForce(versions, day)?.definition.items.find(
    (candidate) => candidate.id === item.id,
  )
  if (!inVersion || !isScheduledOn(inVersion, day)) return false
  if (!item.optional && inVersion.optional) return false
  return true
}

type ItemSeries = {
  // done/miss per active day, oldest first.
  sequence: boolean[]
  lastActiveDay: DayId | null
  attainmentDone: number
  attainmentWindow: number
}

// Walks `days` (oldest first) into the item's active-day series, skipping N/A days so a
// dropped-then-re-added item bridges rather than breaks. Target days are tallied for attainment.
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

// One item's history over `days` (oldest first). Required items are reckoned over the days they
// were DUE; voluntary items over the days they were present. An unfinished required `today` is
// held out (grace) so it neither breaks a streak nor counts as a miss until the day is over —
// mirrors currentStreak (NBD-31).
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
  if (!item.optional && series.lastActiveDay === today && last >= 0 && !sequence[last]) {
    sequence.pop()
  }

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

// Per-item history for every item in `items` (typically the current wird's items).
export function itemStats(
  versions: WirdVersion[],
  entries: WirdEntry[],
  items: WirdItem[],
  days: DayId[],
  today: DayId,
): ItemStat[] {
  return items.map((item) => itemStat(versions, entries, item, days, today))
}
