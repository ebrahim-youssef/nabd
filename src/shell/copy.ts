// Arabic application-shell copy: the five bottom-nav labels shared by every client shell,
// plus the reusable back/loading/retry/error/not-found lines. Kept here so web and native
// never diverge on navigation wording. Route paths and icons stay client-specific.
export const shellCopy = {
  appName: 'نبض',
  navAriaLabel: 'التنقل الرئيسي',
  nav: {
    libraries: 'المكتبات',
    prayerTimes: 'المواقيت',
    home: 'الرئيسية',
    stats: 'الإحصائيات',
    settings: 'الإعدادات',
  },
  back: 'رجوع',
  themeToggle: 'تبديل المظهر الليلي',
  loading: 'جارٍ التحميل…',
  retry: 'إعادة المحاولة',
  error: 'حدث خطأ ما. حاول مرة أخرى.',
  notFound: 'الصفحة غير موجودة',
  appNotFoundHint: 'هذا الجزء من التطبيق لم يُبنَ بعد.',
  publicNotFoundHint: 'الصفحة التي طلبتها غير موجودة.',
  returnHome: 'العودة إلى الرئيسية',
  returnLanding: 'العودة إلى الصفحة الرئيسية',
} as const

// Navigation order follows the fixed five-item pill (r6 §2-amendment): libraries, prayer
// times, centered home, statistics, settings.
export const NAV_ORDER = ['libraries', 'prayerTimes', 'home', 'stats', 'settings'] as const

export type ShellNavKey = (typeof NAV_ORDER)[number]
