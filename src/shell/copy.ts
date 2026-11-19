// Arabic application-shell copy and the reusable back/loading/retry/error/not-found lines.
export const shellCopy = {
  appName: 'نبض',
  navAriaLabel: 'التنقل الرئيسي',
  nav: {
    home: 'الرئيسية',
    today: 'اليوم',
    adhkar: 'الأذكار',
    more: 'المزيد',
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

// In forced RTL, the first tab renders at the right edge.
export const NAV_ORDER = ['home', 'today', 'adhkar', 'more'] as const

export type ShellNavKey = (typeof NAV_ORDER)[number]
