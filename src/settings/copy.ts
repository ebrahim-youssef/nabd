export const SETTINGS_COPY = {
  location: {
    title: 'الموقع',
    heading: 'تحديد الموقع',
    body: 'يُستخدم لحساب مواقيت الصلاة على جهازك. لا يغادر الموقع جهازك ولا يُرفع لأي خادم.',
    enable: 'تفعيل تحديد الموقع',
    retry: 'إعادة المحاولة',
    granted: 'الموقع مُفعّل',
  },
  prayerMethod: {
    title: 'طريقة حساب المواقيت',
  },
  appearance: {
    title: 'نمط العرض',
    themeTitle: 'المظهر',
    light: 'فاتح',
    dark: 'ليلي',
  },
  level: {
    title: 'مستوى الورد',
    label: 'اختر مستوى الورد اليومي',
    hint: 'يبدأ الورد الجديد من الغد',
  },
  notifications: {
    heading: 'تنبيهات المواقيت والأذكار',
    foregroundOnly: 'تصل هذه التنبيهات ما دام الموقع مفتوحًا. لا تعمل بعد إغلاقه.',
    enable: 'تفعيل التنبيهات',
    blocked: 'حجب المتصفح تنبيهات هذا الموقع. فعّلها من إعدادات الموقع في المتصفح ثم عُد إلى هنا.',
    unsupported: 'التنبيهات غير متاحة في هذا المتصفح أو في هذه الصفحة غير الآمنة.',
    locationRequired: 'يلزم تفعيل تحديد الموقع من قسم المواقيت أولًا لحساب أوقات التنبيهات.',
    beforeAdhan: 'قبل الأذان بربع ساعة',
    atAdhan: 'عند الأذان',
    atIqamah: 'عند الإقامة',
    morningAdhkar: 'تذكير أذكار الصباح',
    eveningAdhkar: 'تذكير أذكار المساء',
  },
  groups: {
    prayerTimes: 'المواقيت',
    displayAndContent: 'العرض والمحتوى',
    notifications: 'التنبيهات',
  },
  links: {
    title: 'الوصول السريع',
  },
} as const

export const SETTINGS_LAYOUT_COPY = {
  title: 'الإعدادات',
  loading: 'جارٍ تحميل الإعدادات…',
  wird: 'الوِرد',
  data: 'بياناتك',
  backup: 'النسخ الاحتياطي',
  backupDescription: 'تصدير واستيراد ملف',
  locationDescription: 'على جهازك فقط',
  locationRefresh: 'تحديث الموقع',
  notificationsOff: 'فعّل التنبيهات أولًا.',
  masterDescription: 'تنبيهات الصلاة والأذكار على جهازك.',
  beforeAdhan: 'تنبيه قبل الصلاة بربع ساعة.',
  atAdhan: 'تنبيه عند دخول وقت الصلاة.',
  atIqamah: 'تنبيه عند وقت الإقامة.',
  morningAdhkar: 'تذكير بأذكار الصباح.',
  eveningAdhkar: 'تذكير بأذكار المساء.',
} as const

export const LEVEL_PAGE_COPY = {
  intro: 'اختر مستوى الورد اليومي. يبدأ الورد الجديد من الغد.',
  current: 'الحالي',
  save: 'حفظ — يبدأ من الغد',
  success: 'تم حفظ مستوى الورد. يبدأ من الغد.',
  failure: 'تعذّر حفظ مستوى الورد. حاول مرة أخرى.',
} as const
