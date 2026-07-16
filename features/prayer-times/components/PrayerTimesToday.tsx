'use client'

import { MapPin, Sunrise } from 'lucide-react'

import { cn } from '@/lib/utils'

import { COPY, PRAYER_LABELS } from '../constants'
import { statusLine } from '../logic'
import { usePrayerTimes } from '../hooks/usePrayerTimes'

// Arabic-Indic 12-hour wall time (٤:١٢ ص) — same formatter as PrayerTimeBadge.
const TIME_FORMAT = new Intl.DateTimeFormat('ar-EG', { hour: 'numeric', minute: '2-digit' })

// Display order for the day: the five prayers + الشروق (muted, not a prayer).
const DAY_POINTS = ['fajr', 'sunrise', 'dhuhr', 'asr', 'maghrib', 'isha'] as const

// The dedicated مواقيت الصلاة view (NBD-38): today's times, with the announced/next point
// highlighted from the same timeline the checklist sub-header uses.
export function PrayerTimesToday() {
  const { hasLocation, times, status, enableLocation } = usePrayerTimes()

  if (!hasLocation || !times) {
    return (
      <button
        type="button"
        onClick={() => void enableLocation()}
        data-testid="enable-location-page"
        className="border-border bg-surface shadow-card-sm hover:border-accent/40 flex flex-col items-center gap-3 rounded-card border p-8 text-center transition-all"
      >
        <span
          aria-hidden
          className="bg-primary/10 text-primary flex size-14 items-center justify-center rounded-icon"
        >
          <MapPin className="size-6" />
        </span>
        <span className="text-body text-foreground font-medium">{COPY.enableLocation}</span>
        <span className="text-muted-foreground text-small">
          الموقع يُحفظ على جهازك فقط، ولا يغادر المتصفح.
        </span>
      </button>
    )
  }

  const line = statusLine(status)
  const announcedId = status?.kind === 'since' ? status.point.id : null
  const nextId = status?.kind === 'until' ? status.point.id : null

  return (
    <div className="flex flex-col gap-4" data-testid="prayer-times-today">
      {line && (
        <p className="pattern-khatam text-on-primary shadow-card rounded-card p-4 text-center text-body font-medium">
          {line}
        </p>
      )}

      <ul className="flex flex-col gap-2">
        {DAY_POINTS.map((id) => {
          const at = times[id]
          if (at === undefined) return null
          const isSunrise = id === 'sunrise'
          const isAnnounced = id === announcedId
          const isNext = id === nextId
          return (
            <li
              key={id}
              data-testid={`time-row-${id}`}
              className={cn(
                'flex items-center justify-between gap-3 rounded-card border p-4 transition-colors',
                isAnnounced
                  ? 'border-primary/40 bg-primary/10'
                  : 'border-border bg-surface shadow-card-sm',
                isSunrise && 'opacity-80',
              )}
            >
              <span className="flex min-w-0 items-center gap-2.5">
                {isSunrise && <Sunrise aria-hidden className="text-gold size-4.5 shrink-0" />}
                <span
                  className={cn(
                    'text-body font-medium',
                    isAnnounced ? 'text-primary' : 'text-foreground',
                    isSunrise && 'text-muted-foreground',
                  )}
                >
                  {PRAYER_LABELS[id]}
                </span>
                {isAnnounced && (
                  <span className="border-primary/40 bg-primary/10 text-primary rounded-chip border px-2 py-0.5 text-small shrink-0">
                    الآن
                  </span>
                )}
                {isNext && (
                  <span className="border-gold/40 bg-gold-soft text-gold rounded-chip border px-2 py-0.5 text-small shrink-0">
                    التالي
                  </span>
                )}
              </span>
              <span className="text-body text-foreground shrink-0 font-medium tabular-nums">
                {TIME_FORMAT.format(at)}
              </span>
            </li>
          )
        })}
      </ul>

      <p className="text-muted-foreground text-label">
        تُحسب المواقيت على جهازك (adhan.js) حسب موقعك وطريقة الحساب المختارة في الإعدادات.
      </p>
    </div>
  )
}
