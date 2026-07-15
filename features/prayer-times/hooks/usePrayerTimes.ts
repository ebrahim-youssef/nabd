'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'

import { readCachedCoords, requestCoords, type Coords } from '@/lib/impure/location'
import { computeDayTimes } from '@/lib/impure/prayer'

import { PRAYER_LABELS } from '../constants'
import { timelineStatus } from '../logic'
import type { TimelineStatus, TimePoint } from '../types'

const TICK_MS = 30_000
const MS_PER_DAY = 86_400_000

type PrayerTimesState = {
  // Null until location is granted (cached or fresh) — the UI shows the quiet prompt then.
  hasLocation: boolean
  // Epoch-ms per prayer id for today (fajr…isha) when located.
  times: Record<string, number> | null
  status: TimelineStatus
  // Must be called from a user gesture (browser permission prompt). Resolves false on denial.
  enableLocation: () => Promise<boolean>
}

// Live prayer times for today (ADR-0009): coordinates from the local cache (or a one-tap
// permission flow), adhan.js math, and a minute-level tick for the sub-header status.
export function usePrayerTimes(): PrayerTimesState {
  const [coords, setCoords] = useState<Coords | null>(null)
  const [now, setNow] = useState(() => Date.now())

  useEffect(() => {
    // Deferred a tick: localStorage is client-only and the deferral keeps SSR markup and the
    // first client render identical (same pattern as the sync feature's initial kick).
    const timer = window.setTimeout(() => setCoords(readCachedCoords()), 0)
    return () => window.clearTimeout(timer)
  }, [])

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), TICK_MS)
    return () => window.clearInterval(timer)
  }, [])

  const enableLocation = useCallback(async () => {
    const granted = await requestCoords()
    if (granted) setCoords(granted)
    return granted !== null
  }, [])

  const computed = useMemo(() => {
    if (!coords) return null
    const today = new Date(now)
    const dayTimes = computeDayTimes(coords, today)
    const tomorrow = computeDayTimes(coords, new Date(now + MS_PER_DAY))
    const points: TimePoint[] = [
      ...Object.entries(dayTimes).map(([id, at]) => ({ id, label: PRAYER_LABELS[id], at })),
      // Tomorrow's fajr closes the timeline so the post-عشاء countdown has a target.
      { id: 'fajr', label: PRAYER_LABELS.fajr, at: tomorrow.fajr },
    ]
    return { dayTimes, points }
    // `now` ticks every 30s but the day's times only change at midnight; recomputing on tick
    // is cheap (<1ms) and keeps the midnight rollover automatic.
  }, [coords, now])

  return {
    hasLocation: coords !== null,
    times: computed ? { ...computed.dayTimes } : null,
    status: computed ? timelineStatus(computed.points, now) : null,
    enableLocation,
  }
}
