import { toArabicIndic } from '../lib/format'

export const STATS_COPY = {
  pageTitle: 'الإحصائيات',
  weekTitle: 'إتمام الوِرد — آخر ٧ أيام',
  today: 'اليوم',
  lastMonth: 'آخر ٣٠ يومًا',
  completedDays: 'أيام مكتملة',
  qada: 'قضاء الفوائت',
  openLedger: 'افتح السجل',
  itemSubtitle: 'ما أدّيته وما فاتك لكل عنصر',
  emptyTitle: 'تبدأ إحصاءاتك من اليوم',
  emptyBody: 'علّم ما تؤدّيه من وِردك، وتظهر هنا سلسلتك ونسبة إتمامك بعد أول يوم.',
  openToday: 'افتح اليوم',
  best: (count: string) => `أفضل سلسلة: ${count}`,
  countOf: (done: string, total: string) => `${done} من ${total}`,
  streakPlural: 'أيام',
  streakSuffix: 'متتالية',
  streakPrompt: 'أكمل وِرد اليوم لتُبقي الشعلة مشتعلة',
  todayDetail: 'اليوم بالتفصيل',
  itemStats: 'محاسبة العناصر',
  voluntary: 'تطوّع',
  optionalStats: (done: string, streak: string) => `أُدّيت ${done} — أطول تتابع ${streak}`,
  attainment: (done: string, window: string) => ` — أيام الاستهداف ${done}/${window}`,
  consecutive: 'متتالية',
  missed: 'فات',
  day: 'يوم',
  exportData: 'تصدير بياناتك',
  exportWeek: 'تصدير آخر أسبوع',
  exportMonth: 'تصدير آخر شهر',
} as const

export function formatWeekSummary(completedDays: number, todayPercent: number): string {
  const days = completedDays === 1 ? 'يومًا' : completedDays === 2 ? 'يومين' : 'أيام'
  return `أتممت وِردك ${toArabicIndic(completedDays)} ${days} من ٧، واليوم ${toArabicIndic(todayPercent)}٪ حتى الآن.`
}
