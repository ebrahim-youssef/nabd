import { shellCopy } from '@nabd/shared'

import { PageHeader } from './PageHeader'

// Bounded placeholders for the four sub-navigation sections. They fix the shell structure
// (sticky back header + card surface) without pretending to be product screens; each
// section's real screens arrive with NBD-84.
const PLACEHOLDER_NOTE = 'هذه الشاشة مؤقتة في هيكل التطبيق الجديد، وتصلك كاملة في ترقية قريبة.'

export function AppPlaceholder({ title }: { title: string }) {
  return (
    <div className="flex flex-col gap-6">
      <PageHeader title={title} backHref="/app" />
      <div className="flex flex-col gap-3 rounded-card border border-border bg-surface p-6 shadow-card-sm">
        <p className="m-0 text-body text-foreground">{PLACEHOLDER_NOTE}</p>
      </div>
    </div>
  )
}

export function LibrariesRoute() {
  return <AppPlaceholder title={shellCopy.nav.libraries} />
}

export function PrayerTimesRoute() {
  return <AppPlaceholder title={shellCopy.nav.prayerTimes} />
}

export function StatsRoute() {
  return <AppPlaceholder title={shellCopy.nav.stats} />
}

export function SettingsRoute() {
  return <AppPlaceholder title={shellCopy.nav.settings} />
}
