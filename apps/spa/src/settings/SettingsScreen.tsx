import { SETTINGS_COPY } from '@nabd/shared'
import type { ReactNode } from 'react'

import { AppearanceSettings } from './AppearanceSettings'
import { LevelSettings } from './LevelSettings'
import { LocationSettings } from './LocationSettings'
import { PrayerMethodSettings } from './PrayerMethodSettings'

// Device-local preferences (NBD-37), grouped by topic (NBD-71) so the list reads by subject rather
// than as one long column. Legacy carries a third «التنبيهات» group — notifications, sounds and the
// battery exemption. Foreground browser notifications arrive in a later slice; sounds, alarm channels
// and the battery exemption belong to the native target under ADR-0014 and never appear here. The
// light/dark toggle stays in the app header, as it does in the reference.
function SettingsGroup({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-4">
      <h2 className="text-label font-semibold text-muted-foreground">{title}</h2>
      {children}
    </section>
  )
}

export function SettingsScreen() {
  return (
    <div className="flex flex-col gap-8">
      <SettingsGroup title={SETTINGS_COPY.groups.prayerTimes}>
        <LocationSettings />
        <PrayerMethodSettings />
      </SettingsGroup>
      <SettingsGroup title={SETTINGS_COPY.groups.displayAndContent}>
        <AppearanceSettings />
        <LevelSettings />
      </SettingsGroup>
    </div>
  )
}
