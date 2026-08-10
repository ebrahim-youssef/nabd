import { CURRENT_SCHEMA_VERSION, migrateDatabase, type MigrationDatabase } from '../database'

describe('migrateDatabase', () => {
  it('writes and reads the schema version through the migration table', async () => {
    let version: number | undefined
    const database: MigrationDatabase = {
      execAsync: jest.fn(async () => undefined),
      getFirstAsync: jest.fn(async () => (version === undefined ? null : { version })),
      runAsync: jest.fn(async (_sql: string, nextVersion: number) => {
        version = nextVersion
        return { changes: 1, lastInsertRowId: 1 }
      }),
      withTransactionAsync: jest.fn(async (task: () => Promise<void>) => task()),
    }

    await expect(migrateDatabase(database)).resolves.toBe(CURRENT_SCHEMA_VERSION)
    expect(database.execAsync).toHaveBeenCalledWith(expect.stringContaining('schema_version'))
    expect(database.runAsync).toHaveBeenCalledWith(
      expect.stringContaining('INSERT INTO schema_version'),
      CURRENT_SCHEMA_VERSION,
    )
    expect(database.getFirstAsync).toHaveBeenCalledTimes(2)
  })
})
