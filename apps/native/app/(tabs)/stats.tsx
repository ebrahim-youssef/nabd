import { shellCopy } from '@nabd/shared'

import { RouteStub } from '../../src/app/RouteStub'

// NBD-85 statistics and qada slices.
export default function StatsRoute() {
  return <RouteStub title={shellCopy.nav.stats} />
}
