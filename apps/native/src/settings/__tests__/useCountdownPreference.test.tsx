import { act, renderHook, waitFor } from '@testing-library/react-native'
import { useSQLiteContext } from 'expo-sqlite'
import { DatabaseSync } from 'node:sqlite'

import { migrateDatabase, type MigrationDatabase } from '../../db/database'
import { logger } from '../../observability/logger'
import type { ProductDatabase, SqlValue } from '../../db/productDatabase'
import { createPreferencesRepository, PREFERENCE_KEYS } from '../../preferences/db'
import { useCountdownPreference } from '../useCountdownPreference'

jest.mock('expo-sqlite', () => ({ useSQLiteContext: jest.fn() }))

const mockedUseSQLiteContext = useSQLiteContext as jest.MockedFunction<typeof useSQLiteContext>

function createDatabase() {
  const connection = new DatabaseSync(':memory:')
  const database: ProductDatabase & MigrationDatabase = {
    async execAsync(source: string) {
      connection.exec(source)
    },
    async getFirstAsync<T>(source: string, ...parameters: SqlValue[]) {
      return (connection.prepare(source).get(...parameters) as T | undefined) ?? null
    },
    async getAllAsync<T>(source: string, ...parameters: SqlValue[]) {
      return connection.prepare(source).all(...parameters) as T[]
    },
    async runAsync(source: string, ...parameters: SqlValue[]) {
      return connection.prepare(source).run(...parameters)
    },
    async withExclusiveTransactionAsync(task) {
      connection.exec('BEGIN EXCLUSIVE')
      try {
        await task(database)
        connection.exec('COMMIT')
      } catch (cause) {
        connection.exec('ROLLBACK')
        throw cause
      }
    },
  }
  return { connection, database }
}

describe('useCountdownPreference', () => {
  it('defaults off, writes through the repository, and restores after remount', async () => {
    const { connection, database } = createDatabase()
    try {
      await migrateDatabase(database)
      mockedUseSQLiteContext.mockReturnValue(database as ReturnType<typeof useSQLiteContext>)

      const first = await renderHook(() => useCountdownPreference())
      await waitFor(() => expect(first.result.current.enabled).toBe(false))

      await act(async () => {
        await first.result.current.setEnabled(true)
      })
      await expect(
        createPreferencesRepository(database).read(PREFERENCE_KEYS.countdownEnabled),
      ).resolves.toBe('1')

      first.unmount()
      const second = await renderHook(() => useCountdownPreference())
      await waitFor(() => expect(second.result.current.enabled).toBe(true))
    } finally {
      connection.close()
    }
  })

  it('switches back when the preference write fails', async () => {
    const { connection, database } = createDatabase()
    try {
      await migrateDatabase(database)
      jest.spyOn(logger, 'error').mockImplementation(() => undefined)
      const failingDatabase = {
        ...database,
        runAsync: async () => Promise.reject(new Error('disk full')),
      }
      mockedUseSQLiteContext.mockReturnValue(
        failingDatabase as unknown as ReturnType<typeof useSQLiteContext>,
      )

      const hook = await renderHook(() => useCountdownPreference())
      await act(async () => {
        await hook.result.current.setEnabled(true)
      })

      expect(hook.result.current.enabled).toBe(false)
    } finally {
      connection.close()
    }
  })
})
