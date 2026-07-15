import 'fake-indexeddb/auto'

import type { SupabaseClient } from '@supabase/supabase-js'
import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/lib/logger', () => ({
  logger: { debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}))

// Stub the browser client so importing db.ts doesn't pull in env.ts (no .env.local under
// vitest). pushOutbox/pullTable receive the Supabase client as a parameter, so this is unused.
vi.mock('@/lib/db/supabase/client', () => ({ createClient: vi.fn() }))

import { db } from '@/lib/db/db'
import type { WirdEntry, WirdVersion } from '@/types/wird'

import { pullTable, pushOutbox } from '../db'

const version: WirdVersion = {
  id: 'v1',
  effectiveFrom: '2026-07-14',
  definition: { areas: [], items: [] },
  createdAt: 1000,
}
const entry: WirdEntry = {
  id: 'e1',
  day: '2026-07-14',
  versionId: 'v1',
  itemId: 'fajr',
  done: true,
  at: 1200,
}

// Minimal Supabase test double. `upserts` records push calls; `pullData` feeds the select chain
// per remote table.
function makeSupabase(pullData: Record<string, Array<Record<string, unknown>>> = {}) {
  const upserts: Array<{ table: string; rows: Array<Record<string, unknown>> }> = []
  const client = {
    from(table: string) {
      return {
        upsert(rows: Array<Record<string, unknown>>) {
          upserts.push({ table, rows })
          return Promise.resolve({ error: null })
        },
        select() {
          return {
            eq() {
              return {
                gt() {
                  return {
                    order() {
                      return Promise.resolve({ data: pullData[table] ?? [], error: null })
                    },
                  }
                },
              }
            },
          }
        },
      }
    },
  } as unknown as SupabaseClient
  return { client, upserts }
}

beforeEach(async () => {
  await Promise.all([
    db.wirdVersions.clear(),
    db.wirdEntries.clear(),
    db.outbox.clear(),
    db.syncMeta.clear(),
  ])
})

describe('pushOutbox', () => {
  it('upserts queued rows with the user id and clears the outbox', async () => {
    await db.outbox.add({
      table: 'wirdVersions',
      rowId: version.id,
      payload: version,
      createdAt: 1000,
    })
    await db.outbox.add({ table: 'wirdEntries', rowId: entry.id, payload: entry, createdAt: 1200 })

    const { client, upserts } = makeSupabase()
    const pushed = await pushOutbox(client, 'user-1')

    expect(pushed).toBe(2)
    expect(await db.outbox.count()).toBe(0)

    const versionUpsert = upserts.find((u) => u.table === 'wird_versions')
    expect(versionUpsert?.rows[0]).toMatchObject({
      id: 'v1',
      user_id: 'user-1',
      effective_from: '2026-07-14',
      created_at: 1000,
    })
    const entryUpsert = upserts.find((u) => u.table === 'wird_entries')
    expect(entryUpsert?.rows[0]).toMatchObject({
      id: 'e1',
      user_id: 'user-1',
      version_id: 'v1',
      item_id: 'fajr',
      done: true,
      at: 1200,
    })
  })

  it('does nothing when the outbox is empty', async () => {
    const { client, upserts } = makeSupabase()
    expect(await pushOutbox(client, 'user-1')).toBe(0)
    expect(upserts).toHaveLength(0)
  })
})

describe('pullTable', () => {
  it('writes pulled rows into Dexie and advances the cursor', async () => {
    const { client } = makeSupabase({
      wird_versions: [
        {
          id: 'remote-v',
          user_id: 'user-1',
          effective_from: '2026-06-01',
          definition: { areas: [], items: [] },
          created_at: 900,
          updated_at: '2026-07-01T00:00:00Z',
        },
      ],
    })

    const pulled = await pullTable(client, 'wirdVersions', 'user-1')

    expect(pulled).toBe(1)
    expect((await db.wirdVersions.get('remote-v'))?.effectiveFrom).toBe('2026-06-01')
    expect((await db.syncMeta.get('pull_cursor:wird_versions'))?.value).toBe('2026-07-01T00:00:00Z')
  })

  it('returns 0 and leaves the cursor untouched when nothing changed', async () => {
    const { client } = makeSupabase()
    expect(await pullTable(client, 'wirdEntries', 'user-1')).toBe(0)
    expect(await db.syncMeta.get('pull_cursor:wird_entries')).toBeUndefined()
  })
})
