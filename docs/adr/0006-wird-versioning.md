# ADR-0006 — Versioned wird model (malleable wird)

- **Status:** accepted
- **Date:** 2026-07-13 (accepted 2026-07-14)

## Context

A user's wird is not fixed. Over time they add or drop parts (5 prayers without sunan → later
with sunan; a Quran portion of 1 juz → 2 juz). The product requires that **statistics stay
correct across these changes**: growing your wird must not retroactively make last month look
incomplete, and shrinking it must not erase past effort. This is the single hardest data
decision in nabd, and `stats/logic.ts` cannot be written correctly until it is settled.

## Decision

Store the wird definition as **versioned records** with effective-date ranges; each day's
completion entries reference the **wird version in force on that day**. Statistics are computed
by pure functions in `stats/logic.ts` against the correct version per day, so a change only
affects days from its effective date forward. Sync (Dexie ↔ Supabase) carries versions as
immutable rows plus append-only entries, which keeps merges conflict-light.

The three open questions are now resolved:

### 1. Granularity — whole-wird

A version is a snapshot of the **entire wird** (all areas and items together), not per-area or
per-item. One `WirdVersion` row holds the complete definition. Any change — adding a sunnah,
growing the Quran portion — creates one new version superseding the previous. This is the
simplest to model and gives the cleanest, most conflict-light sync (immutable snapshots, no
per-area reconciliation). The cost (a whole new snapshot for a small edit) is negligible at
nabd's data scale.

### 2. Change timing — start-of-day snapshot

A wird change takes effect on the **next `DayId`** (local calendar day), never mid-day. The
version in force on day `D` is the version with the greatest `effectiveFrom` that is `≤ D`.
Editing the wird today does not retroactively alter today's checklist or stats — today keeps
the version it started with; the edit applies from tomorrow. This removes all intra-day
ambiguity ("was this item due at check-off time?") and means exactly one version governs each
day.

### 3. Entry ↔ version reference — versionId on the entry

Each completion `WirdEntry` stores the immutable `versionId` it was created against, captured at
creation time. Versions sync as immutable rows; entries are append-only and carry their
`versionId`, so an entry written offline stays correct after sync regardless of the order rows
arrive in. Stats never have to re-resolve which version applied — the entry already says.

## Data model (locked)

```
WirdVersion  { id, effectiveFrom: DayId, definition: WirdDefinition, createdAt: number }
  — immutable. definition is the full snapshot of areas + items.
WirdEntry    { id, day: DayId, versionId, itemId, done: boolean, at: number }
  — append-only state event. latest event per (day, itemId) by `at` wins.
```

- `DayId` is a local calendar day string `YYYY-MM-DD`.
- The version in force on a day is resolved purely: `max(effectiveFrom ≤ day)`.
- Check and uncheck both **append** an entry (`done: true` / `done: false`); rows are never
  edited or deleted, so sync is upsert-only and conflict-light (no delete tombstones).
- Both tables are first-class immutable/append-only records in Dexie and Supabase.

## Consequences

- `stats/logic.ts` is pure and takes `(entries, versions, day)` — testable with property-based
  tests asserting "a past day's stats never change when a new version is added."
- The Dexie schema and Supabase tables model versions as first-class, immutable records; entries
  are append-only and never mutated (a "correction" is a new entry, not an edit).
- This unblocks NBD-5 (Dexie schema + sync), NBD-7 (durable checklist), and NBD-8 (statistics).
