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

export const COPY = {
  libraryTitle: 'مكتبة الأذكار',
  hubDescription: 'أذكار الصباح والمساء وبعد الصلاة والنوم، بنصوصها ومصادرها.',
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
