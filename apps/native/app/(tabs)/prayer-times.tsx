import { shellCopy } from '@nabd/shared'

import { RouteStub } from '../../src/app/RouteStub'

// NBD-85 prayer times slice.
export default function PrayerTimesRoute() {
  return <RouteStub title={shellCopy.nav.prayerTimes} />
}
