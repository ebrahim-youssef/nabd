import { SQLiteProvider, useSQLiteContext } from 'expo-sqlite'
import { Tabs } from 'expo-router'
import { useColorScheme } from 'nativewind'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

import { DATABASE_NAME, migrateDatabase } from '../../src/db/database'
import {
  createPreferencesRepository,
  PREFERENCE_KEYS,
  readStoredTheme,
} from '../../src/preferences/db'
import { logger } from '../../src/observability/logger'
import { BottomNav } from '../../src/shell/BottomNav'
import { DatabaseError, DatabaseLoading } from '../../src/shell/DatabaseStatus'

function NativeAppearanceBootstrap() {
  const database = useSQLiteContext()
  const { setColorScheme } = useColorScheme()
  const preferences = useMemo(() => createPreferencesRepository(database), [database])

  useEffect(() => {
    let active = true
    void preferences.read(PREFERENCE_KEYS.theme).then((stored) => {
      if (active) setColorScheme(readStoredTheme(stored))
    })
    return () => {
      active = false
    }
  }, [preferences, setColorScheme])

  return null
}

function TabsContent() {
  return (
    <>
      <NativeAppearanceBootstrap />
      <Tabs screenOptions={{ headerShown: false }} tabBar={() => <BottomNav />} />
    </>
  )
}

export function ErrorBoundary({ error, retry }: { error: Error; retry: () => void }) {
  useEffect(() => {
    logger.error('Native database route failed', error)
  }, [error])

  return <DatabaseError onRetry={retry} />
}

type DatabaseStatus = 'loading' | 'ready' | 'error'

export default function TabsLayout() {
  const [status, setStatus] = useState<DatabaseStatus>('loading')
  const [attempt, setAttempt] = useState(0)
  const openErrorScheduled = useRef(false)

  const initializeDatabase = useCallback(
    async (database: Parameters<typeof migrateDatabase>[0]) => {
      try {
        await migrateDatabase(database)
        setStatus('ready')
      } catch (cause) {
        logger.error('Native database migration failed', cause)
        setStatus('error')
      }
    },
    [],
  )

  const handleOpenError = useCallback((cause: Error) => {
    if (openErrorScheduled.current) return
    openErrorScheduled.current = true
    queueMicrotask(() => {
      logger.error('Native database open failed', cause)
      setStatus('error')
    })
  }, [])

  const retry = useCallback(() => {
    openErrorScheduled.current = false
    setStatus('loading')
    setAttempt((current) => current + 1)
  }, [])

  if (status === 'error') return <DatabaseError onRetry={retry} />

  return (
    <>
      {status === 'loading' ? <DatabaseLoading /> : null}
      <SQLiteProvider
        key={attempt}
        databaseName={DATABASE_NAME}
        onError={handleOpenError}
        onInit={initializeDatabase}
      >
        {/* SQLiteProvider memoizes without comparing children; keep them independent of status. */}
        <TabsContent />
      </SQLiteProvider>
    </>
  )
}
