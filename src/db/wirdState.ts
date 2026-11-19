import { versionInForce } from '../lib/wird'
import type { DayId, WirdDefinition, WirdEntry, WirdVersion } from '../wird/types'
import type { SetItemStateInput, SetItemStateOutcome } from './contracts'
import { SQLITE_ID, type ProductDatabase } from './productDatabase'
import { requestWidgetSnapshotWrite } from '../device/widgetSnapshotWriter'

export type VersionRow = {
  id: string
  effective_from: string
  definition_json: string
  created_at: number
}

export type EntryRow = {
  id: string
  day: string
  version_id: string
  item_id: string
  done: number
  at: number
}

export async function readVersionInForce(
  transaction: ProductDatabase,
  day: DayId,
): Promise<WirdVersion | null> {
  const versions = (
    await transaction.getAllAsync<VersionRow>(
      'SELECT id, effective_from, definition_json, created_at FROM wird_versions',
    )
  ).map(asVersion)
  return versionInForce(versions, day)
}

export function asVersion(row: VersionRow): WirdVersion {
  return {
    id: row.id,
    effectiveFrom: row.effective_from,
    definition: JSON.parse(row.definition_json) as WirdDefinition,
    createdAt: row.created_at,
  }
}

export function asEntry(row: EntryRow): WirdEntry {
  return {
    id: row.id,
    day: row.day as DayId,
    versionId: row.version_id,
    itemId: row.item_id,
    done: row.done === 1,
    at: row.at,
  }
}

export async function setItemStateInTransaction(
  transaction: ProductDatabase,
  input: SetItemStateInput,
  knownVersion?: WirdVersion | null,
): Promise<{ outcome: SetItemStateOutcome; entry: WirdEntry | null }> {
  if (input.actionId !== undefined) {
    const existingAction = await transaction.getFirstAsync<{ action_id: string }>(
      'SELECT action_id FROM wird_actions WHERE action_id = ?',
      input.actionId,
    )
    if (existingAction) return { outcome: 'duplicate', entry: null }
  }

  const version =
    knownVersion === undefined ? await readVersionInForce(transaction, input.day) : knownVersion
  const isCurrentItem =
    !!version &&
    version.id === input.versionId &&
    version.definition.items.some((item) => item.id === input.itemId)
  const latest =
    isCurrentItem || input.actionId !== undefined
      ? await transaction.getFirstAsync<{ done: number; at: number }>(
          'SELECT done, at FROM wird_entries WHERE day = ? AND item_id = ? ORDER BY at DESC, rowid DESC LIMIT 1',
          input.day,
          input.itemId,
        )
      : null
  const at = input.actionId !== undefined && latest ? Math.max(input.at, latest.at + 1) : input.at
  const outcome: SetItemStateOutcome = !isCurrentItem
    ? 'stale'
    : latest && (latest.done === 1) === input.done
      ? 'unchanged'
      : 'applied'
  const row =
    outcome === 'applied'
      ? await transaction.getFirstAsync<EntryRow>(
          `INSERT INTO wird_entries (id, day, version_id, item_id, done, at) VALUES (${SQLITE_ID}, ?, ?, ?, ?, ?) RETURNING id, day, version_id, item_id, done, at`,
          input.day,
          input.versionId,
          input.itemId,
          input.done ? 1 : 0,
          at,
        )
      : null
  if (outcome === 'applied' && !row) throw new Error('wird state insert returned no row')
  const entry = row ? asEntry(row) : null

  if (input.actionId !== undefined) {
    await transaction.runAsync(
      'INSERT INTO wird_actions (action_id, item_id, day, version_id, done, outcome, at) VALUES (?, ?, ?, ?, ?, ?, ?)',
      input.actionId,
      input.itemId,
      input.day,
      input.versionId,
      input.done ? 1 : 0,
      outcome,
      at,
    )
  }
  return { outcome, entry }
}

export async function runWirdStateTransaction<T>(
  database: ProductDatabase,
  task: (transaction: ProductDatabase) => Promise<T>,
): Promise<T> {
  let result: T | undefined
  await database.withExclusiveTransactionAsync(async (transaction) => {
    result = await task(transaction)
  })
  if (result === undefined) throw new Error('wird state transaction returned no result')
  void requestWidgetSnapshotWrite()
  return result
}
