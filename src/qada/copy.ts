import { DAYS_PER_MONTH, DAYS_PER_YEAR } from './logic'
import { toArabicIndic } from '../lib/format'
import { formatQadaCount } from '../more/copy'

export const QADA_COPY = {
  pageTitle: 'قضاء الفوائت',
  statsDescription: 'قدّر ما فاتك من الصلوات واقضِه صلاةً صلاة.',
  intro:
    'قدّر المدة التي فاتتك فيها الصلاة، وسيوزّعها السجلّ على الصلوات الخمس — وكلما قضيت صلاةً أنقصها بضغطة.',
  addDescription: 'قدّر المدة التي فاتتك فيها الصلاة، وسيوزّعها السجلّ على الصلوات الخمس.',
  emptyTitle: 'لا فوائت مسجّلة',
  remainingLabel: 'المتبقي',
  addButton: 'إضافة فوائت',
  modalTitle: 'إضافة فوائت',
  modalNote: `تُحسب السنة ${toArabicIndic(DAYS_PER_YEAR)} يومًا والشهر ${toArabicIndic(DAYS_PER_MONTH)} يومًا، وتُضاف الأيام لكل صلاة من الخمس.`,
  years: 'سنين',
  months: 'شهور',
  days: 'أيام',
  total: (days: number) => `لكل صلاة = ${toArabicIndic(days)} يومًا`,
  confirm: 'إضافة',
  cancel: 'إلغاء',
  pay: 'تم قضاء صلاة',
  payPrayer: (prayer: string) => `تم قضاء صلاة ${prayer}`,
  paid: (prayer: string, count: number) => `قُضيت صلاة ${prayer} · بقي ${toArabicIndic(count)}`,
  added: 'أُضيفت الفوائت',
  writeError: 'تعذّر الحفظ. حاول مرة أخرى.',
  remaining: formatQadaCount,
  done: 'لا فوائت',
} as const
