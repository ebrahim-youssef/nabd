import type { LocationFailure } from '../types/location'

// Per-reason user-facing copy, shared by every surface with an enable button (the prayer-times
// page, settings, onboarding) so the same failure never reads differently across the app.
export const LOCATION_FAILURE_COPY: Record<LocationFailure, string> = {
  'services-disabled': 'خدمة الموقع (GPS) مغلقة — فعّلها عند ظهور التنبيه ثم أعد المحاولة.',
  denied: 'تم رفض صلاحية الموقع — امنح التطبيق صلاحية الموقع ثم أعد المحاولة.',
  unavailable: 'تعذّر الحصول على الموقع — أعد المحاولة لاحقًا.',
}
