import {
  CalculationMethod,
  type CalculationParameters,
  Coordinates,
  Madhab,
  PrayerTimes,
} from 'adhan'

import type { Coords } from './location'

// adhan.js wrapper (ADR-0009, method picker NBD-38): pure calculation, works offline, no
// API. The calculation method is a device preference (localStorage, never synced — same
// convention as coordinates); Egyptian + Shafi stay the defaults.

export type DayPrayerTimes = {
  fajr: number
  sunrise: number
  dhuhr: number
  asr: number
  maghrib: number
  isha: number
}

export type CalculationMethodId =
  | 'egyptian'
  | 'umm_al_qura'
  | 'muslim_world_league'
  | 'north_america'
  | 'dubai'
  | 'kuwait'
  | 'qatar'
  | 'karachi'
  | 'turkey'
  | 'singapore'

export const DEFAULT_METHOD_ID: CalculationMethodId = 'egyptian'

// Ordered for the settings list: the regional defaults our users most likely need first.
export const CALCULATION_METHODS: {
  id: CalculationMethodId
  label: string
  create: () => CalculationParameters
}[] = [
  { id: 'egyptian', label: 'الهيئة المصرية العامة للمساحة', create: CalculationMethod.Egyptian },
  { id: 'umm_al_qura', label: 'أم القرى (مكة المكرمة)', create: CalculationMethod.UmmAlQura },
  {
    id: 'muslim_world_league',
    label: 'رابطة العالم الإسلامي',
    create: CalculationMethod.MuslimWorldLeague,
  },
  { id: 'dubai', label: 'الإمارات (دبي)', create: CalculationMethod.Dubai },
  { id: 'kuwait', label: 'الكويت', create: CalculationMethod.Kuwait },
  { id: 'qatar', label: 'قطر', create: CalculationMethod.Qatar },
  { id: 'karachi', label: 'جامعة العلوم الإسلامية بكراتشي', create: CalculationMethod.Karachi },
  { id: 'turkey', label: 'تركيا (ديانت)', create: CalculationMethod.Turkey },
  { id: 'singapore', label: 'سنغافورة', create: CalculationMethod.Singapore },
  {
    id: 'north_america',
    label: 'الجمعية الإسلامية لأمريكا الشمالية (إسنا)',
    create: CalculationMethod.NorthAmerica,
  },
]

const METHOD_STORAGE_KEY = 'nabd:calc-method'

// Fired on window after the method changes so every mounted consumer (badges, the dedicated
// page, the scheduler) recomputes without a remount — same shape as COORDS_EVENT.
export const METHOD_EVENT = 'nabd:calc-method'

function isMethodId(value: string | null): value is CalculationMethodId {
  return CALCULATION_METHODS.some((method) => method.id === value)
}

export function readCalculationMethodId(): CalculationMethodId {
  try {
    const raw = window.localStorage.getItem(METHOD_STORAGE_KEY)
    return isMethodId(raw) ? raw : DEFAULT_METHOD_ID
  } catch {
    return DEFAULT_METHOD_ID
  }
}

export function applyCalculationMethodId(id: CalculationMethodId): void {
  try {
    window.localStorage.setItem(METHOD_STORAGE_KEY, id)
  } catch {
    // Losing the preference only costs re-picking it next session.
  }
  window.dispatchEvent(new Event(METHOD_EVENT))
}

export function computeDayTimes(
  coords: Coords,
  date: Date,
  methodId: CalculationMethodId = DEFAULT_METHOD_ID,
): DayPrayerTimes {
  const method =
    CALCULATION_METHODS.find((entry) => entry.id === methodId) ?? CALCULATION_METHODS[0]
  const params = method.create()
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
