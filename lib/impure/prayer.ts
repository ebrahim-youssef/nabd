import { CalculationMethod, Coordinates, Madhab, PrayerTimes } from 'adhan'

import type { Coords } from './location'

// adhan.js wrapper (ADR-0009): pure calculation, works offline, no API. Egyptian General
// Authority + Shafi are the fixed defaults for now; a method picker is a later ticket.

export type DayPrayerTimes = {
  fajr: number
  sunrise: number
  dhuhr: number
  asr: number
  maghrib: number
  isha: number
}

export function computeDayTimes(coords: Coords, date: Date): DayPrayerTimes {
  const params = CalculationMethod.Egyptian()
  params.madhab = Madhab.Shafi
  const times = new PrayerTimes(new Coordinates(coords.latitude, coords.longitude), date, params)
  return {
    fajr: times.fajr.getTime(),
    sunrise: times.sunrise.getTime(),
    dhuhr: times.dhuhr.getTime(),
    asr: times.asr.getTime(),
    maghrib: times.maghrib.getTime(),
    isha: times.isha.getTime(),
  }
}
