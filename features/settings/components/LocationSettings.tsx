'use client'

import { Check, MapPin } from 'lucide-react'
import { useEffect, useState } from 'react'

import { COORDS_EVENT, readCachedCoords, requestCoords } from '@/lib/impure/location'

// تحديد الموقع section (NBD-48, r6 §1): lets a user who skipped location in onboarding grant
// it later. Same one-tap flow as onboarding and the prayer-times page, reading the shared
// coordinate cache so a grant anywhere lights every prayer-times consumer without a remount.
const COPY = {
  title: 'الموقع',
  heading: 'تحديد الموقع',
  body: 'يُستخدم لحساب مواقيت الصلاة على جهازك. لا يغادر الموقع جهازك ولا يُرفع لأي خادم.',
  enable: 'تفعيل تحديد الموقع',
  retry: 'إعادة المحاولة',
  granted: 'الموقع مُفعّل',
  denied:
    'تعذّر الحصول على الموقع — تأكد من منح التطبيق صلاحية الموقع من إعدادات النظام ثم أعد المحاولة.',
} as const

export function LocationSettings() {
  const [hasLocation, setHasLocation] = useState(false)
  // null before any attempt; true once a request resolved with no coordinates (denied/failed).
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    // Deferred a tick: localStorage is client-only and the deferral keeps SSR and the first
    // client render identical (same pattern as usePrayerTimes / PrayerMethodSettings).
    const timer = window.setTimeout(() => setHasLocation(readCachedCoords() !== null), 0)
    const onCoords = () => setHasLocation(readCachedCoords() !== null)
    window.addEventListener(COORDS_EVENT, onCoords)
    return () => {
      window.clearTimeout(timer)
      window.removeEventListener(COORDS_EVENT, onCoords)
    }
  }, [])

  const enable = async () => {
    const coords = await requestCoords()
    setHasLocation(coords !== null)
    setFailed(coords === null)
  }

  return (
    <section className="flex flex-col gap-3" data-testid="location-settings">
      <h2 className="font-display text-title text-primary">{COPY.title}</h2>
      <div className="border-border bg-surface shadow-card-sm flex flex-col gap-3 rounded-card border p-4">
        <span className="text-body text-foreground flex items-center gap-2 font-medium">
          <span
            aria-hidden
            className="bg-primary/10 text-primary flex size-9 shrink-0 items-center justify-center rounded-icon"
          >
            <MapPin className="size-5" />
          </span>
          {COPY.heading}
        </span>
        <p className="text-muted-foreground text-small">{COPY.body}</p>
        {hasLocation ? (
          <span
            className="text-primary text-small flex items-center gap-1 font-medium"
            data-testid="location-granted"
          >
            <Check className="size-4" aria-hidden />
            {COPY.granted}
          </span>
        ) : (
          <>
            <button
              type="button"
              onClick={() => void enable()}
              data-testid="enable-location-settings"
              className="border-primary/40 bg-primary/10 text-primary hover:bg-primary hover:text-on-primary flex items-center justify-center gap-2 rounded-card border p-3 text-body font-medium transition-colors"
            >
              <MapPin className="size-4.5" aria-hidden />
              {failed ? COPY.retry : COPY.enable}
            </button>
            {failed && (
              <p className="text-gold text-small" data-testid="location-denied">
                {COPY.denied}
              </p>
            )}
          </>
        )}
      </div>
    </section>
  )
}
