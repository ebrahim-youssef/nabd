import type { Metadata } from 'next'

import { PageHeader } from '@/components/shared/PageHeader'
import { AppearanceSettings } from '@/features/settings/components/AppearanceSettings'
import { BatterySettings } from '@/features/settings/components/BatterySettings'
import { LocationSettings } from '@/features/settings/components/LocationSettings'
import { PrayerMethodSettings } from '@/features/settings/components/PrayerMethodSettings'
import { SoundSettings } from '@/features/settings/components/SoundSettings'

export const metadata: Metadata = {
  title: 'الإعدادات',
  description: 'إعدادات نبض — نمط العرض والمظهر.',
  alternates: { canonical: '/settings' },
}

// Settings page (NBD-37): device-local preferences. النمط lives here; the light/dark toggle
// lives in the home header. NBD-38 adds the prayer-time calculation method, NBD-42 the
// notification sounds.
export default function SettingsPage() {
  return (
    <main className="mx-auto flex w-full max-w-2xl flex-col gap-6 px-4 pb-10 md:px-6">
      <PageHeader title="الإعدادات" backHref="/" />
      <AppearanceSettings />
      <LocationSettings />
      <PrayerMethodSettings />
      <SoundSettings />
      <BatterySettings />
    </main>
  )
}
