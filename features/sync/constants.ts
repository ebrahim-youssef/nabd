import type { SyncTable } from '@/lib/db/db'

// Supabase table names, and the syncMeta keys that hold each table's pull cursor. Keeping the
// local Dexie table name → remote table name mapping in one place avoids scattered string
// literals.
export const REMOTE_TABLE: Record<SyncTable, string> = {
  wirdVersions: 'wird_versions',
  wirdEntries: 'wird_entries',
}

export const PULL_CURSOR_KEY: Record<SyncTable, string> = {
  wirdVersions: 'pull_cursor:wird_versions',
  wirdEntries: 'pull_cursor:wird_entries',
}

// Cursor value before any pull has happened — everything is "newer" than this.
export const EPOCH_CURSOR = '1970-01-01T00:00:00Z'
