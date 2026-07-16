# ADR-0010 — Qada ledger (قضاء الفوائت)

- **Status:** accepted
- **Date:** 2026-07-16

## Context

R4 intake §4 (docs/product/design-notes-r4.md): the user estimates a period they missed
prayers (سنين/شهور/أيام), the app turns it into a per-prayer debt, and each «تم قضاء صلاة»
tap pays one prayer down. The backlog anticipated this needing an ADR before build. The
related r3 idea — a prayer checked after its window auto-counting as قضاء — is explicitly
**not** decided here; it stays a future ADR.

## Decision

### 1. Event-sourced ledger

```
QadaEvent { id, prayerId: 'fajr'|'dhuhr'|'asr'|'maghrib'|'isha', delta: number, at: number }
```

Append-only events; the remaining debt per prayer is a pure fold: `max(0, Σ delta)`.
A bulk add writes five events (one per prayer, `delta = +days`); a «تم القضاء» tap writes
`delta = -1`. Nothing is ever edited or deleted — corrections are new events. This mirrors
the `WirdEntry` philosophy (ADR-0006) and keeps a future sync conflict-light.

### 2. Period → days conversion

سنة = **٣٦٥** يومًا، شهر = **٣٠** يومًا (fixed, stated in the modal UI). The sum is applied
to **each** of the five prayers equally. Estimates are inherently rough; the fixed factors
keep the math transparent and the fiqh burden on the user's own estimate, per the intake.

### 3. Local-first, sync deferred

The ledger lives in Dexie (`qadaEvents`, schema v3), **not synced yet**. The sync engine's
row mappers are per-table today (features/sync/db.ts); wiring qada into Supabase (table,
RLS, mappers, pull cursor) is mechanical thanks to the append-only shape but is its own
ticket — the ledger must not block on backend schema work. Follow-up recorded in the
backlog.

### 4. Independent of the daily checklist

Qada counters do not touch wird versions, entries, stats, or the celebration. The daily
checklist tracks today's commitment; the ledger tracks a historical debt.

## Consequences

- `features/qada/logic.ts` stays pure (fold + conversion) and property-testable.
- The page works fully offline; a reload resolves state from Dexie like everything else.
- Sync integration and the check-late-counts-as-qada rule are separate future tickets.
