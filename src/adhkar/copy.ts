import { toArabicIndic } from '../lib/format'

export const ADHKAR_NATIVE_COPY = {
  completionFailed: 'تعذّر الحفظ، اضغط مرة أخرى.',
} as const

export const CATEGORY_TO_WIRD_ITEM: Record<string, string> = {
  morning: 'morning-adhkar',
  evening: 'evening-adhkar',
} as const

export const ONCE_DAILY_CATEGORIES: ReadonlySet<string> = new Set(['morning', 'evening'])
export const LIST_CATEGORIES: ReadonlySet<string> = new Set(['after-prayer', 'sleep'])
export const DAILY_CATEGORY_ID = 'daily'
export const STRIP_VISIBLE_COUNT = 3

export function formatAdhkarCount(count: number): string {
  const lastHundred = count % 100
  if (count === 1) return 'ذِكر واحد'
  if (count === 2) return 'ذِكران'
  if (lastHundred >= 3 && lastHundred <= 10) return `${toArabicIndic(count)} أذكار`
  if (count > 0 && lastHundred === 0) return `${toArabicIndic(count)} ذكر`
  return `${toArabicIndic(count)} ذكرًا`
}

export const COPY = {
  libraryTitle: 'الأذكار',
  hubDescription: 'أذكار الصباح والمساء وبعد الصلاة والنوم، بنصوصها ومصادرها.',
  nowInWird: 'الآن في وِردك',
  now: 'الآن',
  begin: 'ابدأ',
  continue: 'أكمل',
  footer: 'أذكار الصباح والمساء تُعلَّم في وِردك تلقائيًا عند إتمامها.',
  morningHint: 'من الفجر في وِردك',
  eveningHint: 'من العصر في وِردك',
  progress: (done: number, total: number) =>
    `${toArabicIndic(done)} من ${formatAdhkarCount(total)}`,
  readerFinishedTitle: 'أتممت أذكار هذا القسم',
  readerFinishedBody: 'جُعلت في ميزان حسناتك.',
  readerBack: 'العودة إلى الأذكار',
  readerNext: 'التالي',
  readerTapHint: 'اضغط في أي مكان من البطاقة للعدّ.',
  readerCount: (count: number, target: number) =>
    `${toArabicIndic(count)} من ${toArabicIndic(target)}`,
  allSectionAdhkar: 'كل أذكار القسم',
  sections: 'أقسام',
  adhkar: 'ذِكرًا',
  finished: 'أتممت أذكار هذا القسم — جُعلت في ميزان حسناتك.',
  markedInWird: 'وعُلّمت في وِردك تلقائيًا ✓',
  restart: 'إعادة',
  tapHint: 'اضغط البطاقة للعدّ',
  done: 'تمّ',
  reset: 'إعادة العدّ',
} as const
