export const TODAY_COPY = {
  title: 'اليوم',
  previousDay: 'اليوم السابق',
  nextDay: 'اليوم التالي',
  anyTime: 'في أي وقت',
  monthly: 'هذا الشهر',
  until: 'حتى',
  recorded: 'سُجّل',
  loadFailed: 'تعذّر تحميل اليوم. حاول مرة أخرى.',
  retry: 'إعادة المحاولة',
  unavailable: 'لا توجد خطة لهذا اليوم.',
  saveFailed: (label: string) => `تعذّر حفظ ${label}. حاول مرة أخرى.`,
} as const

export function daySpan(weekday: string, nextWeekday: string): string {
  return `من فجر ${weekday} إلى فجر ${nextWeekday}`
}
