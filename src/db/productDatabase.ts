export type SqlValue = string | number | null

// Structural on purpose: repositories run against Expo SQLite in the app and node:sqlite in tests.
export type ProductDatabase = {
  execAsync(source: string): Promise<void>
  getFirstAsync<T>(source: string, ...parameters: SqlValue[]): Promise<T | null>
  getAllAsync<T>(source: string, ...parameters: SqlValue[]): Promise<T[]>
  runAsync(source: string, ...parameters: SqlValue[]): Promise<unknown>
  withExclusiveTransactionAsync(
    task: (transaction: ProductDatabase) => Promise<void>,
  ): Promise<void>
}

export const SQLITE_ID = 'lower(hex(randomblob(16)))'
