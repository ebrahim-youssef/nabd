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
