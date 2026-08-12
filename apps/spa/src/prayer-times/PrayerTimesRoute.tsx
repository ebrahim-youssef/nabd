import { shellCopy } from '@nabd/shared'

import { PrayerTimesToday } from './PrayerTimesToday'
import { PageHeader } from '../app/PageHeader'

export function PrayerTimesRoute() {
  return (
    <div className="flex flex-col gap-6">
      <PageHeader title={shellCopy.nav.prayerTimes} backHref="/app" />
      <PrayerTimesToday />
    </div>
  )
}
