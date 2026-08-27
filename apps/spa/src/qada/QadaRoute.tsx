import { QADA_COPY } from '@nabd/shared'

import { PageHeader } from '../app/PageHeader'
import { QadaLedger } from './QadaLedger'

export function QadaRoute() {
  return (
    <div className="flex flex-col gap-6">
      <PageHeader title={QADA_COPY.pageTitle} backHref="/app/stats" />
      <QadaLedger />
    </div>
  )
}
