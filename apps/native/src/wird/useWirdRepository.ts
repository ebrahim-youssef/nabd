import { useSQLiteContext } from 'expo-sqlite'
import { useMemo } from 'react'

import { createWirdRepository } from './db'

export function useWirdRepository() {
  const database = useSQLiteContext()
  return useMemo(() => createWirdRepository(database), [database])
}
