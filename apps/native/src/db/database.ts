import * as SQLite from 'expo-sqlite'

export const DATABASE_NAME = 'nabd-native.db'
export const SCHEMA_VERSION_MIGRATIONS = 1
export const SCHEMA_VERSION_ONBOARDING = 2
export const SCHEMA_VERSION_PRODUCT = 3
export const SCHEMA_VERSION_PREFERENCES = 4
export const CURRENT_SCHEMA_VERSION = SCHEMA_VERSION_PREFERENCES

type VersionRow = { version: number }

export interface MigrationDatabase {
  execAsync(source: string): Promise<void>
  getFirstAsync<T>(source: string): Promise<T | null>
  runAsync(source: string, ...parameters: SQLite.SQLiteBindValue[]): Promise<unknown>
  withExclusiveTransactionAsync(
    task: (transaction: MigrationDatabase) => Promise<void>,
  ): Promise<void>
}

const CREATE_SCHEMA_VERSION_TABLE =
  'CREATE TABLE IF NOT EXISTS schema_version (id INTEGER PRIMARY KEY CHECK (id = 1), version INTEGER NOT NULL)'
const CREATE_ONBOARDING_STATE_TABLE = `
  CREATE TABLE IF NOT EXISTS onboarding_state (
    id INTEGER PRIMARY KEY CHECK (id = 1),
    answers_json TEXT NOT NULL,
    selected_level_id TEXT NOT NULL,
    completed_at INTEGER NOT NULL,
    effective_from TEXT NOT NULL,
    wird_version_id TEXT NOT NULL REFERENCES wird_versions(id)
  )`
const CREATE_WIRD_VERSIONS_TABLE = `
  CREATE TABLE IF NOT EXISTS wird_versions (
    id TEXT PRIMARY KEY,
    level_id TEXT NOT NULL,
    effective_from TEXT NOT NULL,
    definition_json TEXT NOT NULL,
    created_at INTEGER NOT NULL
  )`
const CREATE_WIRD_VERSION_DATE_INDEX =
  'CREATE INDEX IF NOT EXISTS idx_wird_versions_effective ON wird_versions (effective_from, created_at)'
const CREATE_WIRD_ENTRIES_TABLE = `CREATE TABLE IF NOT EXISTS wird_entries (
  id TEXT PRIMARY KEY, day TEXT NOT NULL, version_id TEXT NOT NULL, item_id TEXT NOT NULL,
  done INTEGER NOT NULL, at INTEGER NOT NULL)`
const CREATE_QADA_EVENTS_TABLE = `CREATE TABLE IF NOT EXISTS qada_events (
  id TEXT PRIMARY KEY, prayer_id TEXT NOT NULL, delta INTEGER NOT NULL, at INTEGER NOT NULL)`
const CREATE_ADHKAR_FLOW_TABLE = `CREATE TABLE IF NOT EXISTS adhkar_flow_progress (
  category_id TEXT PRIMARY KEY, day TEXT NOT NULL, "index" INTEGER NOT NULL, count INTEGER NOT NULL,
  finished INTEGER NOT NULL)`
const CREATE_APP_PREFERENCES_TABLE =
  'CREATE TABLE IF NOT EXISTS app_preferences (key TEXT PRIMARY KEY, value TEXT NOT NULL, updated_at INTEGER NOT NULL)'

async function applyMigration(database: MigrationDatabase, version: number): Promise<void> {
  if (version === SCHEMA_VERSION_MIGRATIONS) return
  if (version === SCHEMA_VERSION_ONBOARDING) {
    await database.execAsync(CREATE_WIRD_VERSIONS_TABLE)
    await database.execAsync(CREATE_WIRD_VERSION_DATE_INDEX)
    await database.execAsync(CREATE_ONBOARDING_STATE_TABLE)
    return
  }
  if (version === SCHEMA_VERSION_PRODUCT) {
    await database.execAsync('ALTER TABLE wird_versions DROP COLUMN level_id')
    await database.execAsync(CREATE_WIRD_ENTRIES_TABLE)
    await database.execAsync(
      'CREATE INDEX IF NOT EXISTS idx_wird_entries_day ON wird_entries (day)',
    )
    await database.execAsync(
      'CREATE INDEX IF NOT EXISTS idx_wird_entries_day_item ON wird_entries (day, item_id)',
    )
    await database.execAsync('CREATE INDEX IF NOT EXISTS idx_wird_entries_at ON wird_entries (at)')
    await database.execAsync(CREATE_QADA_EVENTS_TABLE)
    await database.execAsync(
      'CREATE INDEX IF NOT EXISTS idx_qada_events_prayer ON qada_events (prayer_id)',
    )
    await database.execAsync(CREATE_ADHKAR_FLOW_TABLE)
    return
  }
  if (version === SCHEMA_VERSION_PREFERENCES) {
    await database.execAsync(CREATE_APP_PREFERENCES_TABLE)
    return
  }
  throw new Error(`SQLite migration ${version} is not defined`)
}

export async function migrateDatabase(database: MigrationDatabase): Promise<number> {
  await database.execAsync('PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON')
  await database.execAsync(CREATE_SCHEMA_VERSION_TABLE)

  let migratedVersion = 0
  await database.withExclusiveTransactionAsync(async (transaction) => {
    const current = await transaction.getFirstAsync<VersionRow>(
      'SELECT version FROM schema_version WHERE id = 1',
    )
    const currentVersion = current?.version ?? 0

    if (currentVersion > CURRENT_SCHEMA_VERSION) {
      throw new Error('SQLite schema is newer than this app supports')
    }

    if (currentVersion < CURRENT_SCHEMA_VERSION) {
      for (
        let nextVersion = currentVersion + 1;
        nextVersion <= CURRENT_SCHEMA_VERSION;
        nextVersion += 1
      ) {
        await applyMigration(transaction, nextVersion)
        await transaction.runAsync(
          'INSERT INTO schema_version (id, version) VALUES (1, ?) ON CONFLICT(id) DO UPDATE SET version = excluded.version',
          nextVersion,
        )
      }
    }

    const migrated = await transaction.getFirstAsync<VersionRow>(
      'SELECT version FROM schema_version WHERE id = 1',
    )
    if (!migrated) throw new Error('SQLite schema version round trip failed')
    migratedVersion = migrated.version
  })
  return migratedVersion
}

export async function openMigratedDatabase(): Promise<{
  database: SQLite.SQLiteDatabase
  version: number
}> {
  const database = await SQLite.openDatabaseAsync(DATABASE_NAME)
  const version = await migrateDatabase(database)
  return { database, version }
}
