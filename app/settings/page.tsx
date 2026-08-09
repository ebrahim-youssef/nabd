import type { Metadata } from 'next'
import type { ReactNode } from 'react'

import { PageHeader } from '@/components/shared/PageHeader'
import { AppearanceSettings } from '@/features/settings/components/AppearanceSettings'
import { BatterySettings } from '@/features/settings/components/BatterySettings'
import { LevelSettings } from '@/features/settings/components/LevelSettings'
import { LocationSettings } from '@/features/settings/components/LocationSettings'
import { PrayerMethodSettings } from '@/features/settings/components/PrayerMethodSettings'
import { NotificationSettings } from '@/features/settings/components/NotificationSettings'
import { SoundSettings } from '@/features/settings/components/SoundSettings'

export const metadata: Metadata = {
  title: 'الإعدادات',
  description: 'إعدادات نبض — نمط العرض والمظهر.',
  alternates: { canonical: '/settings' },
}

// Settings page (NBD-37): device-local preferences. النمط lives here; the light/dark toggle
// lives in the home header. Grouped into three labelled blocks (NBD-71) so the growing list
// reads by topic — المواقيت (location + calc method), التنبيهات (notifications + sounds +
// battery), العرض والمحتوى (appearance + wird level). The section components are unchanged;
// only the page arranges them into groups.
function SettingsGroup({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-4">
      <h2 className="text-label text-muted-foreground font-semibold">{title}</h2>
      {children}
    </section>
  )
}

export default function SettingsPage() {
  return (
    <main className="mx-auto flex w-full max-w-2xl flex-col gap-8 px-4 pb-10 md:px-6">
      <PageHeader title="الإعدادات" backHref="/" />
      <SettingsGroup title="المواقيت">
        <LocationSettings />
        <PrayerMethodSettings />
      </SettingsGroup>
      <SettingsGroup title="التنبيهات">
        <NotificationSettings />
        <SoundSettings />
        <BatterySettings />
      </SettingsGroup>
      <SettingsGroup title="العرض والمحتوى">
        <AppearanceSettings />
        <LevelSettings />
      </SettingsGroup>
    </main>
  )
}
