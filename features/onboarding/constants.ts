import type { Question } from './types'

// The onboarding questionnaire content (NBD-6). Three short questions covering the three
// wird pillars from the spec — prayers, Quran, adhkar. Option scores feed recommendLevel in
// logic.ts.

export const QUESTIONS: Question[] = [
  {
    id: 'prayers',
    prompt: 'كيف حالك مع الصلوات الخمس؟',
    options: [
      { id: 'always', label: 'أُصلّيها كلَّها في وقتها', score: 2 },
      { id: 'mostly', label: 'أُصلّيها وقد يفوتني بعضها', score: 1 },
      { id: 'struggling', label: 'أُجاهد نفسي عليها', score: 0 },
    ],
  },
  {
    id: 'quran',
    prompt: 'كم تقرأ من القرآن يوميًا؟',
    options: [
      { id: 'hizb', label: 'حزبًا أو أكثر', score: 2 },
      { id: 'pages', label: 'صفحات قليلة', score: 1 },
      { id: 'rarely', label: 'لا أقرأ بانتظام', score: 0 },
    ],
  },
  {
    id: 'adhkar',
    prompt: 'هل تواظب على أذكار الصباح والمساء؟',
    options: [
      { id: 'daily', label: 'أواظب عليها يوميًا', score: 2 },
      { id: 'sometimes', label: 'أحيانًا', score: 1 },
      { id: 'rarely', label: 'نادرًا', score: 0 },
    ],
  },
]

export const COPY = {
  title: 'أهلًا بك في نبض',
  intro: 'أجب عن ثلاثة أسئلة قصيرة لنقترح عليك وِردًا يناسب حالك.',
  submit: 'اقترح لي وِردًا',
  recommendationTitle: 'نقترح لك هذا المستوى',
  otherLevels: 'أو اختر مستوى آخر:',
  confirm: 'متابعة',
  seedError: 'تعذّر إنشاء الوِرد. يُرجى المحاولة مرّة أخرى.',
  // Permissions step (ADR-0009).
  permissionsTitle: 'خطوة أخيرة',
  locationHeading: 'الموقع — لمواقيت الصلاة',
  locationBody: 'يُحسب الأذان على جهازك ولا يغادر موقعك الجهاز أبدًا. بدونه لن تظهر المواقيت.',
  locationButton: 'تفعيل الموقع',
  locationGranted: 'تم تفعيل الموقع ✓',
  notificationsHeading: 'التنبيهات — اختياري',
  notificationsBody: 'نُنبّهك قبل الأذان وعنده وعند الإقامة. قد لا تصل التنبيهات والتطبيق مغلق.',
  notificationsToggle: 'تفعيل تنبيهات الصلاة',
  notificationsDenied: 'رفض المتصفح إذن التنبيهات — يمكنك تفعيله لاحقًا من إعدادات المتصفح.',
  momentBefore: 'قبل الأذان بربع ساعة',
  momentAdhan: 'عند الأذان',
  momentIqamah: 'عند الإقامة',
  finish: 'ابدأ وِردي',
} as const
