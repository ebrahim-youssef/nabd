import { MapPin, Sunrise } from 'lucide-react'
import { useState } from 'react'

import { LOCATION_FAILURE_COPY, PRAYER_LABELS, PRAYER_TIMES_COPY, statusLine } from '@nabd/shared'
import type { LocationFailure } from '@nabd/shared'

import { usePrayerTimes } from './usePrayerTimes'

const TIME_FORMAT = new Intl.DateTimeFormat('ar-EG', { hour: 'numeric', minute: '2-digit' })
const DAY_POINTS = ['fajr', 'sunrise', 'dhuhr', 'asr', 'maghrib', 'isha'] as const

export function PrayerTimesToday() {
  const { hasLocation, times, status, enableLocation } = usePrayerTimes()
  const [failure, setFailure] = useState<LocationFailure | null>(null)

  if (!hasLocation || !times) {
    async function enable() {
      const result = await enableLocation()
      setFailure(result.ok ? null : result.reason)
    }

    return (
      <div className="flex flex-col gap-3">
        <button
          type="button"
          onClick={() => void enable()}
          data-testid="enable-location-page"
          className="flex flex-col items-center gap-3 rounded-card border border-border bg-surface p-8 text-center shadow-card-small transition-all hover:border-accent/40"
        >
          <span
            className="flex size-14 items-center justify-center rounded-icon bg-primary/10 text-primary"
            aria-hidden
          >
            <MapPin className="size-6" />
          </span>
          <span className="text-body font-medium text-foreground">
            {PRAYER_TIMES_COPY.enableLocation}
          </span>
          <span className="text-small text-muted-foreground">
            الموقع يُحفظ على جهازك فقط، ولا يغادر المتصفح.
          </span>
        </button>
        {failure && (
          <p className="text-center text-small text-gold" data-testid="location-failure-page">
            {LOCATION_FAILURE_COPY[failure]}
          </p>
        )}
      </div>
    )
  }

  const line = statusLine(status)
  const announcedId = status?.kind === 'since' ? status.point.id : null
  const nextId = status?.kind === 'until' ? status.point.id : null

  return (
    <div className="flex flex-col gap-4" data-testid="prayer-times-today">
      {line && (
        <p className="pattern-khatam rounded-card p-4 text-center text-body font-medium text-on-primary shadow-card">
          {line}
        </p>
      )}
      <ul className="flex flex-col gap-2">
        {DAY_POINTS.map((id) => {
          const at = times[id]
          const isSunrise = id === 'sunrise'
          const isAnnounced = id === announcedId
          const isNext = id === nextId
          return (
            <li
              key={id}
              data-testid={`time-row-${id}`}
              className={`flex items-center justify-between gap-3 rounded-card border p-4 transition-colors ${
                isAnnounced
                  ? 'border-primary/40 bg-primary/10'
                  : 'border-border bg-surface shadow-card-small'
              } ${isSunrise ? 'opacity-80' : ''}`}
            >
              <span className="flex min-w-0 items-center gap-2.5">
                {isSunrise && <Sunrise aria-hidden className="size-4.5 shrink-0 text-gold" />}
                <span
                  className={`text-body font-medium ${
                    isAnnounced ? 'text-primary' : 'text-foreground'
                  } ${isSunrise ? 'text-muted-foreground' : ''}`}
                >
                  {PRAYER_LABELS[id]}
                </span>
                {isAnnounced && (
                  <span className="shrink-0 rounded-chip border border-primary/40 bg-primary/10 px-2 py-0.5 text-small text-primary">
                    الآن
                  </span>
                )}
                {isNext && (
                  <span className="shrink-0 rounded-chip border border-gold/40 bg-gold-soft px-2 py-0.5 text-small text-gold">
                    التالي
                  </span>
                )}
              </span>
              <span
                data-testid={`time-value-${id}`}
                className="shrink-0 text-body font-medium tabular-nums text-foreground"
              >
                {TIME_FORMAT.format(at)}
              </span>
            </li>
          )
        })}
      </ul>
      <p className="text-label text-muted-foreground">
        تُحسب المواقيت على جهازك (adhan.js) حسب موقعك وطريقة الحساب المختارة في الإعدادات.
      </p>
    </div>
  )
}
