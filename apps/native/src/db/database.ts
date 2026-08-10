import * as SQLite from 'expo-sqlite'

export const DATABASE_NAME = 'nabd-native.db'
export const CURRENT_SCHEMA_VERSION = 1

type VersionRow = { version: number }

export interface MigrationDatabase {
  execAsync(source: string): Promise<void>
  getFirstAsync(source: string): Promise<VersionRow | null>
  runAsync(source: string, ...parameters: SQLite.SQLiteBindValue[]): Promise<unknown>
  withTransactionAsync(task: () => Promise<void>): Promise<void>
}

export async function migrateDatabase(database: MigrationDatabase): Promise<number> {
  await database.execAsync(
    'CREATE TABLE IF NOT EXISTS schema_version (id INTEGER PRIMARY KEY CHECK (id = 1), version INTEGER NOT NULL)',
  )

  const current = await database.getFirstAsync('SELECT version FROM schema_version WHERE id = 1')
  const currentVersion = current?.version ?? 0

  if (currentVersion > CURRENT_SCHEMA_VERSION) {
    throw new Error('SQLite schema is newer than this app supports')
  }

  if (currentVersion < CURRENT_SCHEMA_VERSION) {
    await database.withTransactionAsync(async () => {
      // Version 1 intentionally establishes only the migration mechanism. Product tables follow.
      await database.runAsync(
        'INSERT INTO schema_version (id, version) VALUES (1, ?) ON CONFLICT(id) DO UPDATE SET version = excluded.version',
        CURRENT_SCHEMA_VERSION,
      )
    })
  }

  const migrated = await database.getFirstAsync('SELECT version FROM schema_version WHERE id = 1')
  if (!migrated) throw new Error('SQLite schema version round trip failed')
  return migrated.version
}

export async function openMigratedDatabase(): Promise<{
  database: SQLite.SQLiteDatabase
  version: number
}> {
  const database = await SQLite.openDatabaseAsync(DATABASE_NAME)
  const version = await migrateDatabase(database)
  return { database, version }
}
