import { shellCopy } from '@nabd/shared'

import { PageHeader } from '../app/PageHeader'
import { WirdStats } from './WirdStats'

export function StatsRoute() {
  return (
    <div className="flex flex-col gap-6">
      <PageHeader title={shellCopy.nav.stats} backHref="/app" />
      <WirdStats />
    </div>
  )
}
