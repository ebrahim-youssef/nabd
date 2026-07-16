import type { Metadata } from 'next'

import { PageHeader } from '@/components/shared/PageHeader'
import { PrayerTimesToday } from '@/features/prayer-times/components/PrayerTimesToday'

export const metadata: Metadata = {
  title: 'مواقيت الصلاة',
  description: 'مواقيت الصلاة لليوم حسب موقعك — الفجر والشروق والظهر والعصر والمغرب والعشاء.',
  alternates: { canonical: '/prayer-times' },
}

// Dedicated مواقيت الصلاة page (NBD-38, design-r3 §2): the full day at a glance, beyond the
// in-checklist sub-header.
export default function PrayerTimesPage() {
  return (
    <main className="mx-auto flex w-full max-w-2xl flex-col gap-6 px-4 pb-10 md:px-6">
      <PageHeader title="مواقيت الصلاة" backHref="/" />
      <PrayerTimesToday />
    </main>
  )
}
