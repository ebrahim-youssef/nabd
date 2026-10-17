import { useSQLiteContext } from 'expo-sqlite'
import { useMemo } from 'react'
import type { WirdRepository } from '@nabd/shared'

import { createWirdRepository } from './db'

export function useWirdRepository(): WirdRepository {
  const database = useSQLiteContext()
  return useMemo(() => createWirdRepository(database), [database])
}
