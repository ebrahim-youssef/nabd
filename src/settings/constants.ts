export const NATIVE_SETTINGS_COPY = {
  systemTheme: 'حسب الجهاز',
  notifications: {
    silentTitle: 'التنبيه ولو كان الجهاز صامتًا',
    silentBody: 'يشغّل الأذان عبر قناة المنبّه فيُسمع رغم الوضع الصامت أو الاهتزاز.',
    countdownTitle: 'إشعار العدّ التنازلي الدائم',
    countdownBody: 'إشعار مستمر يعرض ما مضى على الصلاة السابقة والوقت الباقي للصلاة التالية.',
    countdownBlocked: 'العدّ التنازلي متوقف من إعدادات الإشعارات في الهاتف.',
  },
  battery: {
    protectionEnabled: 'حماية التنبيهات مفعّلة.',
  },
  sounds: {
    title: 'أصوات التنبيهات',
    note: 'تتبع المعاينة مستوى صوت الوسائط ووضع الصامت في الهاتف؛ ارفع الصوت أو أوقف الوضع الصامت لسماعها.',
    play: 'تشغيل',
    stop: 'إيقاف',
    previews: {
      before: {
        label: 'اقتربت الصلاة',
        description: 'تكبير قصير للتنبيه قبل الأذان بربع ساعة.',
      },
      adhan: {
        label: 'الأذان',
        description: 'أذان منصور الزهراني.',
      },
      'adhan-fajr': {
        label: 'أذان الفجر',
        description: 'بلفظ «الصلاة خير من النوم».',
      },
      iqama: {
        label: 'الإقامة',
        description: 'إقامة الصلاة من المسجد الحرام.',
      },
    },
  },
} as const
