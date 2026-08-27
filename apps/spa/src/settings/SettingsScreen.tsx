import { SETTINGS_COPY } from '@nabd/shared'
import type { ReactNode } from 'react'

import { AppearanceSettings } from './AppearanceSettings'
import { LevelSettings } from './LevelSettings'
import { LocationSettings } from './LocationSettings'
import { PrayerMethodSettings } from './PrayerMethodSettings'
import { NotificationSettings } from './NotificationSettings'

// Device-local preferences (NBD-37), grouped by topic (NBD-71) so the list reads by subject rather
// than as one long column. The third «التنبيهات» group provides foreground browser reminders only;
// sounds, alarm channels and battery exemption belong to native under ADR-0014. The light/dark
// toggle stays in the app header, as it does in the reference.
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
      <SettingsGroup title={SETTINGS_COPY.groups.notifications}>
        <NotificationSettings />
      </SettingsGroup>
    </div>
  )
}
