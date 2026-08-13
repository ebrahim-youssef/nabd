import { LOCATION_FAILURE_COPY, SETTINGS_COPY } from '@nabd/shared'
import type { LocationFailure } from '@nabd/shared'
import { Check, MapPin } from 'lucide-react'
import { useEffect, useState } from 'react'

import { COORDS_EVENT, readCachedCoords, requestCoords } from '../prayer-times/location'

// تحديد الموقع (NBD-48): lets a user who skipped location during onboarding grant it later. The same
// one-tap flow as onboarding and the prayer-times page, reading the shared coordinate cache so a
// grant anywhere lights every prayer-times consumer without a remount.
export function LocationSettings() {
  const [hasLocation, setHasLocation] = useState(() => readCachedCoords() !== null)
  // Why the last attempt failed. The three reasons stay distinct because they need different actions
  // from the user; a browser can only produce `denied` and `unavailable`.
  const [failure, setFailure] = useState<LocationFailure | null>(null)

  useEffect(() => {
    const onCoords = () => setHasLocation(readCachedCoords() !== null)
    window.addEventListener(COORDS_EVENT, onCoords)
    return () => window.removeEventListener(COORDS_EVENT, onCoords)
  }, [])

  async function enable() {
    const result = await requestCoords()
    setHasLocation(result.ok)
    setFailure(result.ok ? null : result.reason)
  }

  return (
    <section className="flex flex-col gap-3" data-testid="location-settings">
      <h2 className="font-display text-title text-primary">{SETTINGS_COPY.location.title}</h2>
      <div className="flex flex-col gap-3 rounded-card border border-border bg-surface p-4 shadow-card-small">
        <span className="flex items-center gap-2 text-body font-medium text-foreground">
          <span
            className="flex size-9 shrink-0 items-center justify-center rounded-icon bg-primary/10 text-primary"
            aria-hidden
          >
            <MapPin className="size-5" />
          </span>
          {SETTINGS_COPY.location.heading}
        </span>
        <p className="text-small text-muted-foreground">{SETTINGS_COPY.location.body}</p>
        {hasLocation ? (
          <span
            className="flex items-center gap-1 text-small font-medium text-primary"
            data-testid="location-granted"
          >
            <Check className="size-4" aria-hidden />
            {SETTINGS_COPY.location.granted}
          </span>
        ) : (
          <>
            <button
              type="button"
              onClick={() => void enable()}
              data-testid="enable-location-settings"
              className="flex items-center justify-center gap-2 rounded-card border border-primary/40 bg-primary/10 p-3 text-body font-medium text-primary transition-colors hover:bg-primary hover:text-on-primary"
            >
              <MapPin className="size-4.5" aria-hidden />
              {failure ? SETTINGS_COPY.location.retry : SETTINGS_COPY.location.enable}
            </button>
            {failure && (
              <p className="text-small text-gold" data-testid={`location-failure-${failure}`}>
                {LOCATION_FAILURE_COPY[failure]}
              </p>
            )}
          </>
        )}
      </div>
    </section>
  )
}
