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
    classic: {
      title: 'كلاسيكي',
      description: 'خطّ رقعة تراثيّ وزوايا هادئة.',
    },
    modern: {
      title: 'عصري',
      description: 'خطّ كوفيّ هندسيّ وزوايا أوضح.',
    },
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
} as const
