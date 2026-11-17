import { useSQLiteContext } from 'expo-sqlite'
import { useMemo } from 'react'

import { createWirdRepository } from './db'
import type { NativeWirdRepository } from './db'

export function useWirdRepository(): NativeWirdRepository {
  const database = useSQLiteContext()
  return useMemo(() => createWirdRepository(database), [database])
}
