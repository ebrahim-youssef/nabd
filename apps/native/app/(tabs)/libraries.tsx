import { shellCopy } from '@nabd/shared'

import { RouteStub } from '../../src/app/RouteStub'

// NBD-85 libraries and adhkar slices.
export default function LibrariesRoute() {
  return <RouteStub title={shellCopy.nav.libraries} />
}
