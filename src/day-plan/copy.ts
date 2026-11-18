import type { PrayerId, TimedActId } from './types'

export const PRAYER_LABELS: Record<PrayerId, string> = {
  fajr: 'الفجر',
  dhuhr: 'الظهر',
  asr: 'العصر',
  maghrib: 'المغرب',
  isha: 'العشاء',
}

export const FRIDAY_DHUHR_LABEL = 'الجمعة / الظهر'

export const TIMED_ACT_LABELS: Record<TimedActId, string> = {
  'morning-adhkar': 'أذكار الصباح',
  duha: 'صلاة الضحى',
  'evening-adhkar': 'أذكار المساء',
  qiyam: 'قيام الليل',
}

export const DAY_MARKER_LABELS = {
  fajr: 'الفجر',
  sunrise: 'الشروق',
  dhuhr: 'الظهر',
  asr: 'العصر',
  maghrib: 'المغرب',
  isha: 'العشاء',
  middleOfNight: 'منتصف الليل',
  lastThird: 'الثلث الأخير',
} as const
