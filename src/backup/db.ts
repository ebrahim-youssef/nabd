import { logger } from '../observability/logger'
import type { ProductDatabase } from '../db/productDatabase'
import { conflictTableFrom, planRestore } from './logic'
import type {
  AdhkarFlowProgressRow,
  AppPreferenceRow,
  BackupEnvelope,
  BackupRows,
  BackupTable,
  OnboardingStateRow,
  QadaEventRow,
  RestoreCounts,
  WirdEntryRow,
  WirdVersionRow,
} from './types'

const SELECT_ONBOARDING_STATE =
  'SELECT id, answers_json, selected_level_id, completed_at, effective_from, wird_version_id FROM onboarding_state'
const SELECT_WIRD_VERSIONS =
  'SELECT id, effective_from, definition_json, created_at FROM wird_versions'
const SELECT_WIRD_ENTRIES = 'SELECT id, day, version_id, item_id, done, at FROM wird_entries'
const SELECT_QADA_EVENTS = 'SELECT id, prayer_id, delta, at FROM qada_events'
const SELECT_ADHKAR_FLOW_PROGRESS =
  'SELECT category_id, day, "index", count, finished FROM adhkar_flow_progress'
const SELECT_APP_PREFERENCES = 'SELECT key, value, updated_at FROM app_preferences'

const INSERT_WIRD_VERSION =
  'INSERT INTO wird_versions (id, effective_from, definition_json, created_at) VALUES (?, ?, ?, ?)'
const INSERT_WIRD_ENTRY =
  'INSERT INTO wird_entries (id, day, version_id, item_id, done, at) VALUES (?, ?, ?, ?, ?, ?)'
const INSERT_ONBOARDING_STATE =
  'INSERT INTO onboarding_state (id, answers_json, selected_level_id, completed_at, effective_from, wird_version_id) VALUES (?, ?, ?, ?, ?, ?)'
const INSERT_QADA_EVENT = 'INSERT INTO qada_events (id, prayer_id, delta, at) VALUES (?, ?, ?, ?)'
const INSERT_ADHKAR_FLOW_PROGRESS =
  'INSERT INTO adhkar_flow_progress (category_id, day, "index", count, finished) VALUES (?, ?, ?, ?, ?)'
const INSERT_APP_PREFERENCE =
  'INSERT INTO app_preferences (key, value, updated_at) VALUES (?, ?, ?)'

export type RestoreFailure = { reason: 'conflict'; table: BackupTable } | { reason: 'write_failed' }

export type BackupRestoreResult =
  { ok: true; value: RestoreCounts } | { ok: false; error: RestoreFailure }

class RestoreConflictError extends Error {
  readonly table: BackupTable

  constructor(table: BackupTable) {
    super(`Backup restore conflicts with an existing ${table} row`)
    this.name = 'RestoreConflictError'
    this.table = table
  }
}

function emptyRows(): BackupRows {
  return {
    onboarding_state: [],
    wird_versions: [],
    wird_entries: [],
    qada_events: [],
    adhkar_flow_progress: [],
    app_preferences: [],
  }
}

async function readSnapshotRows(database: ProductDatabase): Promise<BackupRows> {
  const rows = emptyRows()
  rows.onboarding_state = await database.getAllAsync<OnboardingStateRow>(SELECT_ONBOARDING_STATE)
  rows.wird_versions = await database.getAllAsync<WirdVersionRow>(SELECT_WIRD_VERSIONS)
  rows.wird_entries = await database.getAllAsync<WirdEntryRow>(SELECT_WIRD_ENTRIES)
  rows.qada_events = await database.getAllAsync<QadaEventRow>(SELECT_QADA_EVENTS)
  rows.adhkar_flow_progress = await database.getAllAsync<AdhkarFlowProgressRow>(
    SELECT_ADHKAR_FLOW_PROGRESS,
  )
  rows.app_preferences = await database.getAllAsync<AppPreferenceRow>(SELECT_APP_PREFERENCES)
  return rows
}

async function insertWirdVersions(database: ProductDatabase, rows: readonly WirdVersionRow[]) {
  for (const row of rows) {
    await database.runAsync(
      INSERT_WIRD_VERSION,
      row.id,
      row.effective_from,
      row.definition_json,
      row.created_at,
    )
  }
}

async function insertWirdEntries(database: ProductDatabase, rows: readonly WirdEntryRow[]) {
  for (const row of rows) {
    await database.runAsync(
      INSERT_WIRD_ENTRY,
      row.id,
      row.day,
      row.version_id,
      row.item_id,
      row.done,
      row.at,
    )
  }
}

async function insertOnboardingState(
  database: ProductDatabase,
  rows: readonly OnboardingStateRow[],
) {
  for (const row of rows) {
    await database.runAsync(
      INSERT_ONBOARDING_STATE,
      row.id,
      row.answers_json,
      row.selected_level_id,
      row.completed_at,
      row.effective_from,
      row.wird_version_id,
    )
  }
}

async function insertQadaEvents(database: ProductDatabase, rows: readonly QadaEventRow[]) {
  for (const row of rows) {
    await database.runAsync(INSERT_QADA_EVENT, row.id, row.prayer_id, row.delta, row.at)
  }
}

async function insertAdhkarFlowProgress(
  database: ProductDatabase,
  rows: readonly AdhkarFlowProgressRow[],
) {
  for (const row of rows) {
    await database.runAsync(
      INSERT_ADHKAR_FLOW_PROGRESS,
      row.category_id,
      row.day,
      row.index,
      row.count,
      row.finished,
    )
  }
}

async function insertAppPreferences(database: ProductDatabase, rows: readonly AppPreferenceRow[]) {
  for (const row of rows) {
    await database.runAsync(INSERT_APP_PREFERENCE, row.key, row.value, row.updated_at)
  }
}

async function insertPlannedRows(database: ProductDatabase, rows: BackupRows): Promise<void> {
  await insertWirdVersions(database, rows.wird_versions)
  await insertWirdEntries(database, rows.wird_entries)
  await insertOnboardingState(database, rows.onboarding_state)
  await insertQadaEvents(database, rows.qada_events)
  await insertAdhkarFlowProgress(database, rows.adhkar_flow_progress)
  await insertAppPreferences(database, rows.app_preferences)
}

export function createBackupRepository(database: ProductDatabase) {
  return {
    async readSnapshot(): Promise<BackupRows> {
      let snapshot: BackupRows | undefined
      await database.withExclusiveTransactionAsync(async (transaction) => {
        snapshot = await readSnapshotRows(transaction)
      })
      if (!snapshot) throw new Error('Backup snapshot transaction returned no rows')
      return snapshot
    },

    async restore(backup: BackupEnvelope): Promise<BackupRestoreResult> {
      let restoreCounts: RestoreCounts | undefined
      try {
        await database.withExclusiveTransactionAsync(async (transaction) => {
          const deviceRows = await readSnapshotRows(transaction)
          const planned = planRestore(backup, deviceRows)
          if (!planned.ok) {
            const table = conflictTableFrom(planned.error)
            if (table) throw new RestoreConflictError(table)
            throw new Error(`Backup restore planning failed: ${planned.error}`)
          }
          await insertPlannedRows(transaction, planned.value.inserts)
          restoreCounts = planned.value.counts
        })
        if (!restoreCounts) throw new Error('Backup restore transaction returned no counts')
        return { ok: true, value: restoreCounts }
      } catch (cause: unknown) {
        if (cause instanceof RestoreConflictError) {
          logger.error('Native backup restore conflict', cause, { table: cause.table })
          return { ok: false, error: { reason: 'conflict', table: cause.table } }
        }
        logger.error('Native backup restore write failed', cause)
        return { ok: false, error: { reason: 'write_failed' } }
      }
    },
  }
}
