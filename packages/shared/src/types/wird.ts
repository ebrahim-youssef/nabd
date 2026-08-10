// Core wird data shapes, shared across features. The versioned model is locked in ADR-0006:
// a WirdVersion is an immutable whole-wird snapshot with an effective day; a WirdEntry is an
// append-only completion record that stores the versionId in force on its day.

// A local calendar day, formatted 'YYYY-MM-DD'. Days — not timestamps — are the unit the wird
// and its statistics are reckoned in.
export type DayId = string

// A checkbox item is done or not; a counter item (e.g. a dhikr repeated 33×) completes when
// its target is reached. Counters connect to the checklist in NBD-9.
export type WirdItemKind = 'checkbox' | 'counter'

export type WirdArea = {
  id: string
  label: string
  // Display order within the wird (ascending).
  order: number
}

// When an item is due (ADR-0008). Absent ⇒ daily. A monthly-goal item renders every day and
// counts done-days toward its per-month target; a weekdays item exists only on its days
// (0=Sunday … 6=Saturday).
export type WirdSchedule =
  | { type: 'daily' }
  | { type: 'monthly-goal'; target: number }
  | { type: 'weekdays'; days: number[] }

export type WirdItem = {
  id: string
  areaId: string
  label: string
  kind: WirdItemKind
  // Repetitions required for a counter item to count as complete. Omitted for checkboxes.
  target?: number
  // ADR-0008: absent ⇒ daily.
  schedule?: WirdSchedule
  // ADR-0008: تطوّع — never counted in the required done/remaining totals.
  optional?: boolean
  // ADR-0008: display-only minimum for the deed to count (e.g. "٣ ركعات على الأقل").
  minimum?: string
  // NBD-54 (r6 §6): recommended weekday(s) for a voluntary deed (0=Sun … 6=Sat), e.g. صيام
  // الإثنين والخميس = [1, 4]. A soft target — display + attainment only; it does NOT gate
  // scheduling (unlike `weekdays`), so the item still shows and counts on every day.
  targetDays?: number[]
}

// The full wird as a single snapshot (whole-wird versioning, ADR-0006 §1).
export type WirdDefinition = {
  areas: WirdArea[]
  items: WirdItem[]
}

// Immutable. The version in force on a day D is the one with the greatest effectiveFrom ≤ D
// (ADR-0006 §2, start-of-day). Never mutated once created.
export type WirdVersion = {
  id: string
  effectiveFrom: DayId
  definition: WirdDefinition
  createdAt: number
}

// Append-only state event for one item on one day. `done` is the state this event sets; the
// latest event per (day, itemId) by `at` wins, so a mis-tap is corrected by appending a new
// event, never by editing or deleting (ADR-0006 §3). Stores the versionId in force on its day
// so it stays correct through offline creation and later sync regardless of row arrival order.
export type WirdEntry = {
  id: string
  day: DayId
  versionId: string
  itemId: string
  done: boolean
  at: number
}
