// Pure qada math (ADR-0010): period → days, and the append-only ledger fold. No I/O, no
// clock — events and inputs come in as data. Structural event shape (only what the fold
// needs) keeps this module free of db imports per the boundary lint.

export type QadaEventLike = {
  prayerId: string
  delta: number
}

// Fixed conversion factors, stated in the modal UI: estimates are rough by nature, the
// transparent factors keep the math predictable.
export const DAYS_PER_YEAR = 365
export const DAYS_PER_MONTH = 30

// The five prayers the ledger tracks, in display order.
export const QADA_PRAYERS = [
  { id: 'fajr', label: 'الفجر' },
  { id: 'dhuhr', label: 'الظهر' },
  { id: 'asr', label: 'العصر' },
  { id: 'maghrib', label: 'المغرب' },
  { id: 'isha', label: 'العشاء' },
] as const

export type QadaPrayerId = (typeof QADA_PRAYERS)[number]['id']

// سنين/شهور/أيام → total days. Negative or missing parts count as zero.
export function daysFromPeriod(years: number, months: number, days: number): number {
  const safe = (value: number) => (Number.isFinite(value) && value > 0 ? Math.floor(value) : 0)
  return safe(years) * DAYS_PER_YEAR + safe(months) * DAYS_PER_MONTH + safe(days)
}

// Remaining debt per prayer: the fold of all events, clamped at zero (over-payment is
// harmless — the ledger never goes negative).
export function qadaRemaining(events: QadaEventLike[]): Record<QadaPrayerId, number> {
  const remaining = Object.fromEntries(QADA_PRAYERS.map((prayer) => [prayer.id, 0])) as Record<
    QadaPrayerId,
    number
  >
  for (const event of events) {
    if (event.prayerId in remaining) {
      remaining[event.prayerId as QadaPrayerId] += event.delta
    }
  }
  for (const prayer of QADA_PRAYERS) {
    remaining[prayer.id] = Math.max(0, remaining[prayer.id])
  }
  return remaining
}
