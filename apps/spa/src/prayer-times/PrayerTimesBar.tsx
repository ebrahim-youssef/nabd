import { MapPin } from 'lucide-react'
import { Link } from 'react-router'

import { PRAYER_TIMES_COPY, statusLine } from '@nabd/shared'

import { usePrayerTimes } from './usePrayerTimes'

export function PrayerTimesBar() {
  const { hasLocation, status, enableLocation } = usePrayerTimes()

  if (!hasLocation) {
    return (
      <button
        type="button"
        onClick={() => void enableLocation()}
        data-testid="enable-location"
        className="flex items-center gap-2 py-1 text-small text-muted-foreground transition-colors hover:text-primary"
      >
        <MapPin className="size-4" aria-hidden />
        {PRAYER_TIMES_COPY.enableLocation}
      </button>
    )
  }

  const line = statusLine(status)
  if (!line) return null
  return (
    <Link
      to="/app/prayer-times"
      className="block py-1 text-small font-medium text-primary transition-colors hover:text-primary-deep"
      data-testid="prayer-status"
    >
      {line}
    </Link>
  )
}
