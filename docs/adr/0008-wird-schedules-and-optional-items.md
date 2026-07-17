# ADR-0008 — Wird item schedules & optional items

- **Status:** accepted (2026-07-15)
- **Extends:** ADR-0006 (wird versioning) — entries stay append-only and daily; only the
  _definition_ vocabulary grows.

## Context

The R2 wird levels (post-MVP update round) need items the daily model can't express:

1. **Voluntary (تطوّع) items** — قيام الليل، الضحى، الصيام: the user "may" do them; skipping
   them must not read as failure. Some carry a **minimum** to count (e.g. قيام الليل لا يقل
   عن ٣ ركعات).
2. **Periodic goals** — صيام ٣ أيام في الشهر is a _monthly_ goal ticked on arbitrary days;
   صيام الإثنين والخميس only exists on Mondays and Thursdays.

## Decision

### 1. `WirdItem.schedule` (new, optional — absent ⇒ daily)

```ts
type WirdSchedule =
  | { type: 'daily' } // default; omitted in data
  | { type: 'monthly-goal'; target: number } // e.g. صيام: 3 done-days per calendar month
  | { type: 'weekdays'; days: number[] } // 0=Sun … 6=Sat; e.g. الإثنين والخميس = [1, 4]
```

- **Entries are unchanged** (ADR-0006 §3): one append-only `{day, itemId, done, at}` event
  stream. A `monthly-goal` item's progress for month M = count of days in M whose latest
  event is `done`. A `weekdays` item simply _does not render_ (and is excluded from
  totals) on non-matching days.
- The checklist shows a `monthly-goal` item every day (checking it means "I did it today")
  with its month progress (e.g. ٢/٣ هذا الشهر).

### 2. `WirdItem.optional` + `WirdItem.minimum` (new, optional)

- `optional: true` → item is تطوّع: excluded from the required done/remaining counts and the
  completion ring; shown in its own توضيح (visual affordance) and counted in a separate
  voluntary tally. Checking it is always allowed.
- `minimum?: string` → display-only note of the minimum for it to count (e.g. "٣ ركعات على
  الأقل"). Enforcement is on the user's honesty — no extra data capture.

### 3. Stats

`stats/logic.ts` treats optional items as a separate series (never lowers a day's required
completion). `monthly-goal` items get month-window aggregation; `weekdays` items count only
their scheduled days as denominators.

## Consequences

- Old versions (no `schedule`/`optional`) parse unchanged — additive, no migration.
- Sync payloads unchanged in shape (definition JSON grows two optional fields).
- Summary/ring (NBD-20) reads _required_ items only; voluntary shown separately.

## Amendment — `targetDays` for voluntary soft targets (R6 §6 / NBD-54, 2026-07-16)

Owner clarification: صيام الإثنين والخميس is **not** a hard `weekdays` schedule. الإثنين/الخميس
are the _recommended_ days, but the fast counts on any day it is done, and a non-fasted day is
never a miss. `weekdays` (which hides the item off-schedule and gates its stats denominators)
modelled this wrongly.

New optional field:

```ts
type WirdItem = {
  // …
  targetDays?: number[] // 0=Sun … 6=Sat; recommended days for a voluntary deed
}
```

- `targetDays` is **display + attainment only** — it does not gate `isScheduledOn`, so the item
  renders and is checkable **every day** (like a daily item). The checklist highlights the deed
  as المستحب when today ∈ `targetDays` (`ChecklistItemView.targetToday`).
- Applies to voluntary (`optional`) deeds; being voluntary, a non-fasted day never lowers a
  required total (unchanged from above).
- `weekdays` stays a supported schedule for any genuinely day-restricted item; صيام simply moves
  off it. Additive and parse-compatible with old versions — no migration.
- Per-item stats (NBD-47) read `targetDays` to compute **target-day attainment** (target days
  fasted vs target) instead of a daily streak, so a skipped non-target day is not a miss.
