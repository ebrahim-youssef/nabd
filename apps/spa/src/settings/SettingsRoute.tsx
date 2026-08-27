import { shellCopy } from '@nabd/shared'

import { PageHeader } from '../app/PageHeader'
import { SettingsScreen } from './SettingsScreen'

export function SettingsRoute() {
  return (
    <div className="flex flex-col gap-6">
      <PageHeader title={shellCopy.nav.settings} backHref="/app" />
      <SettingsScreen />
    </div>
  )
}
