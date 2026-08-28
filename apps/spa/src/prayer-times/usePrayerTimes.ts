import { useCallback, useEffect, useMemo, useState } from 'react'

import { computeDayTimes, PRAYER_LABELS, timelineStatus } from '@nabd/shared'
import type {
  CalculationMethodId,
  Coords,
  LocationRequest,
  TimePoint,
  TimelineStatus,
} from '@nabd/shared'

import { COORDS_EVENT, readCachedCoords, requestCoords } from './location'
import { METHOD_EVENT, readCalculationMethodId } from './prayerMethod'

const TICK_MS = 30_000
const MS_PER_DAY = 86_400_000

type PrayerTimesState = {
  // False until location is granted (cached or fresh) — the UI shows the quiet prompt then.
  hasLocation: boolean
  // Epoch-ms per prayer id for today (fajr…isha) when located.
  times: Record<string, number> | null
  status: TimelineStatus
  // Must be called from a user gesture (browser permission prompt). Resolves the full result so
  // callers can show the failure reason (denied vs unavailable — NBD-48).
  enableLocation: () => Promise<LocationRequest>
}

// Live prayer times for today (ADR-0009): coordinates from the local cache (or a one-tap permission
// flow), adhan.js math in the shared package, and a half-minute tick for the countdown line. Unlike
// the Next.js original there is no deferred read: the SPA has no server render to match, so the
// cached coordinates and method are read straight into the initial state.
export function usePrayerTimes(): PrayerTimesState {
  const [coords, setCoords] = useState<Coords | null>(readCachedCoords)
  const [methodId, setMethodId] = useState<CalculationMethodId>(readCalculationMethodId)
  const [now, setNow] = useState(() => Date.now())

  useEffect(() => {
    // A grant anywhere (the checklist sub-header, the dedicated page) reaches every mounted
    // instance — the per-prayer badges must not need a remount to show times. Same for the method.
    const onCoords = () => setCoords(readCachedCoords())
    const onMethod = () => setMethodId(readCalculationMethodId())
    window.addEventListener(COORDS_EVENT, onCoords)
    window.addEventListener(METHOD_EVENT, onMethod)
    return () => {
      window.removeEventListener(COORDS_EVENT, onCoords)
      window.removeEventListener(METHOD_EVENT, onMethod)
    }
  }, [])

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), TICK_MS)
    return () => window.clearInterval(timer)
  }, [])

  const enableLocation = useCallback(async () => {
    const result = await requestCoords()
    if (result.ok) setCoords(result.coords)
    return result
  }, [])

  const computed = useMemo(() => {
    if (!coords) return null
    const dayTimes = computeDayTimes(coords, new Date(now), methodId)
    const tomorrow = computeDayTimes(coords, new Date(now + MS_PER_DAY), methodId)
    const points: TimePoint[] = [
      ...Object.entries(dayTimes).map(([id, at]) => ({ id, label: PRAYER_LABELS[id], at })),
      // Tomorrow's fajr closes the timeline so the post-عشاء countdown has a target.
      { id: 'fajr', label: PRAYER_LABELS.fajr, at: tomorrow.fajr },
    ]
    return { dayTimes, points }
    // `now` ticks every 30s but the day's times only change at midnight; recomputing on tick
    // is cheap (<1ms) and keeps the midnight rollover automatic.
  }, [coords, methodId, now])

  return {
    hasLocation: coords !== null,
    times: computed ? { ...computed.dayTimes } : null,
    status: computed ? timelineStatus(computed.points, now) : null,
    enableLocation,
  }
}
