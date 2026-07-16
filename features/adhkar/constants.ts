// Guided-flow wiring (NBD-29): which adhkar category auto-marks which wird item, and the
// flow's copy. Categories without a mapping (بعد الصلاة، النوم) still offer the flow — they
// just have nothing to mark.
export const CATEGORY_TO_WIRD_ITEM: Record<string, string> = {
  morning: 'morning-adhkar',
  evening: 'evening-adhkar',
}

// How many upcoming mini-cards the strip shows (design-notes-r3 §4).
export const STRIP_VISIBLE_COUNT = 3

export const COPY = {
  finished: 'أتممت أذكار هذا القسم — جُعلت في ميزان حسناتك.',
  markedInWird: 'وعُلّمت في وِردك تلقائيًا ✓',
  restart: 'إعادة',
  tapHint: 'اضغط البطاقة للعدّ',
} as const
