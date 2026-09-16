import { shellCopy } from '@nabd/shared'

import { RouteStub } from '../../src/app/RouteStub'

// NBD-85 settings slice.
export default function SettingsRoute() {
  return <RouteStub title={shellCopy.nav.settings} />
}
