import { CURRENT_SCHEMA_VERSION, migrateDatabase, type MigrationDatabase } from '../database'

function createMigrationDatabase(initialVersion?: number) {
  let version = initialVersion
  let transactionQueue = Promise.resolve()
  const database: MigrationDatabase = {
    execAsync: jest.fn(async () => undefined),
    getFirstAsync: async <T>() => (version === undefined ? null : { version }) as T | null,
    runAsync: jest.fn(async (_sql: string, nextVersion: number) => {
      version = nextVersion
      return { changes: 1, lastInsertRowId: 1 }
    }),
    withExclusiveTransactionAsync: jest.fn(async (task) => {
      const previous = transactionQueue
      let release: () => void = () => undefined
      transactionQueue = new Promise<void>((resolve) => {
        release = resolve
      })
      await previous
      try {
        await task(database)
      } finally {
        release()
      }
    }),
  }
  return { database, version: () => version }
}

describe('migrateDatabase', () => {
  it('creates the complete fresh schema with WAL, foreign keys, and immutable version history', async () => {
    const fake = createMigrationDatabase()

    await expect(migrateDatabase(fake.database)).resolves.toBe(CURRENT_SCHEMA_VERSION)

    const executed = (fake.database.execAsync as jest.Mock).mock.calls
      .map(([source]) => String(source))
      .join('\n')
    expect(executed).toContain('PRAGMA journal_mode = WAL')
    expect(executed).toContain('PRAGMA foreign_keys = ON')
    expect(executed).toContain('CREATE TABLE IF NOT EXISTS onboarding_state')
    expect(executed).toContain('wird_version_id TEXT NOT NULL REFERENCES wird_versions(id)')
    expect(executed).toContain('CREATE TABLE IF NOT EXISTS wird_versions')
    expect(executed).toContain('idx_wird_versions_effective')
    expect(executed).not.toContain('is_active')
    expect(fake.version()).toBe(CURRENT_SCHEMA_VERSION)
  })

  it('upgrades version one once and remains idempotent', async () => {
    const fake = createMigrationDatabase(1)

    await expect(migrateDatabase(fake.database)).resolves.toBe(CURRENT_SCHEMA_VERSION)
    const callsAfterUpgrade = (fake.database.execAsync as jest.Mock).mock.calls.length
    await expect(migrateDatabase(fake.database)).resolves.toBe(CURRENT_SCHEMA_VERSION)

    const migrationCalls = (fake.database.execAsync as jest.Mock).mock.calls
      .slice(0, callsAfterUpgrade)
      .map(([source]) => String(source))
      .filter((source) => source.includes('onboarding_state'))
    expect(migrationCalls).toHaveLength(1)
    expect(fake.database.runAsync).toHaveBeenCalledWith(
      expect.stringContaining('INSERT INTO schema_version'),
      CURRENT_SCHEMA_VERSION,
    )
  })

  it('serializes concurrent initialization and applies product migration once', async () => {
    const fake = createMigrationDatabase(1)

    await Promise.all([migrateDatabase(fake.database), migrateDatabase(fake.database)])

    const onboardingCreates = (fake.database.execAsync as jest.Mock).mock.calls.filter(([source]) =>
      String(source).includes('CREATE TABLE IF NOT EXISTS onboarding_state'),
    )
    expect(onboardingCreates).toHaveLength(1)
  })

  it('rejects a schema created by a newer app inside the exclusive transaction', async () => {
    const fake = createMigrationDatabase(CURRENT_SCHEMA_VERSION + 1)

    await expect(migrateDatabase(fake.database)).rejects.toThrow('newer')
    expect(fake.database.withExclusiveTransactionAsync).toHaveBeenCalledTimes(1)
  })
})
