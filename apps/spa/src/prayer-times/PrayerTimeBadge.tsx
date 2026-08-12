import { usePrayerTimes } from './usePrayerTimes'

const TIME_FORMAT = new Intl.DateTimeFormat('ar-EG', { hour: 'numeric', minute: '2-digit' })

export function PrayerTimeBadge({ prayerId }: { prayerId: string }) {
  const { times } = usePrayerTimes()
  const at = times?.[prayerId]
  if (at === undefined) return null
  return (
    <span
      className="shrink-0 text-small tabular-nums text-muted-foreground"
      data-testid={`prayer-time-${prayerId}`}
    >
      {TIME_FORMAT.format(at)}
    </span>
  )
}
