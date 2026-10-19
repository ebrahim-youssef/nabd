import type { Result } from '../lib/result'
import { WIRD_LEVELS } from '../content/levels'
import { isDayId } from '../lib/day'
import { QADA_PRAYERS } from '../qada/logic'

import { CURRENT_SCHEMA_VERSION } from '../db/database'
import { parseAnswers } from '../onboarding/logic'
import { parseDefinition } from '../wird/logic'
import type { BackupEnvelope, BackupRows, BackupTable, RestorePlan } from './types'

export const BACKUP_FORMAT_VERSION = 1
export const BACKUP_MAX_BYTES = 64 * 1024 * 1024 // Guards memory against a hostile file; decades of daily use stay well under it.

const ONBOARDING_STATE_ID = 1
const SQLITE_TRUE = 1
const SQLITE_FALSE = 0
const MIN_NON_EMPTY_STRING_LENGTH = 1
const ISO_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z$/
const FORBIDDEN_KEYS = new Set(['__proto__', 'constructor'])

export const BACKUP_TABLES = [
  'onboarding_state',
  'wird_versions',
  'wird_entries',
  'qada_events',
  'adhkar_flow_progress',
  'app_preferences',
] as const satisfies readonly BackupTable[]

export function conflictTableFrom(error: string): BackupTable | undefined {
  const table = error.split(':')[1]
  return BACKUP_TABLES.includes(table as BackupTable) ? (table as BackupTable) : undefined
}

const PRIMARY_KEYS: Record<BackupTable, string> = {
  onboarding_state: 'id',
  wird_versions: 'id',
  wird_entries: 'id',
  qada_events: 'id',
  adhkar_flow_progress: 'category_id',
  app_preferences: 'key',
}

const COLUMNS: Record<BackupTable, readonly string[]> = {
  onboarding_state: [
    'id',
    'answers_json',
    'selected_level_id',
    'completed_at',
    'effective_from',
    'wird_version_id',
  ],
  wird_versions: ['id', 'effective_from', 'definition_json', 'created_at'],
  wird_entries: ['id', 'day', 'version_id', 'item_id', 'done', 'at'],
  qada_events: ['id', 'prayer_id', 'delta', 'at'],
  adhkar_flow_progress: ['category_id', 'day', 'index', 'count', 'finished'],
  app_preferences: ['key', 'value', 'updated_at'],
}

type RecordValue = Record<string, unknown>

function isRecord(value: unknown): value is RecordValue {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function hasForbiddenKey(value: RecordValue): boolean {
  return Object.keys(value).some((key) => FORBIDDEN_KEYS.has(key))
}

function hasExactKeys(value: RecordValue, expected: readonly string[]): boolean {
  const keys = Object.keys(value)
  return keys.length === expected.length && expected.every((key) => keys.includes(key))
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.length >= MIN_NON_EMPTY_STRING_LENGTH
}

function isInteger(value: unknown): value is number {
  return typeof value === 'number' && Number.isInteger(value)
}

function isSqliteFlag(value: unknown): value is number {
  return value === SQLITE_TRUE || value === SQLITE_FALSE
}

function isIsoDate(value: unknown): value is string {
  return typeof value === 'string' && ISO_DATE_PATTERN.test(value)
}

function isKnownPrayer(value: unknown): value is string {
  return typeof value === 'string' && QADA_PRAYERS.some((prayer) => prayer.id === value)
}

function isKnownLevel(value: unknown): value is string {
  return typeof value === 'string' && WIRD_LEVELS.some((level) => level.id === value)
}

function isValidRow(table: BackupTable, row: RecordValue): boolean {
  if (hasForbiddenKey(row) || !hasExactKeys(row, COLUMNS[table])) return false

  if (table === 'onboarding_state') {
    return (
      row.id === ONBOARDING_STATE_ID &&
      typeof row.answers_json === 'string' &&
      parseAnswers(row.answers_json) !== null &&
      isKnownLevel(row.selected_level_id) &&
      isInteger(row.completed_at) &&
      isDayId(row.effective_from as string) &&
      isNonEmptyString(row.wird_version_id)
    )
  }
  if (table === 'wird_versions') {
    return (
      isNonEmptyString(row.id) &&
      isDayId(row.effective_from as string) &&
      typeof row.definition_json === 'string' &&
      parseDefinition(row.definition_json) !== null &&
      isInteger(row.created_at)
    )
  }
  if (table === 'wird_entries') {
    return (
      isNonEmptyString(row.id) &&
      isDayId(row.day as string) &&
      isNonEmptyString(row.version_id) &&
      isNonEmptyString(row.item_id) &&
      isSqliteFlag(row.done) &&
      isInteger(row.at)
    )
  }
  if (table === 'qada_events') {
    return (
      isNonEmptyString(row.id) &&
      isKnownPrayer(row.prayer_id) &&
      isInteger(row.delta) &&
      isInteger(row.at)
    )
  }
  if (table === 'adhkar_flow_progress') {
    return (
      isNonEmptyString(row.category_id) &&
      isDayId(row.day as string) &&
      isInteger(row.index) &&
      (row.index as number) >= 0 &&
      isInteger(row.count) &&
      (row.count as number) >= 0 &&
      isSqliteFlag(row.finished)
    )
  }
  return isNonEmptyString(row.key) && isNonEmptyString(row.value) && isInteger(row.updated_at)
}

function byteLength(value: string): number {
  return new TextEncoder().encode(value).byteLength
}

function duplicateKey(rows: readonly RecordValue[], key: string): boolean {
  const keys = new Set<unknown>()
  for (const row of rows) {
    const value = row[key]
    if (keys.has(value)) return true
    keys.add(value)
  }
  return false
}

function validateRows(data: RecordValue): Result<BackupRows> {
  const rows = {} as BackupRows
  for (const table of BACKUP_TABLES) {
    const tableRows = data[table]
    if (!Array.isArray(tableRows)) return { ok: false, error: `missing_table:${table}` }
    if (tableRows.some((row) => !isRecord(row))) {
      return { ok: false, error: `invalid_row_shape:${table}` }
    }
    const records = tableRows as RecordValue[]
    if (records.some(hasForbiddenKey)) {
      return { ok: false, error: 'prototype_pollution_key' }
    }
    if (records.some((row) => !isValidRow(table, row))) {
      return { ok: false, error: `invalid_row:${table}` }
    }
    if (duplicateKey(records, PRIMARY_KEYS[table])) {
      return { ok: false, error: `duplicate_primary_key:${table}` }
    }
    const rowsByTable = rows as unknown as Record<string, unknown>
    rowsByTable[table] = records
  }

  const versionIds = new Set(rows.wird_versions.map((row) => row.id))
  if (
    rows.wird_entries.some((row) => !versionIds.has(row.version_id)) ||
    rows.onboarding_state.some((row) => !versionIds.has(row.wird_version_id))
  ) {
    return { ok: false, error: 'dangling_wird_version_reference' }
  }
  return { ok: true, value: rows }
}

export function serializeBackup(rows: BackupRows, exportedAtIso: string): string {
  const envelope: BackupEnvelope = {
    formatVersion: BACKUP_FORMAT_VERSION,
    schemaVersion: CURRENT_SCHEMA_VERSION,
    exportedAt: exportedAtIso,
    data: rows,
  }
  return JSON.stringify(envelope)
}

export function parseBackup(text: string): Result<BackupEnvelope> {
  if (byteLength(text) > BACKUP_MAX_BYTES) return { ok: false, error: 'oversized_text' }

  let parsed: unknown
  try {
    parsed = JSON.parse(text) as unknown
  } catch {
    return { ok: false, error: 'malformed_json' }
  }
  if (!isRecord(parsed)) return { ok: false, error: 'not_an_object' }
  if (hasForbiddenKey(parsed)) return { ok: false, error: 'prototype_pollution_key' }
  if (!hasExactKeys(parsed, ['formatVersion', 'schemaVersion', 'exportedAt', 'data'])) {
    return { ok: false, error: 'invalid_envelope_shape' }
  }
  if (parsed.formatVersion !== BACKUP_FORMAT_VERSION) {
    return { ok: false, error: 'unknown_format_version' }
  }
  if (parsed.schemaVersion !== CURRENT_SCHEMA_VERSION) {
    return {
      ok: false,
      error:
        typeof parsed.schemaVersion === 'number' && parsed.schemaVersion > CURRENT_SCHEMA_VERSION
          ? 'future_schema_version'
          : 'older_schema_version',
    }
  }
  if (!isIsoDate(parsed.exportedAt)) return { ok: false, error: 'invalid_exported_at' }
  if (!isRecord(parsed.data)) return { ok: false, error: 'invalid_data' }
  if (hasForbiddenKey(parsed.data)) return { ok: false, error: 'prototype_pollution_key' }

  const unknownTable = Object.keys(parsed.data).some(
    (key) => !BACKUP_TABLES.includes(key as BackupTable),
  )
  if (unknownTable) return { ok: false, error: 'unknown_table' }

  const validated = validateRows(parsed.data)
  if (!validated.ok) return validated
  return {
    ok: true,
    value: {
      formatVersion: BACKUP_FORMAT_VERSION,
      schemaVersion: CURRENT_SCHEMA_VERSION,
      exportedAt: parsed.exportedAt,
      data: validated.value,
    },
  }
}

function rowsMatch(table: BackupTable, first: RecordValue, second: RecordValue): boolean {
  return COLUMNS[table].every((column) => first[column] === second[column])
}

function appendOnlyInserts<T extends Record<string, unknown>>(
  table: BackupTable,
  backupRows: readonly T[],
  deviceRows: readonly T[],
): Result<T[]> {
  const key = PRIMARY_KEYS[table]
  const deviceByKey = new Map<unknown, T>()
  for (const row of deviceRows) deviceByKey.set(row[key], row)

  const inserts: T[] = []
  for (const row of backupRows) {
    const deviceRow = deviceByKey.get(row[key])
    if (!deviceRow) {
      inserts.push(row)
      continue
    }
    if (!rowsMatch(table, row, deviceRow)) {
      return { ok: false, error: `restore_conflict:${table}:${String(row[key])}` }
    }
  }
  return { ok: true, value: inserts }
}

function mutableInserts<T extends Record<string, unknown>>(
  table: BackupTable,
  backupRows: readonly T[],
  deviceRows: readonly T[],
): T[] {
  const key = PRIMARY_KEYS[table]
  const deviceKeys = new Set(deviceRows.map((row) => row[key]))
  return backupRows.filter((row) => !deviceKeys.has(row[key]))
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

export function planRestore(backup: BackupEnvelope, deviceRows: BackupRows): Result<RestorePlan> {
  const inserts = emptyRows()
  const appendOnlyTables: readonly BackupTable[] = ['wird_versions', 'wird_entries', 'qada_events']
  for (const table of appendOnlyTables) {
    const planned = appendOnlyInserts(
      table,
      backup.data[table] as readonly Record<string, unknown>[],
      deviceRows[table] as readonly Record<string, unknown>[],
    )
    if (!planned.ok) return planned
    const insertsByTable = inserts as unknown as Record<string, unknown>
    insertsByTable[table] = planned.value
  }

  inserts.onboarding_state =
    deviceRows.onboarding_state.length === 0 ? [...backup.data.onboarding_state] : []
  inserts.adhkar_flow_progress = mutableInserts(
    'adhkar_flow_progress',
    backup.data.adhkar_flow_progress,
    deviceRows.adhkar_flow_progress,
  )
  inserts.app_preferences = mutableInserts(
    'app_preferences',
    backup.data.app_preferences,
    deviceRows.app_preferences,
  )

  const counts = BACKUP_TABLES.reduce(
    (result, table) => {
      result[table] = inserts[table].length
      return result
    },
    {} as RestorePlan['counts'],
  )
  return { ok: true, value: { inserts, counts } }
}

export type {
  AdhkarFlowProgressRow,
  AppPreferenceRow,
  BackupEnvelope,
  BackupRows,
  BackupTable,
  OnboardingStateRow,
  QadaEventRow,
  RestorePlan,
  WirdEntryRow,
  WirdVersionRow,
} from './types'
