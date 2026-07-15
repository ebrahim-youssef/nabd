import type { SupabaseClient } from '@supabase/supabase-js'

import { db, type OutboxRow, type SyncTable } from '@/lib/db/db'
import { createClient } from '@/lib/db/supabase/client'
import { logger } from '@/lib/logger'
import type { Result } from '@/types/result'
import type { WirdDefinition, WirdEntry, WirdVersion } from '@/types/wird'

import { EPOCH_CURSOR, PULL_CURSOR_KEY, REMOTE_TABLE } from './constants'

// Sync engine: pushes queued local changes (the Dexie outbox) up to Supabase, then pulls rows
// changed since the last cursor back down into Dexie. Rows are immutable/append-only, so every
// operation is an idempotent upsert — no deletes, no merge conflicts. Push/pull take the
// Supabase client as a parameter so they can be tested with a fake; `syncNow` wires the real
// session-bound client.

type RemoteRow = Record<string, unknown>

function versionToRow(version: WirdVersion, userId: string): RemoteRow {
  return {
    id: version.id,
    user_id: userId,
    effective_from: version.effectiveFrom,
    definition: version.definition,
    created_at: version.createdAt,
  }
}

function entryToRow(entry: WirdEntry, userId: string): RemoteRow {
  return {
    id: entry.id,
    user_id: userId,
    day: entry.day,
    version_id: entry.versionId,
    item_id: entry.itemId,
    done: entry.done,
    at: entry.at,
  }
}

function rowToVersion(row: RemoteRow): WirdVersion {
  return {
    id: row.id as string,
    effectiveFrom: row.effective_from as string,
    definition: row.definition as WirdDefinition,
    createdAt: Number(row.created_at),
  }
}

function rowToEntry(row: RemoteRow): WirdEntry {
  return {
    id: row.id as string,
    day: row.day as string,
    versionId: row.version_id as string,
    itemId: row.item_id as string,
    done: row.done as boolean,
    at: Number(row.at),
  }
}

// Pushes every queued outbox change to Supabase, then clears the queue. Groups by table so each
// table is one upsert. Returns the number of changes pushed.
export async function pushOutbox(supabase: SupabaseClient, userId: string): Promise<number> {
  const pending = await db.outbox.orderBy('seq').toArray()
  if (pending.length === 0) return 0

  const byTable = new Map<SyncTable, OutboxRow[]>()
  for (const row of pending) {
    const list = byTable.get(row.table)
    if (list) list.push(row)
    else byTable.set(row.table, [row])
  }

  for (const [table, rows] of byTable) {
    const payload = rows.map((row) =>
      table === 'wirdVersions'
        ? versionToRow(row.payload as WirdVersion, userId)
        : entryToRow(row.payload as WirdEntry, userId),
    )
    const { error } = await supabase.from(REMOTE_TABLE[table]).upsert(payload, { onConflict: 'id' })
    if (error) throw new Error(`push ${REMOTE_TABLE[table]}: ${error.message}`)
  }

  const seqs = pending.map((row) => row.seq).filter((seq): seq is number => seq !== undefined)
  await db.outbox.bulkDelete(seqs)
  return pending.length
}

// Pulls rows for one table changed since its stored cursor into Dexie, then advances the cursor.
// Returns the number of rows pulled.
export async function pullTable(
  supabase: SupabaseClient,
  table: SyncTable,
  userId: string,
): Promise<number> {
  const cursorRow = await db.syncMeta.get(PULL_CURSOR_KEY[table])
  const cursor = cursorRow?.value ?? EPOCH_CURSOR

  const { data, error } = await supabase
    .from(REMOTE_TABLE[table])
    .select('*')
    .eq('user_id', userId)
    .gt('updated_at', cursor)
    .order('updated_at', { ascending: true })
  if (error) throw new Error(`pull ${REMOTE_TABLE[table]}: ${error.message}`)

  const rows = (data ?? []) as RemoteRow[]
  if (rows.length === 0) return 0

  if (table === 'wirdVersions') {
    await db.wirdVersions.bulkPut(rows.map(rowToVersion))
  } else {
    await db.wirdEntries.bulkPut(rows.map(rowToEntry))
  }

  const lastUpdatedAt = rows[rows.length - 1].updated_at as string
  await db.syncMeta.put({ key: PULL_CURSOR_KEY[table], value: lastUpdatedAt })
  return rows.length
}

// Full sync for the current user: push local changes, then pull remote ones. No-op with an
// error result when signed out (there is no user to scope rows to).
export async function syncNow(): Promise<Result<{ pushed: number; pulled: number }>> {
  try {
    const supabase = createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return { ok: false, error: 'not_authenticated' }

    const pushed = await pushOutbox(supabase, user.id)
    const pulled =
      (await pullTable(supabase, 'wirdVersions', user.id)) +
      (await pullTable(supabase, 'wirdEntries', user.id))
    return { ok: true, value: { pushed, pulled } }
  } catch (cause) {
    logger.error('sync.syncNow failed', cause)
    return { ok: false, error: 'sync_failed' }
  }
}
