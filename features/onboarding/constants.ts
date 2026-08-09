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
  // Welcome / purpose screen (NBD-30): what the app is for, before any question.
  welcomeBody:
    'نبض رفيقك اليوميّ للوِرد: تتعهّد بوِردٍ يناسبك، تعلّم عليه يومًا بيوم، وتحاسب نفسك بإحصاءاتٍ تُريك أين أنت وأين تحتاج أن تجتهد.',
  welcomePoints: [
    'وِرد يومي على قدر حالك — صلوات وقرآن وأذكار وتطوّع',
    'مواقيت الصلاة وتنبيهاتها على جهازك',
    'إحصاءات ومحاسبة: ما التزمت به، وما فاتك، وأين تتقدّم',
  ],
  welcomeStart: 'لنبدأ',
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
  momentMorningAdhkar: 'تذكير أذكار الصباح',
  momentEveningAdhkar: 'تذكير أذكار المساء',
  // Battery-saver step (NBD-58, native only): some phones silence background alarms to save
  // power, so the adhan may not fire with the app closed. This step asks the user to exempt نبض.
  powerTitle: 'حماية التنبيهات',
  powerBody:
    'بعض الأجهزة توقف التطبيقات في الخلفية لتوفير البطارية، فقد لا يصلك الأذان والتطبيق مغلق. فعّل الحماية لتصل التنبيهات في وقتها.',
  powerSteps: [
    'اضغط «تفعيل الحماية» ثم اسمح لنبض بتجاهل توفير البطارية',
    'إن لم يظهر الإذن: الإعدادات ← البطارية ← نبض ← «غير مُقيَّد»',
    'على بعض الأجهزة (شاومي/أوبو/هواوي): فعّل «التشغيل التلقائي» لنبض',
  ],
  powerButton: 'تفعيل الحماية',
  finish: 'ابدأ وِردي',
} as const
