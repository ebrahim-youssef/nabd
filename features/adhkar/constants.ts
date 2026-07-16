// Guided-flow wiring (NBD-29): which adhkar category auto-marks which wird item, and the
// flow's copy. Categories without a mapping (بعد الصلاة، النوم) still offer the flow — they
// just have nothing to mark.
export const CATEGORY_TO_WIRD_ITEM: Record<string, string> = {
  morning: 'morning-adhkar',
  evening: 'evening-adhkar',
}

// أذكار الصباح/المساء are said once a day (NBD-41, r4 §7): their flow position survives
// reloads for the current day. Repeatable categories (بعد الصلاة، النوم) reset every visit
// on purpose — deliberately separate from CATEGORY_TO_WIRD_ITEM, which is about auto-marking.
export const ONCE_DAILY_CATEGORIES: ReadonlySet<string> = new Set(['morning', 'evening'])

// How many upcoming mini-cards the strip shows (design-notes-r3 §4).
export const STRIP_VISIBLE_COUNT = 3

export const COPY = {
  finished: 'أتممت أذكار هذا القسم — جُعلت في ميزان حسناتك.',
  markedInWird: 'وعُلّمت في وِردك تلقائيًا ✓',
  restart: 'إعادة',
  tapHint: 'اضغط البطاقة للعدّ',
} as const
