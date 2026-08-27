import {
  CalculationMethod,
  type CalculationParameters,
  Coordinates,
  Madhab,
  PrayerTimes,
} from 'adhan'

import type { Coords } from '../types/location'

// The adhan.js binding (ADR-0009), and the one place in the monorepo that turns coordinates into
// prayer times. It lives in `shared` rather than in each application because the two targets must
// never disagree about when Fajr is: a duplicated method table or a drifted default would give the
// same user two different prayer times on their phone and in their browser. The calculation is pure
// — coordinates, a date and a method id in, epoch milliseconds out — with no clock, storage or
// network, which is what lets both targets compute offline.
//
// `adhan` is this package's only runtime dependency. It qualifies as platform-neutral under
// ADR-0014: pure arithmetic over `Date`, with no DOM, Node or React Native API.

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

export function isCalculationMethodId(value: unknown): value is CalculationMethodId {
  return CALCULATION_METHODS.some((method) => method.id === value)
}

// An unknown id falls back to the default rather than throwing: the id reaches this function from
// device storage, where a stale or hand-edited value must degrade to Egyptian times instead of
// taking down the screen.
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
