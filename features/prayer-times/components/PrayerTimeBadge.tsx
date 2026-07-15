'use client'

import { usePrayerTimes } from '../hooks/usePrayerTimes'

// Arabic-Indic 12-hour wall time (٤:١٢ ص).
const TIME_FORMAT = new Intl.DateTimeFormat('ar-EG', { hour: 'numeric', minute: '2-digit' })

// The adhan time beside a prayer checklist item (ADR-0009). Renders nothing without
// location or for non-prayer items, so the checklist row layout is unaffected.
export function PrayerTimeBadge({ prayerId }: { prayerId: string }) {
  const { times } = usePrayerTimes()
  const at = times?.[prayerId]
  if (at === undefined) return null

  return (
    <span
      className="text-muted-foreground text-small shrink-0 tabular-nums"
      data-testid={`prayer-time-${prayerId}`}
    >
      {TIME_FORMAT.format(at)}
    </span>
  )
}
