'use client'

import { MapPin } from 'lucide-react'
import Link from 'next/link'

import { COPY } from '../constants'
import { statusLine } from '../logic'
import { usePrayerTimes } from '../hooks/usePrayerTimes'

// The live prayer sub-header (ADR-0009): sits under the الصلوات area header and never
// collapses with it, so "باقي … على العصر" stays on screen. Without location it degrades to
// a one-tap quiet prompt — nothing else in the checklist depends on it.
export function PrayerTimesBar() {
  const { hasLocation, status, enableLocation } = usePrayerTimes()

  if (!hasLocation) {
    return (
      <button
        type="button"
        onClick={() => void enableLocation()}
        data-testid="enable-location"
        className="text-muted-foreground hover:text-primary flex items-center gap-2 py-1 text-small transition-colors"
      >
        <MapPin className="size-4" aria-hidden />
        {COPY.enableLocation}
      </button>
    )
  }

  const line = statusLine(status)
  if (!line) return null

  // The line doubles as the door to the dedicated page (NBD-38).
  return (
    <Link
      href="/prayer-times"
      className="text-primary hover:text-primary-deep text-small block py-1 font-medium transition-colors"
      data-testid="prayer-status"
    >
      {line}
    </Link>
  )
}
