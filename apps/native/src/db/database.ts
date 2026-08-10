import * as SQLite from 'expo-sqlite'

export const DATABASE_NAME = 'nabd-native.db'
export const SCHEMA_VERSION_MIGRATIONS = 1
export const SCHEMA_VERSION_ONBOARDING = 2
export const CURRENT_SCHEMA_VERSION = SCHEMA_VERSION_ONBOARDING

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

async function applyMigration(database: MigrationDatabase, version: number): Promise<void> {
  if (version === SCHEMA_VERSION_MIGRATIONS) return
  if (version === SCHEMA_VERSION_ONBOARDING) {
    await database.execAsync(CREATE_WIRD_VERSIONS_TABLE)
    await database.execAsync(CREATE_WIRD_VERSION_DATE_INDEX)
    await database.execAsync(CREATE_ONBOARDING_STATE_TABLE)
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
