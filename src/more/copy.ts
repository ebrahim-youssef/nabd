import { toArabicIndic } from '../lib/format'

export const MORE_COPY = {
  title: 'المزيد',
  day: 'يومك',
  library: 'المكتبة',
  application: 'التطبيق',
  prayerTimes: 'مواقيت الصلاة',
  stats: 'الإحصائيات',
  qada: 'قضاء الفوائت',
  intentions: 'مكتبة النوايا',
  intentionsDescription: 'نيّة مستحضرة لكل عمل',
  settings: 'الإعدادات',
  backup: 'النسخ الاحتياطي',
  appName: 'نبض',
} as const

export function formatStreak(count: number): string | undefined {
  if (count === 0) return undefined
  if (count === 1) return 'يوم واحد متتالٍ'
  if (count === 2) return 'يومان متتاليان'
  if (count % 100 >= 3 && count % 100 <= 10) return `${toArabicIndic(count)} أيام متتالية`
  return `${toArabicIndic(count)} يومًا متتاليًا`
}

export function formatQadaCount(count: number): string {
  if (count === 0) return 'لا فوائت'
  if (count === 1) return 'فائتة واحدة'
  if (count === 2) return 'فائتتان'
  if (count % 100 >= 3 && count % 100 <= 10) return `${toArabicIndic(count)} فوائت`
  return `${toArabicIndic(count)} فائتة`
}
