import Dexie, { type EntityTable } from 'dexie'

import type { WirdEntry, WirdVersion } from '@/types/wird'

// The one IndexedDB handle for the app (ADR-0002: Dexie is the only IndexedDB access, and the
// offline source of truth). Feature `db.ts` modules read and write through this; nothing else
// touches IndexedDB directly.

// Which synced table an outbox change targets. Both are immutable/append-only, so a push is an
// idempotent upsert by primary key.
export type SyncTable = 'wirdVersions' | 'wirdEntries'

// A pending local change waiting to be pushed to Supabase. Ordered by `seq` so pushes replay in
// the order they were made. Removed once the push succeeds.
export type OutboxRow = {
  seq?: number
  table: SyncTable
  rowId: string
  payload: WirdVersion | WirdEntry
  createdAt: number
}

// Small key/value store for sync bookkeeping — currently the pull cursor per table.
export type SyncMetaRow = {
  key: string
  value: string
}

export const db = new Dexie('nabd') as Dexie & {
  wirdVersions: EntityTable<WirdVersion, 'id'>
  wirdEntries: EntityTable<WirdEntry, 'id'>
  outbox: EntityTable<OutboxRow, 'seq'>
  syncMeta: EntityTable<SyncMetaRow, 'key'>
}

db.version(1).stores({
  // Only fields used in queries are indexed. `definition` (versions) is a blob, not indexed.
  wirdVersions: 'id, effectiveFrom, createdAt',
  wirdEntries: 'id, day, versionId, [day+itemId], checkedAt',
  outbox: '++seq, createdAt',
  syncMeta: 'key',
})
