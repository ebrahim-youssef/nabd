import Dexie, { type EntityTable } from 'dexie'

import type { AdhkarFlowProgress, QadaEvent, WirdEntry, WirdVersion } from '@nabd/shared'

export const db = new Dexie('nabd') as Dexie & {
  wirdVersions: EntityTable<WirdVersion, 'id'>
  wirdEntries: EntityTable<WirdEntry, 'id'>
  adhkarFlow: EntityTable<AdhkarFlowProgress, 'categoryId'>
  qadaEvents: EntityTable<QadaEvent, 'id'>
}

db.version(1).stores({
  wirdVersions: 'id, effectiveFrom, createdAt',
  // Fresh SPA state standardizes on the shared WirdEntry `at` field; no migration is needed.
  wirdEntries: 'id, day, versionId, [day+itemId], at',
  adhkarFlow: 'categoryId',
  qadaEvents: 'id, prayerId',
})
