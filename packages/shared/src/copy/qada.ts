import { DAYS_PER_MONTH, DAYS_PER_YEAR } from '../logic/qada'
import { toArabicIndic } from '../logic/format'

// Arabic copy for the قضاء الفوائت ledger (NBD-39). `remaining` is number agreement rather than a
// fixed string, so it carries its own test.
export const QADA_COPY = {
  pageTitle: 'قضاء الفوائت',
  statsDescription: 'قدّر ما فاتك من الصلوات واقضِه صلاةً صلاة.',
  intro:
    'قدّر المدة التي فاتتك فيها الصلاة، وسيوزّعها السجلّ على الصلوات الخمس — وكلما قضيت صلاةً أنقصها بضغطة.',
  empty: 'لا فوائت مسجّلة — أضف تقديرك لتبدأ.',
  addButton: 'إضافة فوائت',
  modalTitle: 'إضافة فوائت',
  // Derived from the constants, never hardcoded: the estimate is rough by nature, and stating the
  // factors in the sheet is what keeps the math predictable to the user.
  modalNote: `تُحسب السنة ${toArabicIndic(DAYS_PER_YEAR)} يومًا والشهر ${toArabicIndic(DAYS_PER_MONTH)} يومًا، وتُضاف الأيام لكل صلاة من الخمس.`,
  years: 'سنين',
  months: 'شهور',
  days: 'أيام',
  total: (days: number) => `= ${toArabicIndic(days)} يومًا لكل صلاة`,
  confirm: 'إضافة',
  cancel: 'إلغاء',
  pay: 'تم قضاء صلاة',
  // Arabic number agreement: ١ فائتة واحدة، ٢ فائتتان، ٣–١٠ فوائت، ١١+ فائتة.
  remaining: (count: number) => {
    if (count === 1) return 'فائتة واحدة'
    if (count === 2) return 'فائتتان'
    if (count <= 10) return `${toArabicIndic(count)} فوائت`
    return `${toArabicIndic(count)} فائتة`
  },
  done: 'لا فوائت ✦',
} as const
