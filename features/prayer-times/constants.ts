// Prayer-times copy + fixed parameters (ADR-0009).

export const PRAYER_LABELS: Record<string, string> = {
  fajr: 'الفجر',
  sunrise: 'الشروق',
  dhuhr: 'الظهر',
  asr: 'العصر',
  maghrib: 'المغرب',
  isha: 'العشاء',
}

// Iqamah offsets after the adhan, minutes (ADR-0009 table). Used by notifications (NBD-28).
export const IQAMAH_OFFSET_MINUTES: Record<string, number> = {
  fajr: 15,
  dhuhr: 15,
  asr: 15,
  maghrib: 10,
  isha: 15,
}

export const COPY = {
  enableLocation: 'فعّل الموقع لعرض مواقيت الصلاة',
  locationDenied: 'تعذّر الوصول إلى الموقع — لن تظهر مواقيت الصلاة.',
} as const

// Minutes before the adhan for the early reminder (ADR-0009).
export const BEFORE_ADHAN_MINUTES = 15

// Android notification channels for the native shell (NBD-46): the channel decides the
// sound that plays with the app fully closed. Files live in android/.../res/raw.
export const ALARM_CHANNELS = {
  before: { id: 'prayer-before', name: 'اقتربت الصلاة', sound: 'before.mp3' },
  adhan: { id: 'prayer-adhan', name: 'الأذان', sound: 'adhan.mp3' },
  adhanFajr: { id: 'prayer-adhan-fajr', name: 'أذان الفجر', sound: 'adhan_fajr.mp3' },
  iqamah: { id: 'prayer-iqamah', name: 'الإقامة', sound: 'iqama.mp3' },
} as const

// How far ahead the native shell schedules exact alarms (r4 §5): every launch re-arms the
// window, which also covers Android dropping alarms on reboot.
export const NATIVE_SCHEDULE_DAYS = 3

export const NOTIFICATION_COPY = {
  before: (label: string) => ({
    title: `اقترب وقت ${label}`,
    body: `باقي ربع ساعة على أذان ${label}.`,
  }),
  adhan: (label: string) => ({
    title: `حان وقت ${label}`,
    body: `أذّن ${label} — حيّ على الصلاة.`,
  }),
  iqamah: (label: string) => ({
    title: `إقامة ${label}`,
    body: `حان وقت إقامة صلاة ${label}.`,
  }),
} as const
